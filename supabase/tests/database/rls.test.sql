-- Cross-user isolation: user B must not read, change, or attach to anything user A owns.
-- Run with: bun run db:test
begin;
create extension if not exists pgtap with schema extensions;
-- Run as postgres with pgTAP on the path. Locally that's already the case; on a hosted
-- project the CLI connects as a login role that can't see the "extensions" schema.
set local role postgres;
set local search_path = public, extensions;

select plan(65);

-- ============ Fixtures (as postgres, bypassing RLS) ============
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'a@test.local', '{"display_name":"A"}'),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'b@test.local', '{"display_name":"B"}');

insert into public.exercises (id, user_id, name, category, muscle_group, equipment, tracking_type) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'A Secret Press', 'strength', 'chest', 'barbell', 'weight_reps');
insert into public.workout_templates (id, user_id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'A Push Day');
insert into public.template_exercises (id, user_id, template_id, exercise_id, position) values
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 0);
insert into public.workouts (id, user_id, name, started_at, ended_at, revision) values
  ('aaaaaaaa-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
   'A Workout', '2026-09-20 10:00Z', '2026-09-20 11:00Z', 5);
insert into public.workout_exercises (id, user_id, workout_id, exercise_id, position) values
  ('aaaaaaaa-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 0);
insert into public.workout_sets (id, user_id, workout_exercise_id, position, weight_kg, reps, is_completed) values
  ('aaaaaaaa-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-0000-0000-0000-000000000005', 0, 100, 5, true);
insert into public.saved_foods (id, user_id, name, default_quantity, default_unit, calories) values
  ('aaaaaaaa-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'Oats', 50, 'g', 190);
insert into public.food_entries (id, user_id, meal_type, logged_on, name, quantity, unit, calories, saved_food_id) values
  ('aaaaaaaa-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111',
   'breakfast', '2026-09-20', 'Oats', 50, 'g', 190, 'aaaaaaaa-0000-0000-0000-000000000007');
insert into public.water_logs (id, user_id, amount_ml, logged_on) values
  ('aaaaaaaa-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 500, '2026-09-20');
insert into public.body_weights (id, user_id, weight_kg, measured_on) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 80, '2026-09-20');

-- ============ As A: fixtures are visible to their owner (so B's empties aren't vacuous) ============
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  array[
    (select count(*) from public.profiles),
    (select count(*) from public.exercises where user_id is not null),
    (select count(*) from public.workout_templates),
    (select count(*) from public.template_exercises),
    (select count(*) from public.workouts),
    (select count(*) from public.workout_exercises),
    (select count(*) from public.workout_sets),
    (select count(*) from public.saved_foods),
    (select count(*) from public.food_entries),
    (select count(*) from public.water_logs),
    (select count(*) from public.body_weights),
    (select count(*) from public.completed_sets)
  ],
  array[1,1,1,1,1,1,1,1,1,1,1,1]::bigint[],
  'A sees exactly one of each of their own rows'
);

-- ============ As B ============
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is((select count(*) from public.profiles), 1::bigint, 'B sees only their own profile');

-- Reads
select is_empty($$select 1 from public.profiles where id = '11111111-1111-1111-1111-111111111111'$$, 'B cannot read A profile');
select is_empty($$select 1 from public.exercises where user_id is not null$$, 'B cannot read A custom exercises');
select is_empty($$select 1 from public.workout_templates$$, 'B cannot read A templates');
select is_empty($$select 1 from public.template_exercises$$, 'B cannot read A template exercises');
select is_empty($$select 1 from public.workouts$$, 'B cannot read A workouts');
select is_empty($$select 1 from public.workout_exercises$$, 'B cannot read A workout exercises');
select is_empty($$select 1 from public.workout_sets$$, 'B cannot read A sets');
select is_empty($$select 1 from public.saved_foods$$, 'B cannot read A saved foods');
select is_empty($$select 1 from public.food_entries$$, 'B cannot read A food entries');
select is_empty($$select 1 from public.water_logs$$, 'B cannot read A water logs');
select is_empty($$select 1 from public.body_weights$$, 'B cannot read A body weights');
select is_empty($$select 1 from public.completed_sets$$, 'B cannot read A completed_sets view');

-- Updates affect nothing
select is_empty($$update public.profiles set display_name = 'hacked' where id = '11111111-1111-1111-1111-111111111111' returning 1$$, 'B cannot update A profile');
select is_empty($$update public.exercises set name = 'hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000001' returning 1$$, 'B cannot update A exercise');
select is_empty($$update public.workout_templates set name = 'hacked' returning 1$$, 'B cannot update A templates');
select is_empty($$update public.template_exercises set position = 9 returning 1$$, 'B cannot update A template exercises');
select is_empty($$update public.workouts set name = 'hacked' returning 1$$, 'B cannot update A workouts');
select is_empty($$update public.workout_exercises set position = 9 returning 1$$, 'B cannot update A workout exercises');
select is_empty($$update public.workout_sets set reps = 99 returning 1$$, 'B cannot update A sets');
select is_empty($$update public.saved_foods set calories = 1 returning 1$$, 'B cannot update A saved foods');
select is_empty($$update public.food_entries set calories = 1 returning 1$$, 'B cannot update A food entries');
select is_empty($$update public.water_logs set amount_ml = 1 returning 1$$, 'B cannot update A water logs');
select is_empty($$update public.body_weights set weight_kg = 50 returning 1$$, 'B cannot update A body weights');

-- Deletes affect nothing
select throws_ok($$delete from public.profiles$$, '42501', null, 'B cannot delete profiles at all (no grant)');
select is_empty($$delete from public.exercises where id = 'aaaaaaaa-0000-0000-0000-000000000001' returning 1$$, 'B cannot delete A exercise');
select is_empty($$delete from public.workout_templates returning 1$$, 'B cannot delete A templates');
select is_empty($$delete from public.template_exercises returning 1$$, 'B cannot delete A template exercises');
select is_empty($$delete from public.workouts returning 1$$, 'B cannot delete A workouts');
select is_empty($$delete from public.workout_exercises returning 1$$, 'B cannot delete A workout exercises');
select is_empty($$delete from public.workout_sets returning 1$$, 'B cannot delete A sets');
select is_empty($$delete from public.saved_foods returning 1$$, 'B cannot delete A saved foods');
select is_empty($$delete from public.food_entries returning 1$$, 'B cannot delete A food entries');
select is_empty($$delete from public.water_logs returning 1$$, 'B cannot delete A water logs');
select is_empty($$delete from public.body_weights returning 1$$, 'B cannot delete A body weights');

-- Inserts on A's behalf are rejected by RLS
select throws_ok($$insert into public.exercises (user_id, name, category, muscle_group, equipment, tracking_type)
                   values ('11111111-1111-1111-1111-111111111111', 'x', 'strength', 'chest', 'barbell', 'reps')$$,
                 '42501', null, 'B cannot insert an exercise as A');
select throws_ok($$insert into public.workout_templates (user_id, name) values ('11111111-1111-1111-1111-111111111111', 'x')$$,
                 '42501', null, 'B cannot insert a template as A');
select throws_ok($$insert into public.workouts (user_id) values ('11111111-1111-1111-1111-111111111111')$$,
                 '42501', null, 'B cannot insert a workout as A');
select throws_ok($$insert into public.workout_exercises (user_id, workout_id, exercise_id, position)
                   values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000004',
                           'aaaaaaaa-0000-0000-0000-000000000001', 1)$$,
                 '42501', null, 'B cannot insert a workout exercise as A');
select throws_ok($$insert into public.workout_sets (user_id, workout_exercise_id, position)
                   values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000005', 1)$$,
                 '42501', null, 'B cannot insert a set as A');
select throws_ok($$insert into public.saved_foods (user_id, name, default_quantity, default_unit, calories)
                   values ('11111111-1111-1111-1111-111111111111', 'x', 1, 'g', 1)$$,
                 '42501', null, 'B cannot insert a saved food as A');
select throws_ok($$insert into public.food_entries (user_id, meal_type, logged_on, name, quantity, unit, calories)
                   values ('11111111-1111-1111-1111-111111111111', 'lunch', '2026-09-20', 'x', 1, 'g', 1)$$,
                 '42501', null, 'B cannot insert a food entry as A');
select throws_ok($$insert into public.water_logs (user_id, amount_ml, logged_on)
                   values ('11111111-1111-1111-1111-111111111111', 250, '2026-09-20')$$,
                 '42501', null, 'B cannot insert water as A');
select throws_ok($$insert into public.body_weights (user_id, weight_kg, measured_on)
                   values ('11111111-1111-1111-1111-111111111111', 70, '2026-09-21')$$,
                 '42501', null, 'B cannot insert a body weight as A');

-- Attaching B-owned children to A-owned parents fails on the composite FKs
select lives_ok($$insert into public.workouts (id, name) values ('bbbbbbbb-0000-0000-0000-000000000001', 'B Workout')$$,
                'B can create their own workout');
select throws_ok($$insert into public.workout_exercises (workout_id, exercise_id, position)
                   values ('aaaaaaaa-0000-0000-0000-000000000004',
                           (select id from public.exercises where name = 'Bench Press'), 1)$$,
                 '23503', null, 'B cannot add an exercise to A workout');
select throws_ok($$insert into public.workout_sets (workout_exercise_id, position)
                   values ('aaaaaaaa-0000-0000-0000-000000000005', 1)$$,
                 '23503', null, 'B cannot add a set to A workout exercise');
select throws_ok($$insert into public.food_entries (meal_type, logged_on, name, quantity, unit, calories, saved_food_id)
                   values ('lunch', '2026-09-20', 'x', 1, 'g', 1, 'aaaaaaaa-0000-0000-0000-000000000007')$$,
                 '23503', null, 'B cannot link a food entry to A saved food');
select throws_ok($$insert into public.workout_exercises (workout_id, exercise_id, position)
                   values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 0)$$,
                 '42501', null, 'B cannot use A custom exercise in their own workout');

-- Global exercises: readable, not writable
select isnt_empty($$select 1 from public.exercises where user_id is null and name = 'Bench Press'$$, 'B can read global exercises');
select is_empty($$update public.exercises set name = 'hacked' where user_id is null returning 1$$, 'B cannot update global exercises');
select is_empty($$delete from public.exercises where user_id is null returning 1$$, 'B cannot delete global exercises');
select throws_ok($$insert into public.exercises (user_id, name, category, muscle_group, equipment, tracking_type)
                   values (null, 'Fake Global', 'strength', 'chest', 'barbell', 'reps')$$,
                 '42501', null, 'B cannot insert a global exercise');

-- RPCs never cross users
select throws_ok($$select public.save_workout('{"id":"aaaaaaaa-0000-0000-0000-000000000004","name":"hacked",
                   "started_at":"2026-09-20T10:00:00Z","revision":999,"exercises":[]}'::jsonb)$$,
                 '42501', null, 'save_workout with A workout id (newer revision) fails for B');
select lives_ok($$select public.save_workout('{"id":"aaaaaaaa-0000-0000-0000-000000000004","name":"hacked",
                  "started_at":"2026-09-20T10:00:00Z","revision":0,"exercises":[]}'::jsonb)$$,
                'save_workout with A workout id (stale revision) is a no-op for B');
select is_empty($$select * from public.exercise_history('aaaaaaaa-0000-0000-0000-000000000001')$$, 'exercise_history hides A data');
select is_empty($$select * from public.exercise_prs('aaaaaaaa-0000-0000-0000-000000000001')$$, 'exercise_prs hides A data');
select is_empty($$select * from public.last_performance(array['aaaaaaaa-0000-0000-0000-000000000001']::uuid[])$$, 'last_performance hides A data');
select is_empty($$select * from public.recent_foods()$$, 'recent_foods hides A data');
select is(public.copy_food_entries('2026-09-20', '2026-09-21'), 0, 'copy_food_entries cannot copy A entries');

-- ============ Anonymous role gets nothing ============
set local role postgres;
set local role anon;
select throws_ok($$select 1 from public.workouts$$, '42501', null, 'anon cannot read tables');
select throws_ok($$select public.recent_foods()$$, '42501', null, 'anon cannot call RPCs');

-- ============ Back as postgres: A's data survived B's attempts ============
set local role postgres;
select is((select name from public.workouts where id = 'aaaaaaaa-0000-0000-0000-000000000004'),
          'A Workout', 'A workout is unchanged');
select is((select count(*) from public.workout_sets where user_id = '11111111-1111-1111-1111-111111111111'),
          1::bigint, 'A sets are intact');

select * from finish();
rollback;
