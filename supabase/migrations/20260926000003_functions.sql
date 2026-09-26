-- Completed working sets of finished workouts, with derived metrics
create view public.completed_sets with (security_invoker = true) as
select s.id as set_id, s.user_id, we.exercise_id, w.id as workout_id, w.started_at,
       s.weight_kg, s.reps, s.duration_seconds, s.distance_m,
       public.epley_1rm(s.weight_kg, s.reps)          as e1rm,
       coalesce(s.weight_kg, 0) * coalesce(s.reps, 0) as volume_kg
from public.workout_sets s
join public.workout_exercises we on we.id = s.workout_exercise_id
join public.workouts w           on w.id  = we.workout_id
where s.is_completed and not s.is_warmup and w.ended_at is not null;
revoke all on public.completed_sets from anon, authenticated;
grant select on public.completed_sets to authenticated;

-- Atomic, idempotent snapshot save for a workout (active or edited from history)
create function public.save_workout(p_workout jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid := (p_workout ->> 'id')::uuid;
  v_ex  jsonb;
  v_we  uuid;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;

  insert into public.workouts as w (id, user_id, name, started_at, ended_at, notes, template_id, revision)
  values (v_id, v_uid, coalesce(p_workout ->> 'name', 'Workout'),
          (p_workout ->> 'started_at')::timestamptz, (p_workout ->> 'ended_at')::timestamptz,
          p_workout ->> 'notes', (p_workout ->> 'template_id')::uuid,
          coalesce((p_workout ->> 'revision')::int, 0))
  on conflict (id) do update
     set name = excluded.name, started_at = excluded.started_at, ended_at = excluded.ended_at,
         notes = excluded.notes, template_id = excluded.template_id, revision = excluded.revision
   where w.revision < excluded.revision;
  if not found then return v_id; end if;   -- stale snapshot: ignore

  delete from public.workout_exercises
   where workout_id = v_id
     and id <> all (array(select (e ->> 'id')::uuid
                            from jsonb_array_elements(coalesce(p_workout -> 'exercises', '[]')) e));

  for v_ex in select * from jsonb_array_elements(coalesce(p_workout -> 'exercises', '[]')) loop
    v_we := (v_ex ->> 'id')::uuid;
    insert into public.workout_exercises (id, user_id, workout_id, exercise_id, position, notes)
    values (v_we, v_uid, v_id, (v_ex ->> 'exercise_id')::uuid, (v_ex ->> 'position')::int, v_ex ->> 'notes')
    on conflict (id) do update
       set exercise_id = excluded.exercise_id, position = excluded.position, notes = excluded.notes;

    delete from public.workout_sets
     where workout_exercise_id = v_we
       and id <> all (array(select (x ->> 'id')::uuid
                              from jsonb_array_elements(coalesce(v_ex -> 'sets', '[]')) x));

    insert into public.workout_sets (id, user_id, workout_exercise_id, position, weight_kg, reps,
                                     duration_seconds, distance_m, is_warmup, is_completed, completed_at)
    select (x ->> 'id')::uuid, v_uid, v_we, (x ->> 'position')::int,
           (x ->> 'weight_kg')::numeric, (x ->> 'reps')::int, (x ->> 'duration_seconds')::int,
           (x ->> 'distance_m')::numeric, coalesce((x ->> 'is_warmup')::boolean, false),
           coalesce((x ->> 'is_completed')::boolean, false), (x ->> 'completed_at')::timestamptz
      from jsonb_array_elements(coalesce(v_ex -> 'sets', '[]')) x
    on conflict (id) do update
       set position = excluded.position, weight_kg = excluded.weight_kg, reps = excluded.reps,
           duration_seconds = excluded.duration_seconds, distance_m = excluded.distance_m,
           is_warmup = excluded.is_warmup, is_completed = excluded.is_completed,
           completed_at = excluded.completed_at;
  end loop;

  return v_id;
end $$;

-- Sets from the most recent finished session of each exercise ("previous: 60kg × 8")
create function public.last_performance(p_exercise_ids uuid[])
returns table (exercise_id uuid, performed_at timestamptz, "position" int, weight_kg numeric,
               reps int, duration_seconds int, distance_m numeric, is_warmup boolean)
language sql stable security invoker set search_path = '' as $$
  with last as (
    select distinct on (we.exercise_id) we.exercise_id, we.id as we_id, w.started_at
      from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
     where we.user_id = (select auth.uid()) and we.exercise_id = any (p_exercise_ids)
       and w.ended_at is not null
       -- skip sessions where the exercise was added but no set was completed
       and exists (select 1 from public.workout_sets s
                    where s.workout_exercise_id = we.id and s.is_completed)
     order by we.exercise_id, w.started_at desc
  )
  select l.exercise_id, l.started_at, s.position, s.weight_kg, s.reps, s.duration_seconds, s.distance_m, s.is_warmup
    from last l join public.workout_sets s on s.workout_exercise_id = l.we_id
   where s.is_completed
   order by l.exercise_id, s.position
$$;

-- Per-session history for an exercise (chart data)
create function public.exercise_history(p_exercise_id uuid)
returns table (workout_id uuid, performed_at timestamptz, top_weight_kg numeric, best_e1rm numeric,
               total_volume_kg numeric, total_reps bigint, max_duration_seconds int,
               max_distance_m numeric, set_count bigint)
language sql stable security invoker set search_path = '' as $$
  select workout_id, started_at, max(weight_kg), max(e1rm), sum(volume_kg), sum(reps),
         max(duration_seconds), max(distance_m), count(*)
    from public.completed_sets
   where user_id = (select auth.uid()) and exercise_id = p_exercise_id
   group by workout_id, started_at
   order by started_at
$$;

-- All-time records for an exercise (earliest achievement wins ties)
create function public.exercise_prs(p_exercise_id uuid)
returns table (kind text, value numeric, workout_id uuid, achieved_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select distinct on (kind) kind, value, workout_id, started_at
  from (
    select 'max_weight' as kind, weight_kg as value, workout_id, started_at from public.completed_sets where exercise_id = p_exercise_id
    union all select 'best_e1rm',        e1rm,                      workout_id, started_at from public.completed_sets where exercise_id = p_exercise_id
    union all select 'max_set_volume',   volume_kg,                 workout_id, started_at from public.completed_sets where exercise_id = p_exercise_id
    union all select 'max_reps',         reps::numeric,             workout_id, started_at from public.completed_sets where exercise_id = p_exercise_id
    union all select 'longest_duration', duration_seconds::numeric, workout_id, started_at from public.completed_sets where exercise_id = p_exercise_id
    union all select 'longest_distance', distance_m,                workout_id, started_at from public.completed_sets where exercise_id = p_exercise_id
  ) t
  where value is not null and value > 0 and (select auth.uid()) is not null
  order by kind, value desc, started_at asc
$$;

-- PRs hit in one workout vs everything before it (for the finish summary)
create function public.workout_prs(p_workout_id uuid)
returns table (exercise_id uuid, kind text, value numeric, previous_best numeric)
language sql stable security invoker set search_path = '' as $$
  with cur as (
    select exercise_id, max(weight_kg) mw, max(e1rm) me, max(volume_kg) mv, max(reps)::numeric mr
      from public.completed_sets where workout_id = p_workout_id group by exercise_id
  ), prev as (
    select cs.exercise_id, max(cs.weight_kg) mw, max(cs.e1rm) me, max(cs.volume_kg) mv, max(cs.reps)::numeric mr
      from public.completed_sets cs join cur using (exercise_id)
     where cs.started_at < (select started_at from public.workouts where id = p_workout_id)
     group by cs.exercise_id
  )
  select c.exercise_id, k.kind, k.cur_v, k.prev_v
    from cur c join prev p using (exercise_id)          -- first-ever session is not a PR
   cross join lateral (values ('max_weight', c.mw, p.mw), ('best_e1rm', c.me, p.me),
                              ('max_set_volume', c.mv, p.mv), ('max_reps', c.mr, p.mr)) k(kind, cur_v, prev_v)
   where k.cur_v > 0 and (k.prev_v is null or k.cur_v > k.prev_v)
$$;

-- Distinct recent foods for the "log food" picker
create function public.recent_foods(p_limit int default 20)
returns table (name text, quantity numeric, unit text, calories int, protein_g numeric,
               carbs_g numeric, fat_g numeric, saved_food_id uuid, last_logged_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select * from (
    select distinct on (lower(name)) name, quantity, unit, calories, protein_g, carbs_g, fat_g,
           saved_food_id, created_at
      from public.food_entries
     where user_id = (select auth.uid()) and created_at > now() - interval '60 days'
     order by lower(name), created_at desc
  ) t order by created_at desc limit p_limit
$$;

-- Copy a meal (or whole day when p_meal_type is null) to another date
create function public.copy_food_entries(p_from date, p_to date, p_meal_type public.meal_type default null)
returns int
language sql security invoker set search_path = '' as $$
  with ins as (
    insert into public.food_entries (user_id, meal_type, logged_on, name, quantity, unit,
                                     calories, protein_g, carbs_g, fat_g, saved_food_id)
    select user_id, meal_type, p_to, name, quantity, unit, calories, protein_g, carbs_g, fat_g, saved_food_id
      from public.food_entries
     where user_id = (select auth.uid()) and logged_on = p_from
       and (p_meal_type is null or meal_type = p_meal_type)
    returning 1
  ) select count(*)::int from ins
$$;

-- Workout count per local day (calendar + streak)
create function public.workout_days(p_from date, p_to date)
returns table (day date, workout_count int)
language sql stable security invoker set search_path = '' as $$
  with tz as (select coalesce((select timezone from public.profiles where id = (select auth.uid())), 'UTC') as tz)
  select (w.started_at at time zone tz.tz)::date as day, count(*)::int
    from public.workouts w, tz
   where w.user_id = (select auth.uid()) and w.ended_at is not null
     and (w.started_at at time zone tz.tz)::date between p_from and p_to
   group by 1 order by 1
$$;

-- Weekly summaries (Mon-start weeks, user timezone). Averages are over days that have logs.
create function public.weekly_summaries(p_from date, p_to date)
returns table (week_start date, workouts_completed int, avg_calories numeric, avg_water_ml numeric)
language sql stable security invoker set search_path = '' as $$
  with weeks as (
    -- cast to timestamp (not timestamptz) so the session TimeZone can't shift the dates
    select generate_series(date_trunc('week', p_from::timestamp), p_to::timestamp, interval '1 week')::date as ws
  ), food as (
    select logged_on d, sum(calories) v from public.food_entries
     where user_id = (select auth.uid()) and logged_on between p_from and p_to group by 1
  ), water as (
    select logged_on d, sum(amount_ml) v from public.water_logs
     where user_id = (select auth.uid()) and logged_on between p_from and p_to group by 1
  ), wd as (select day d, workout_count v from public.workout_days(p_from, p_to))
  select weeks.ws,
         coalesce((select sum(v) from wd    where d >= weeks.ws and d < weeks.ws + 7), 0)::int,
         (select round(avg(v)) from food    where d >= weeks.ws and d < weeks.ws + 7),
         (select round(avg(v)) from water   where d >= weeks.ws and d < weeks.ws + 7)
    from weeks order by weeks.ws
$$;

-- Lock down execute: only signed-in users, and never the trigger functions
-- (triggers fire without an EXECUTE check, so revoking them is safe)
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.save_workout(jsonb), public.last_performance(uuid[]), public.exercise_history(uuid),
  public.exercise_prs(uuid), public.workout_prs(uuid), public.recent_foods(int),
  public.copy_food_entries(date, date, public.meal_type), public.workout_days(date, date),
  public.weekly_summaries(date, date), public.epley_1rm(numeric, int), public.is_valid_timezone(text)
to authenticated;
