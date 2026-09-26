-- Profiles: own row only; created by trigger, removed by auth.users cascade
alter table public.profiles enable row level security;
create policy profiles_select_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Exercises: global rows readable by all signed-in users; custom rows owner-only
alter table public.exercises enable row level security;
create policy exercises_select on public.exercises for select to authenticated
  using (user_id is null or (select auth.uid()) = user_id);
create policy exercises_insert_own on public.exercises for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy exercises_update_own on public.exercises for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy exercises_delete_own on public.exercises for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Plain user-owned tables: CRUD on own rows
do $$
declare t text;
begin
  foreach t in array array['workouts','workout_sets','workout_templates',
                           'food_entries','saved_foods','water_logs','body_weights'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t||'_select_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t||'_insert_own', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t||'_update_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t||'_delete_own', t);
  end loop;
end $$;

-- Tables referencing exercises: also require the exercise to be visible (global or own)
do $$
declare t text;
begin
  foreach t in array array['workout_exercises','template_exercises'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t||'_select_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.exercises e where e.id = exercise_id))', t||'_insert_own', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and exists (select 1 from public.exercises e where e.id = exercise_id))', t||'_update_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t||'_delete_own', t);
  end loop;
end $$;

-- Explicit grants (don't rely on project defaults, which grant ALL to anon and authenticated).
-- anon gets nothing; authenticated gets only the verbs the app uses. RLS still filters rows.
revoke all on all tables in schema public from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on
  public.exercises, public.workouts, public.workout_exercises, public.workout_sets,
  public.workout_templates, public.template_exercises, public.food_entries,
  public.saved_foods, public.water_logs, public.body_weights
to authenticated;
