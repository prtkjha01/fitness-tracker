import { useMutation, useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/session-provider';
import { shiftDate } from '@/lib/dates';
import { mk, qk } from '@/lib/query-keys';
import { newId } from '@/lib/uuid';

import {
  fetchBodyWeights,
  fetchWeeklySummaries,
  fetchWorkoutDays,
  type BodyWeight,
  type DeleteBodyWeightVars,
  type SaveBodyWeightVars,
} from './api';
import { weekStart } from './streak';

function useUserId() {
  return useSession().session?.user.id;
}

/** How far back the calendar and streak look. */
export const HISTORY_DAYS = 365;
/** Weeks shown in the weekly summary. */
export const SUMMARY_WEEKS = 8;

/** Workouts per day over the last year, as a map for the calendar and streak. */
export function useWorkoutDays(today: string | undefined) {
  const userId = useUserId();
  const from = today ? shiftDate(today, -HISTORY_DAYS) : '';
  const query = useQuery({
    queryKey: qk.progress.workoutDays(userId ?? '', from, today ?? ''),
    queryFn: () => fetchWorkoutDays(from, today!),
    enabled: !!userId && !!today,
  });
  const days = query.data ? new Map(query.data.map((d) => [d.day, d.workout_count])) : undefined;
  return { query, days };
}

export function useWeeklySummaries(today: string | undefined) {
  const userId = useUserId();
  const from = today ? shiftDate(weekStart(today), -7 * (SUMMARY_WEEKS - 1)) : '';
  return useQuery({
    queryKey: qk.progress.weekly(userId ?? '', from, today ?? ''),
    queryFn: () => fetchWeeklySummaries(from, today!),
    enabled: !!userId && !!today,
  });
}

export function useBodyWeights() {
  const userId = useUserId();
  return useQuery({
    queryKey: qk.progress.bodyWeights(userId ?? ''),
    queryFn: fetchBodyWeights,
    enabled: !!userId,
  });
}

/** Log (or replace) a day's weight instantly; queued offline like every other log. */
export function useSaveBodyWeight() {
  const userId = useUserId();
  const mutation = useMutation<void, Error, SaveBodyWeightVars>({
    mutationKey: mk.progress.saveBodyWeight,
  });
  const save = (day: string, weightKg: number, previous: BodyWeight | null) => {
    if (!userId) return;
    const now = new Date().toISOString();
    mutation.mutate({
      entry: {
        id: previous?.id ?? newId(),
        user_id: userId,
        measured_on: day,
        weight_kg: weightKg,
        created_at: previous?.created_at ?? now,
        updated_at: now,
      },
      previous,
    });
  };
  return { save, error: mutation.error };
}

export function useDeleteBodyWeight() {
  const mutation = useMutation<void, Error, DeleteBodyWeightVars>({
    mutationKey: mk.progress.deleteBodyWeight,
  });
  return { remove: (entry: BodyWeight) => mutation.mutate({ entry }), error: mutation.error };
}
