import { supabase } from '@/lib/supabase';
import type { Database, Tables } from '@/types/database.types';

export type BodyWeight = Tables<'body_weights'>;
export type WorkoutDay = Database['public']['Functions']['workout_days']['Returns'][number];
export type WeeklySummary = Database['public']['Functions']['weekly_summaries']['Returns'][number];

/** One entry per day; re-logging a day replaces it. `previous` is that day's old entry. */
export type SaveBodyWeightVars = { entry: BodyWeight; previous: BodyWeight | null };
export type DeleteBodyWeightVars = { entry: BodyWeight };

export async function fetchBodyWeights(): Promise<BodyWeight[]> {
  const { data, error } = await supabase
    .from('body_weights')
    .select('*')
    .order('measured_on')
    .limit(2000);
  if (error) throw error;
  return data;
}

export async function saveBodyWeight({ entry }: SaveBodyWeightVars): Promise<void> {
  // Keyed on (user, day) rather than id, so logging a day twice (even from two
  // queued offline writes) updates that day's row.
  const { error } = await supabase
    .from('body_weights')
    .upsert(
      { user_id: entry.user_id, measured_on: entry.measured_on, weight_kg: entry.weight_kg },
      { onConflict: 'user_id,measured_on' },
    );
  if (error) throw error;
}

export async function deleteBodyWeight({ entry }: DeleteBodyWeightVars): Promise<void> {
  const { error } = await supabase
    .from('body_weights')
    .delete()
    .eq('measured_on', entry.measured_on);
  if (error) throw error;
}

/** Finished workouts per local day (user's timezone), for the calendar and streaks. */
export async function fetchWorkoutDays(from: string, to: string): Promise<WorkoutDay[]> {
  const { data, error } = await supabase.rpc('workout_days', { p_from: from, p_to: to });
  if (error) throw error;
  return data;
}

/** Monday-start weeks: workouts completed, average calories and water on logged days. */
export async function fetchWeeklySummaries(from: string, to: string): Promise<WeeklySummary[]> {
  const { data, error } = await supabase.rpc('weekly_summaries', { p_from: from, p_to: to });
  if (error) throw error;
  return data;
}
