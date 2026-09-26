import { supabase } from '@/lib/supabase';
import type { Database, Enums, Tables, TablesInsert } from '@/types/database.types';

import { toSnapshot, type SetValues, type WorkoutDraft } from './draft';

export type Exercise = Tables<'exercises'>;
export type MuscleGroup = Enums<'muscle_group'>;
export type Equipment = Enums<'equipment'>;
export type ExerciseCategory = Enums<'exercise_category'>;

type Rpc<Name extends keyof Database['public']['Functions']> =
  Database['public']['Functions'][Name]['Returns'];
export type WorkoutPr = Rpc<'workout_prs'>[number];
export type ExercisePr = Rpc<'exercise_prs'>[number];
export type ExerciseSession = Rpc<'exercise_history'>[number];

export type Template = Tables<'workout_templates'> & {
  template_exercises: Tables<'template_exercises'>[];
};

/** One row of the history list, with just enough nested data for its stats line. */
export type WorkoutSummaryRow = Pick<
  Tables<'workouts'>,
  'id' | 'name' | 'started_at' | 'ended_at'
> & {
  workout_exercises: {
    exercise_id: string;
    workout_sets: Pick<
      Tables<'workout_sets'>,
      'weight_kg' | 'reps' | 'is_completed' | 'is_warmup'
    >[];
  }[];
};

// ---------- Mutation variables (persisted while queued offline) ----------

export type SaveWorkoutVars = { draft: WorkoutDraft };
export type DeleteWorkoutVars = { userId: string; workoutId: string };
export type CreateExerciseVars = { exercise: Exercise };
export type ArchiveExerciseVars = { exercise: Exercise; archived: boolean };
export type SaveTemplateVars = { template: Template };
export type DeleteTemplateVars = { template: Template };

// ---------- Exercises ----------

export async function fetchExercises(): Promise<Exercise[]> {
  // RLS returns the global library plus this user's custom exercises.
  const { data, error } = await supabase.from('exercises').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function createExercise({ exercise }: CreateExerciseVars): Promise<void> {
  const { created_at: _c, updated_at: _u, ...row } = exercise;
  const { error } = await supabase
    .from('exercises')
    .upsert(row, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function archiveExercise({ exercise, archived }: ArchiveExerciseVars): Promise<void> {
  const { error } = await supabase
    .from('exercises')
    .update({ is_archived: archived })
    .eq('id', exercise.id);
  if (error) throw error;
}

/** Completed sets from the most recent finished session of an exercise. */
export async function fetchLastPerformance(exerciseId: string): Promise<SetValues[]> {
  const { data, error } = await supabase.rpc('last_performance', {
    p_exercise_ids: [exerciseId],
  });
  if (error) throw error;
  return data.map((s) => ({
    weight_kg: s.weight_kg,
    reps: s.reps,
    duration_seconds: s.duration_seconds,
    distance_m: s.distance_m,
    is_warmup: s.is_warmup,
  }));
}

export async function fetchExerciseHistory(exerciseId: string): Promise<ExerciseSession[]> {
  const { data, error } = await supabase.rpc('exercise_history', { p_exercise_id: exerciseId });
  if (error) throw error;
  return data;
}

export async function fetchExercisePrs(exerciseId: string): Promise<ExercisePr[]> {
  const { data, error } = await supabase.rpc('exercise_prs', { p_exercise_id: exerciseId });
  if (error) throw error;
  return data;
}

// ---------- Workouts ----------

/** Whole-workout snapshot write; idempotent, and stale revisions are ignored server-side. */
export async function saveWorkout({ draft }: SaveWorkoutVars): Promise<void> {
  const { error } = await supabase.rpc('save_workout', { p_workout: toSnapshot(draft) });
  if (error) throw error;
}

export async function deleteWorkout({ workoutId }: DeleteWorkoutVars): Promise<void> {
  // Exercises and sets cascade.
  const { error } = await supabase.from('workouts').delete().eq('id', workoutId);
  if (error) throw error;
}

export async function fetchWorkoutHistory(): Promise<WorkoutSummaryRow[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select(
      'id, name, started_at, ended_at, workout_exercises(exercise_id, workout_sets(weight_kg, reps, is_completed, is_warmup))',
    )
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

export async function fetchWorkout(workoutId: string): Promise<WorkoutDraft> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*, workout_exercises(*, workout_sets(*))')
    .eq('id', workoutId)
    .single();
  if (error) throw error;

  const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;
  return {
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    started_at: data.started_at,
    ended_at: data.ended_at,
    notes: data.notes,
    template_id: data.template_id,
    revision: data.revision,
    exercises: [...data.workout_exercises].sort(byPosition).map((e) => ({
      id: e.id,
      exercise_id: e.exercise_id,
      notes: e.notes,
      sets: [...e.workout_sets].sort(byPosition).map((s) => ({
        id: s.id,
        weight_kg: s.weight_kg,
        reps: s.reps,
        duration_seconds: s.duration_seconds,
        distance_m: s.distance_m,
        is_warmup: s.is_warmup,
        is_completed: s.is_completed,
        completed_at: s.completed_at,
      })),
    })),
  };
}

export async function fetchWorkoutPrs(workoutId: string): Promise<WorkoutPr[]> {
  const { data, error } = await supabase.rpc('workout_prs', { p_workout_id: workoutId });
  if (error) throw error;
  return data;
}

// ---------- Templates ----------

export async function fetchTemplates(): Promise<Template[]> {
  const { data, error } = await supabase
    .from('workout_templates')
    .select('*, template_exercises(*)')
    .order('name');
  if (error) throw error;
  return data.map((t) => ({
    ...t,
    template_exercises: [...t.template_exercises].sort((a, b) => a.position - b.position),
  }));
}

/** Creates a template with its exercises; ids are client-generated, so replays are no-ops. */
export async function saveTemplate({ template }: SaveTemplateVars): Promise<void> {
  const { template_exercises, created_at: _c, updated_at: _u, ...row } = template;
  const { error } = await supabase
    .from('workout_templates')
    .upsert(row, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;

  const exercises: TablesInsert<'template_exercises'>[] = template_exercises.map(
    ({ created_at: _ec, ...e }) => e,
  );
  const { error: exerciseError } = await supabase
    .from('template_exercises')
    .upsert(exercises, { onConflict: 'id', ignoreDuplicates: true });
  if (exerciseError) throw exerciseError;
}

export async function deleteTemplate({ template }: DeleteTemplateVars): Promise<void> {
  // Template exercises cascade; past workouts keep their data (template_id is set null).
  const { error } = await supabase.from('workout_templates').delete().eq('id', template.id);
  if (error) throw error;
}
