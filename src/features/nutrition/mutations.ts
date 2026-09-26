import type { QueryClient } from '@tanstack/react-query';

import { invalidateWhenIdle, removeById, upsertById } from '@/lib/optimistic';
import { mk, qk } from '@/lib/query-keys';

import {
  deleteFoodEntry,
  deleteSavedFood,
  saveFoodEntry,
  saveSavedFood,
  type DeleteEntryVars,
  type DeleteFoodVars,
  type FoodEntry,
  type SaveEntryVars,
  type SavedFood,
  type SaveFoodVars,
} from './api';

const byCreatedAt = (a: FoodEntry, b: FoodEntry) => a.created_at.localeCompare(b.created_at);
const byName = (a: SavedFood, b: SavedFood) => a.name.localeCompare(b.name);

// One scope for all nutrition writes: a new saved food must reach the server before
// the entry that references it, and edits/deletes must follow the insert they touch.
const scope = { id: 'nutrition' };
const retry = 3;

/** See registerWaterMutations for why these are registered at startup. */
export function registerNutritionMutations(queryClient: QueryClient) {
  const setDay = (entry: FoodEntry, update: (list: FoodEntry[] | undefined) => FoodEntry[]) =>
    queryClient.setQueryData<FoodEntry[]>(qk.nutrition.day(entry.user_id, entry.logged_on), update);
  const setSaved = (food: SavedFood, update: (list: SavedFood[] | undefined) => SavedFood[]) =>
    queryClient.setQueryData<SavedFood[]>(qk.nutrition.savedFoods(food.user_id), update);
  // Refreshes days, saved foods (use counts) and recent foods together.
  const settle = (userId: string) =>
    invalidateWhenIdle(queryClient, ['nutrition'], qk.nutrition.all(userId));

  queryClient.setMutationDefaults<void, Error, SaveEntryVars>(mk.nutrition.saveEntry, {
    mutationFn: saveFoodEntry,
    scope,
    retry,
    onMutate: async ({ entry }) => {
      await queryClient.cancelQueries({
        queryKey: qk.nutrition.day(entry.user_id, entry.logged_on),
      });
      setDay(entry, (list) => upsertById(list, entry, byCreatedAt));
    },
    onError: (_error, { entry, previous }) =>
      setDay(entry, (list) =>
        previous ? upsertById(list, previous, byCreatedAt) : removeById(list, entry.id),
      ),
    onSettled: (_data, _error, { entry }) => settle(entry.user_id),
  });

  queryClient.setMutationDefaults<void, Error, DeleteEntryVars>(mk.nutrition.deleteEntry, {
    mutationFn: deleteFoodEntry,
    scope,
    retry,
    onMutate: async ({ entry }) => {
      await queryClient.cancelQueries({
        queryKey: qk.nutrition.day(entry.user_id, entry.logged_on),
      });
      setDay(entry, (list) => removeById(list, entry.id));
    },
    onError: (_error, { entry }) => setDay(entry, (list) => upsertById(list, entry, byCreatedAt)),
    onSettled: (_data, _error, { entry }) => settle(entry.user_id),
  });

  queryClient.setMutationDefaults<void, Error, SaveFoodVars>(mk.nutrition.saveFood, {
    mutationFn: saveSavedFood,
    scope,
    retry,
    onMutate: async ({ food }) => {
      await queryClient.cancelQueries({ queryKey: qk.nutrition.savedFoods(food.user_id) });
      setSaved(food, (list) => upsertById(list, food, byName));
    },
    onError: (_error, { food, previous }) =>
      setSaved(food, (list) =>
        previous ? upsertById(list, previous, byName) : removeById(list, food.id),
      ),
    onSettled: (_data, _error, { food }) => settle(food.user_id),
  });

  queryClient.setMutationDefaults<void, Error, DeleteFoodVars>(mk.nutrition.deleteFood, {
    mutationFn: deleteSavedFood,
    scope,
    retry,
    onMutate: async ({ food }) => {
      await queryClient.cancelQueries({ queryKey: qk.nutrition.savedFoods(food.user_id) });
      setSaved(food, (list) => removeById(list, food.id));
    },
    onError: (_error, { food }) => setSaved(food, (list) => upsertById(list, food, byName)),
    onSettled: (_data, _error, { food }) => settle(food.user_id),
  });
}
