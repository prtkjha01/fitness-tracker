import type { QueryClient } from '@tanstack/react-query';

import { invalidateWhenIdle } from '@/lib/optimistic';
import { mk, qk } from '@/lib/query-keys';

import {
  deleteBodyWeight,
  saveBodyWeight,
  type BodyWeight,
  type DeleteBodyWeightVars,
  type SaveBodyWeightVars,
} from './api';

const scope = { id: 'body-weight' };
const retry = 3;

const byDay = (a: BodyWeight, b: BodyWeight) => a.measured_on.localeCompare(b.measured_on);
// Entries are unique per day, so the day (not the id) identifies them in the cache.
const withoutDay = (list: BodyWeight[] | undefined, day: string) =>
  (list ?? []).filter((e) => e.measured_on !== day);

/** See registerWaterMutations for why these are registered at startup. */
export function registerProgressMutations(queryClient: QueryClient) {
  const set = (userId: string, update: (list: BodyWeight[] | undefined) => BodyWeight[]) =>
    queryClient.setQueryData<BodyWeight[]>(qk.progress.bodyWeights(userId), update);
  const settle = (userId: string) =>
    invalidateWhenIdle(queryClient, ['body-weight'], qk.progress.bodyWeights(userId));

  queryClient.setMutationDefaults<void, Error, SaveBodyWeightVars>(mk.progress.saveBodyWeight, {
    mutationFn: saveBodyWeight,
    scope,
    retry,
    onMutate: async ({ entry }) => {
      await queryClient.cancelQueries({ queryKey: qk.progress.bodyWeights(entry.user_id) });
      set(entry.user_id, (list) => [...withoutDay(list, entry.measured_on), entry].sort(byDay));
    },
    onError: (_error, { entry, previous }) =>
      set(entry.user_id, (list) =>
        previous
          ? [...withoutDay(list, entry.measured_on), previous].sort(byDay)
          : withoutDay(list, entry.measured_on),
      ),
    onSettled: (_data, _error, { entry }) => settle(entry.user_id),
  });

  queryClient.setMutationDefaults<void, Error, DeleteBodyWeightVars>(mk.progress.deleteBodyWeight, {
    mutationFn: deleteBodyWeight,
    scope,
    retry,
    onMutate: async ({ entry }) => {
      await queryClient.cancelQueries({ queryKey: qk.progress.bodyWeights(entry.user_id) });
      set(entry.user_id, (list) => withoutDay(list, entry.measured_on));
    },
    onError: (_error, { entry }) =>
      set(entry.user_id, (list) => [...withoutDay(list, entry.measured_on), entry].sort(byDay)),
    onSettled: (_data, _error, { entry }) => settle(entry.user_id),
  });
}
