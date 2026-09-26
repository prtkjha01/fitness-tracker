import { supabase } from '@/lib/supabase';
import type { Database, Enums, Tables } from '@/types/database.types';

export type MealType = Enums<'meal_type'>;
export type FoodEntry = Tables<'food_entries'>;
export type SavedFood = Tables<'saved_foods'>;
export type RecentFood = Database['public']['Functions']['recent_foods']['Returns'][number];

/** `previous` is the row before an edit (null for a new entry), for rollback. */
export type SaveEntryVars = { entry: FoodEntry; previous: FoodEntry | null };
export type DeleteEntryVars = { entry: FoodEntry };
export type SaveFoodVars = { food: SavedFood; previous: SavedFood | null };
export type DeleteFoodVars = { food: SavedFood };

export async function fetchDayFoodEntries(date: string): Promise<FoodEntry[]> {
  const { data, error } = await supabase
    .from('food_entries')
    .select('*')
    .eq('logged_on', date)
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function fetchSavedFoods(): Promise<SavedFood[]> {
  const { data, error } = await supabase.from('saved_foods').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function fetchRecentFoods(): Promise<RecentFood[]> {
  const { data, error } = await supabase.rpc('recent_foods', { p_limit: 20 });
  if (error) throw error;
  return data;
}

/** Insert or edit. Keyed on the client-generated id, so a replayed write is harmless. */
export async function saveFoodEntry({ entry }: SaveEntryVars): Promise<void> {
  const { updated_at: _updatedAt, ...row } = entry;
  const { error } = await supabase.from('food_entries').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteFoodEntry({ entry }: DeleteEntryVars): Promise<void> {
  const { error } = await supabase.from('food_entries').delete().eq('id', entry.id);
  if (error) throw error;
}

export async function saveSavedFood({ food }: SaveFoodVars): Promise<void> {
  // use_count / last_used_at are maintained by a trigger; never overwrite them from here.
  const { id, user_id, name, default_quantity, default_unit, calories, protein_g, carbs_g, fat_g } =
    food;
  const { error } = await supabase
    .from('saved_foods')
    .upsert(
      { id, user_id, name, default_quantity, default_unit, calories, protein_g, carbs_g, fat_g },
      { onConflict: 'id' },
    );
  if (error) throw error;
}

export async function deleteSavedFood({ food }: DeleteFoodVars): Promise<void> {
  // Entries logged from it keep their values; their saved_food_id is set to null.
  const { error } = await supabase.from('saved_foods').delete().eq('id', food.id);
  if (error) throw error;
}

/** Online only: copies server-side rows, so there's nothing sensible to queue. */
export async function copyFoodEntries(args: {
  from: string;
  to: string;
  meal: MealType | null;
}): Promise<number> {
  const { data, error } = await supabase.rpc('copy_food_entries', {
    p_from: args.from,
    p_to: args.to,
    p_meal_type: args.meal ?? undefined,
  });
  if (error) throw error;
  return data;
}
