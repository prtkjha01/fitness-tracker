-- Behaviour of the signup trigger, save_workout snapshots, and PR/history RPCs.
-- Run with: bun run db:test
begin;
create extension if not exists pgtap with schema extensions;
-- Run as postgres with pgTAP on the path. Locally that's already the case; on a hosted
-- project the CLI connects as a login role that can't see the "extensions" schema.
set local role postgres;
set local search_path = public, extensions;

select plan(17);

-- ============ Signup trigger ============
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333',
   'authenticated', 'authenticated', 'c@test.local', '{"display_name":"Casey","timezone":"Asia/Kolkata"}'),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444',
   'authenticated', 'authenticated', 'd@test.local', '{"timezone":"Mars/Olympus_Mons"}');

select results_eq(
  $$select display_name, timezone, units::text from public.profiles where id = '33333333-3333-3333-3333-333333333333'$$,
  $$values ('Casey'::text, 'Asia/Kolkata'::text, 'metric'::text)$$,
  'signup creates a profile with metadata display name and timezone'
);
select is((select timezone from public.profiles where id = '44444444-4444-4444-4444-444444444444'),
          'UTC', 'an invalid signup timezone falls back to UTC');
select is((select onboarded_at from public.profiles where id = '33333333-3333-3333-3333-333333333333'),
          null, 'new profiles are not onboarded');

-- ============ Pure helpers ============
select is(public.epley_1rm(100, 1), 100::numeric, 'e1RM of a single is the weight');
select is(public.epley_1rm(100, 5), 116.67, 'Epley e1RM for 100kg x 5');
select is(public.epley_1rm(100, 13), null, 'e1RM is not computed above 12 reps');

-- ============ save_workout (as C) ============
set local role authenticated;
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

-- Revision 1: bench with two sets, in progress
select is(
  public.save_workout(($${"id":"cccccccc-0000-0000-0000-000000000001","name":"Push","started_at":"2026-09-20T10:00:00Z",
    "revision":1,"exercises":[{"id":"cccccccc-0000-0000-0000-000000000011","position":0,
      "exercise_id":"$$ || (select id from public.exercises where name = 'Bench Press') || $$",
      "sets":[{"id":"cccccccc-0000-0000-0000-000000000101","position":0,"weight_kg":80,"reps":5,"is_completed":true},
              {"id":"cccccccc-0000-0000-0000-000000000102","position":1,"weight_kg":80,"reps":5}]}]}$$)::jsonb),
  'cccccccc-0000-0000-0000-000000000001'::uuid,
  'save_workout returns the workout id'
);
select is((select count(*) from public.workout_sets), 2::bigint, 'first snapshot writes both sets');

-- Revision 2: second set removed, first set edited
select public.save_workout(($${"id":"cccccccc-0000-0000-0000-000000000001","name":"Push","started_at":"2026-09-20T10:00:00Z",
  "revision":2,"exercises":[{"id":"cccccccc-0000-0000-0000-000000000011","position":0,
    "exercise_id":"$$ || (select id from public.exercises where name = 'Bench Press') || $$",
    "sets":[{"id":"cccccccc-0000-0000-0000-000000000101","position":0,"weight_kg":85,"reps":5,"is_completed":true}]}]}$$)::jsonb);
select results_eq($$select count(*), max(weight_kg) from public.workout_sets$$,
                  $$values (1::bigint, 85::numeric)$$, 'newer snapshot removes and edits sets');

-- Stale revision 1 replayed late: ignored
select public.save_workout($${"id":"cccccccc-0000-0000-0000-000000000001","name":"Stale","started_at":"2026-09-20T10:00:00Z",
  "revision":1,"exercises":[]}$$::jsonb);
select results_eq($$select w.name, (select count(*) from public.workout_sets) from public.workouts w$$,
                  $$values ('Push'::text, 1::bigint)$$, 'stale snapshot is ignored');

select throws_ok($$insert into public.workouts (name) values ('Second active')$$, '23505', null,
                 'only one in-progress workout per user');

-- Finish workout 1
select public.save_workout(($${"id":"cccccccc-0000-0000-0000-000000000001","name":"Push","started_at":"2026-09-20T10:00:00Z",
  "ended_at":"2026-09-20T11:00:00Z","revision":3,"exercises":[{"id":"cccccccc-0000-0000-0000-000000000011","position":0,
    "exercise_id":"$$ || (select id from public.exercises where name = 'Bench Press') || $$",
    "sets":[{"id":"cccccccc-0000-0000-0000-000000000101","position":0,"weight_kg":85,"reps":5,"is_completed":true}]}]}$$)::jsonb);
select is_empty($$select * from public.workout_prs('cccccccc-0000-0000-0000-000000000001')$$,
                'the first-ever session of an exercise is not a PR');

-- Workout 2, a week later: heavier top set plus a warmup and an uncompleted set
select public.save_workout(($${"id":"cccccccc-0000-0000-0000-000000000002","name":"Push","started_at":"2026-09-27T10:00:00Z",
  "ended_at":"2026-09-27T11:00:00Z","revision":1,"exercises":[{"id":"cccccccc-0000-0000-0000-000000000021","position":0,
    "exercise_id":"$$ || (select id from public.exercises where name = 'Bench Press') || $$",
    "sets":[{"id":"cccccccc-0000-0000-0000-000000000201","position":0,"weight_kg":150,"reps":1,"is_warmup":true,"is_completed":true},
            {"id":"cccccccc-0000-0000-0000-000000000202","position":1,"weight_kg":90,"reps":3,"is_completed":true},
            {"id":"cccccccc-0000-0000-0000-000000000203","position":2,"weight_kg":200,"reps":1}]}]}$$)::jsonb);

select results_eq(
  $$select kind, value, previous_best from public.workout_prs('cccccccc-0000-0000-0000-000000000002') order by kind$$,
  $$values ('max_weight'::text, 90::numeric, 85::numeric)$$,
  'workout_prs finds only real PRs, ignoring warmups and uncompleted sets'
);
select results_eq(
  $$select kind, value from public.exercise_prs((select id from public.exercises where name = 'Bench Press')) order by kind$$,
  $$values ('best_e1rm'::text, 99.17::numeric), ('max_reps', 5), ('max_set_volume', 425), ('max_weight', 90)$$,
  'exercise_prs returns all-time bests'
);
select results_eq(
  $$select top_weight_kg, set_count from public.exercise_history((select id from public.exercises where name = 'Bench Press'))$$,
  $$values (85::numeric, 1::bigint), (90::numeric, 1::bigint)$$,
  'exercise_history has one row per session, oldest first'
);
select results_eq(
  $$select performed_at, weight_kg, is_warmup from public.last_performance(array[(select id from public.exercises where name = 'Bench Press')])$$,
  $$values ('2026-09-27T10:00:00Z'::timestamptz, 150::numeric, true), ('2026-09-27T10:00:00Z'::timestamptz, 90::numeric, false)$$,
  'last_performance returns completed sets (incl. warmups) of the latest session'
);

-- Calendar in the user's timezone (Asia/Kolkata, +05:30)
select results_eq(
  $$select day, workout_count from public.workout_days('2026-09-01', '2026-09-30')$$,
  $$values ('2026-09-20'::date, 1), ('2026-09-27'::date, 1)$$,
  'workout_days groups finished workouts by local day'
);

select * from finish();
rollback;
