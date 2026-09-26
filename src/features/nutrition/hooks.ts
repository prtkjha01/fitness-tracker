import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/session-provider';
import { mk, qk } from '@/lib/query-keys';
import { newId } from '@/lib/uuid';

import {
  copyFoodEntries,
  fetchDayFoodEntries,
  fetchRecentFoods,
  fetchSavedFoods,
  type DeleteEntryVars,
  type DeleteFoodVars,
  type FoodEntry,
  type SaveEntryVars,
  type SavedFood,
  type SaveFoodVars,
} from './api';

/** What the entry form edits; ids, owner, day and timestamps are filled in here. */
export type EntryFields = Pick<
  FoodEntry,
  | 'meal_type'
  | 'name'
  | 'quantity'
  | 'unit'
  | 'calories'
  | 'protein_g'
  | 'carbs_g'
  | 'fat_g'
  | 'saved_food_id'
>;

export type FoodFields = Pick<
  SavedFood,
  'name' | 'default_quantity' | 'default_unit' | 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'
>;

function useUserId() {
  return useSession().session?.user.id;
}

export function useDayFoodEntries(date: string | undefined) {
  const userId = useUserId();
  const query = useQuery({
    queryKey: qk.nutrition.day(userId ?? '', date ?? ''),
    queryFn: () => fetchDayFoodEntries(date!),
    enabled: !!userId && !!date,
  });
  // Offline with nothing cached for that day: start empty so logging still works.
  const entries = query.data ?? (query.isPaused ? [] : undefined);
  return { query, entries };
}

export function useSavedFoods() {
  const userId = useUserId();
  return useQuery({
    queryKey: qk.nutrition.savedFoods(userId ?? ''),
    queryFn: fetchSavedFoods,
    enabled: !!userId,
  });
}

export function useRecentFoods() {
  const userId = useUserId();
  return useQuery({
    queryKey: qk.nutrition.recentFoods(userId ?? ''),
    queryFn: fetchRecentFoods,
    enabled: !!userId,
  });
}

/** Log or edit food entries instantly; offline, writes queue and survive a restart. */
export function useSaveFoodEntry() {
  const userId = useUserId();
  const mutation = useMutation<void, Error, SaveEntryVars>({
    mutationKey: mk.nutrition.saveEntry,
  });

  const log = (date: string, fields: EntryFields) => {
    if (!userId) return;
    const now = new Date().toISOString();
    mutation.mutate({
      entry: {
        ...fields,
        id: newId(),
        user_id: userId,
        logged_on: date,
        created_at: now,
        updated_at: now,
      },
      previous: null,
    });
  };

  const update = (previous: FoodEntry, fields: EntryFields) =>
    mutation.mutate({
      entry: { ...previous, ...fields, updated_at: new Date().toISOString() },
      previous,
    });

  /** Put back a deleted entry with its original id and timestamps (undo). */
  const restore = (entry: FoodEntry) => mutation.mutate({ entry, previous: null });

  return { log, update, restore, error: mutation.error, reset: mutation.reset };
}

export function useDeleteFoodEntry() {
  const mutation = useMutation<void, Error, DeleteEntryVars>({
    mutationKey: mk.nutrition.deleteEntry,
  });
  return { remove: (entry: FoodEntry) => mutation.mutate({ entry }), error: mutation.error };
}

export function useSaveFood() {
  const userId = useUserId();
  const mutation = useMutation<void, Error, SaveFoodVars>({ mutationKey: mk.nutrition.saveFood });

  /** Creates a saved food, or overwrites `existing`. Returns its id to link entries to. */
  const save = (fields: FoodFields, existing: SavedFood | null): string | null => {
    if (!userId) return null;
    const now = new Date().toISOString();
    const food: SavedFood = existing
      ? { ...existing, ...fields, updated_at: now }
      : {
          ...fields,
          id: newId(),
          user_id: userId,
          last_used_at: null,
          use_count: 0,
          created_at: now,
          updated_at: now,
        };
    mutation.mutate({ food, previous: existing });
    return food.id;
  };

  return { save, error: mutation.error };
}

export function useDeleteFood() {
  const mutation = useMutation<void, Error, DeleteFoodVars>({
    mutationKey: mk.nutrition.deleteFood,
  });
  return { remove: (food: SavedFood) => mutation.mutate({ food }), error: mutation.error };
}

/** Copy a meal (or a whole day) onto another day. Needs a connection; never queued. */
export function useCopyFoodEntries() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  return useMutation({
    networkMode: 'always',
    mutationFn: copyFoodEntries,
    onSuccess: (_count, { to }) =>
      queryClient.invalidateQueries({ queryKey: qk.nutrition.day(userId ?? '', to) }),
  });
}
