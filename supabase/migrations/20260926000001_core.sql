-- ============ Enums ============
create type public.unit_system       as enum ('metric', 'imperial');
create type public.tracking_type     as enum ('weight_reps', 'reps', 'duration', 'distance_duration');
create type public.exercise_category as enum ('strength', 'cardio', 'mobility', 'other');
create type public.muscle_group      as enum ('chest','back','shoulders','biceps','triceps','forearms',
                                              'core','quads','hamstrings','glutes','calves','full_body','cardio','other');
create type public.equipment         as enum ('barbell','dumbbell','machine','cable','kettlebell','bodyweight','band','other');
create type public.meal_type         as enum ('breakfast','lunch','dinner','snack');

-- ============ Helpers ============
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create function public.is_valid_timezone(tz text) returns boolean
language plpgsql stable set search_path = '' as $$
begin
  perform now() at time zone tz;
  return true;
exception when others then
  return false;
end $$;

create function public.epley_1rm(weight_kg numeric, reps integer) returns numeric
language sql immutable set search_path = '' as $$
  select case
    when weight_kg is null or weight_kg <= 0 or reps is null or reps < 1 or reps > 12 then null
    when reps = 1 then weight_kg
    else round(weight_kg * (1 + reps / 30.0), 2)
  end
$$;

-- ============ Profiles ============
create table public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  display_name         text check (char_length(display_name) between 1 and 50),
  units                public.unit_system not null default 'metric',
  daily_calorie_goal   integer not null default 2000 check (daily_calorie_goal between 500 and 10000),
  daily_water_goal_ml  integer not null default 2500 check (daily_water_goal_ml between 250 and 10000),
  water_quick_adds     integer[] not null default '{250,500,750}'
                       check (cardinality(water_quick_adds) between 1 and 6
                              and 0 < all (water_quick_adds) and 5000 >= all (water_quick_adds)),
  default_rest_seconds integer not null default 90 check (default_rest_seconds between 0 and 900),
  timezone             text not null default 'UTC' check (public.is_valid_timezone(timezone)),
  onboarded_at         timestamptz,                -- null => show onboarding
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_tz text := nullif(new.raw_user_meta_data ->> 'timezone', '');
begin
  insert into public.profiles (id, display_name, timezone)
  values (
    new.id,
    nullif(left(new.raw_user_meta_data ->> 'display_name', 50), ''),
    case when v_tz is not null and public.is_valid_timezone(v_tz) then v_tz else 'UTC' end
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ Exercises ============
create table public.exercises (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users (id) on delete cascade,   -- null = global/seeded
  name          text not null check (char_length(name) between 1 and 80),
  category      public.exercise_category not null,
  muscle_group  public.muscle_group not null,
  equipment     public.equipment not null,
  tracking_type public.tracking_type not null,
  is_archived   boolean not null default false,  -- used instead of delete once referenced
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index exercises_global_name_key on public.exercises (lower(name)) where user_id is null;
create unique index exercises_user_name_key   on public.exercises (user_id, lower(name)) where user_id is not null;
create trigger exercises_updated_at before update on public.exercises
  for each row execute function public.set_updated_at();

-- ============ Templates ============
create table public.workout_templates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  notes      text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create index workout_templates_user_idx on public.workout_templates (user_id, name);
create trigger workout_templates_updated_at before update on public.workout_templates
  for each row execute function public.set_updated_at();

create table public.template_exercises (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid(),
  template_id  uuid not null,
  exercise_id  uuid not null references public.exercises (id) on delete restrict,
  position     integer not null check (position >= 0),
  target_sets  integer check (target_sets between 1 and 20),
  target_reps  integer check (target_reps between 1 and 100),
  notes        text check (char_length(notes) <= 500),
  created_at   timestamptz not null default now(),
  foreign key (template_id, user_id) references public.workout_templates (id, user_id) on delete cascade
);
create index template_exercises_template_idx on public.template_exercises (template_id, position);

-- ============ Workouts ============
create table public.workouts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null default 'Workout' check (char_length(name) between 1 and 80),
  started_at  timestamptz not null default now(),
  ended_at    timestamptz check (ended_at is null or ended_at >= started_at),  -- null = in progress
  notes       text check (char_length(notes) <= 2000),
  template_id uuid,
  revision    integer not null default 0,   -- client snapshot version; stale syncs are ignored
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id),
  foreign key (template_id, user_id) references public.workout_templates (id, user_id)
    on delete set null (template_id)
);
create unique index workouts_one_active_per_user on public.workouts (user_id) where ended_at is null;
create index workouts_user_started_idx on public.workouts (user_id, started_at desc);
create trigger workouts_updated_at before update on public.workouts
  for each row execute function public.set_updated_at();

create table public.workout_exercises (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  workout_id  uuid not null,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position    integer not null check (position >= 0),
  notes       text check (char_length(notes) <= 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id),
  foreign key (workout_id, user_id) references public.workouts (id, user_id) on delete cascade
);
create index workout_exercises_workout_idx  on public.workout_exercises (workout_id, position);
create index workout_exercises_exercise_idx on public.workout_exercises (user_id, exercise_id);
create trigger workout_exercises_updated_at before update on public.workout_exercises
  for each row execute function public.set_updated_at();

create table public.workout_sets (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid(),
  workout_exercise_id uuid not null,
  position            integer not null check (position >= 0),
  weight_kg           numeric(7,3) check (weight_kg >= 0),   -- 3dp so lb<->kg round-trips cleanly
  reps                integer check (reps between 0 and 1000),
  duration_seconds    integer check (duration_seconds between 0 and 86400),
  distance_m          numeric(10,2) check (distance_m >= 0),
  is_warmup           boolean not null default false,
  is_completed        boolean not null default false,
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  foreign key (workout_exercise_id, user_id) references public.workout_exercises (id, user_id) on delete cascade
);
create index workout_sets_we_idx on public.workout_sets (workout_exercise_id, position);
create trigger workout_sets_updated_at before update on public.workout_sets
  for each row execute function public.set_updated_at();

-- ============ Nutrition ============
create table public.saved_foods (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 120),
  default_quantity numeric(8,2) not null check (default_quantity > 0),
  default_unit     text not null check (char_length(default_unit) between 1 and 20),
  calories         integer not null check (calories between 0 and 10000),
  protein_g        numeric(6,1) check (protein_g >= 0),
  carbs_g          numeric(6,1) check (carbs_g >= 0),
  fat_g            numeric(6,1) check (fat_g >= 0),
  last_used_at     timestamptz,
  use_count        integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, user_id)
);
create unique index saved_foods_user_name_key on public.saved_foods (user_id, lower(name));
create index saved_foods_user_recent_idx on public.saved_foods (user_id, last_used_at desc nulls last);
create trigger saved_foods_updated_at before update on public.saved_foods
  for each row execute function public.set_updated_at();

create table public.food_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  meal_type     public.meal_type not null,
  logged_on     date not null,                 -- local date in the user's timezone, set by client
  name          text not null check (char_length(name) between 1 and 120),
  quantity      numeric(8,2) not null check (quantity > 0),
  unit          text not null check (char_length(unit) between 1 and 20),
  calories      integer not null check (calories between 0 and 10000),
  protein_g     numeric(6,1) check (protein_g >= 0),
  carbs_g       numeric(6,1) check (carbs_g >= 0),
  fat_g         numeric(6,1) check (fat_g >= 0),
  saved_food_id uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (saved_food_id, user_id) references public.saved_foods (id, user_id)
    on delete set null (saved_food_id)
);
create index food_entries_user_day_idx     on public.food_entries (user_id, logged_on, meal_type);
create index food_entries_user_created_idx on public.food_entries (user_id, created_at desc);
create trigger food_entries_updated_at before update on public.food_entries
  for each row execute function public.set_updated_at();

-- Bump saved food recency when it is logged
create function public.touch_saved_food() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.saved_food_id is not null then
    update public.saved_foods
       set last_used_at = now(), use_count = use_count + 1
     where id = new.saved_food_id;
  end if;
  return new;
end $$;
create trigger food_entries_touch_saved after insert on public.food_entries
  for each row execute function public.touch_saved_food();

-- ============ Water ============
create table public.water_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount_ml  integer not null check (amount_ml between 1 and 5000),
  logged_at  timestamptz not null default now(),   -- actual instant (client-supplied for offline replay)
  logged_on  date not null,                         -- local date in the user's timezone
  created_at timestamptz not null default now()
);
create index water_logs_user_day_idx on public.water_logs (user_id, logged_on, logged_at desc);

-- ============ Body weight (P1) ============
create table public.body_weights (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  weight_kg   numeric(6,3) not null check (weight_kg between 20 and 400),
  measured_on date not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, measured_on)                     -- one entry per day; client upserts
);
create trigger body_weights_updated_at before update on public.body_weights
  for each row execute function public.set_updated_at();
