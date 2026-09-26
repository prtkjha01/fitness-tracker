import {
  onlineManager,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';

import { useSession } from '@/features/auth/session-provider';
import { localDate } from '@/lib/dates';
import { enqueue } from '@/lib/optimistic';
import { mk, qk } from '@/lib/query-keys';
import { newId } from '@/lib/uuid';

import { updaterFor, useActiveWorkout, type EditorTarget } from './active-workout-store';
import {
  fetchExerciseHistory,
  fetchExercisePrs,
  fetchExercises,
  fetchLastPerformance,
  fetchTemplates,
  fetchWorkout,
  fetchWorkoutHistory,
  fetchWorkoutPrs,
  type ArchiveExerciseVars,
  type CreateExerciseVars,
  type DeleteTemplateVars,
  type DeleteWorkoutVars,
  type Exercise,
  type SaveTemplateVars,
  type SaveWorkoutVars,
  type Template,
} from './api';
import { buildExercise, edit, newDraft, type SetValues, type WorkoutDraft } from './draft';
import { cancelRestNotification } from './rest-timer';
import { pruneQueuedSaves, queueSave } from './sync-queue';
import { lineFromDraft, lineFromRow } from './workout-line';

function useUserId() {
  return useSession().session?.user.id;
}

// ---------- Exercises ----------

export function useExercises() {
  const userId = useUserId();
  return useQuery({
    queryKey: qk.workouts.exercises(userId ?? ''),
    queryFn: fetchExercises,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/** id → exercise, for showing names inside workouts (includes archived ones). */
export function useExerciseMap(): Map<string, Exercise> {
  const { data } = useExercises();
  return new Map((data ?? []).map((e) => [e.id, e]));
}

export function useCreateExercise() {
  const userId = useUserId();
  const mutation = useMutation<void, Error, CreateExerciseVars>({
    mutationKey: mk.workouts.createExercise,
  });
  const create = (
    fields: Pick<Exercise, 'name' | 'category' | 'muscle_group' | 'equipment' | 'tracking_type'>,
  ): string | null => {
    if (!userId) return null;
    const now = new Date().toISOString();
    const exercise: Exercise = {
      ...fields,
      id: newId(),
      user_id: userId,
      is_archived: false,
      created_at: now,
      updated_at: now,
    };
    mutation.mutate({ exercise });
    return exercise.id;
  };
  return { create, error: mutation.error };
}

export function useArchiveExercise() {
  const mutation = useMutation<void, Error, ArchiveExerciseVars>({
    mutationKey: mk.workouts.archiveExercise,
  });
  return {
    setArchived: (exercise: Exercise, archived: boolean) => mutation.mutate({ exercise, archived }),
    error: mutation.error,
  };
}

// ---------- Last performance ("previous: 60 kg × 8") ----------

/** Last session's sets per exercise id, for the "previous" column. */
export function useLastPerformance(exerciseIds: string[]): Map<string, SetValues[]> {
  const userId = useUserId() ?? '';
  const results = useQueries({
    queries: exerciseIds.map((id) => ({
      queryKey: qk.workouts.lastPerformance(userId, id),
      queryFn: () => fetchLastPerformance(id),
      enabled: !!userId,
      staleTime: 10 * 60 * 1000,
    })),
  });
  return new Map(exerciseIds.map((id, i) => [id, results[i]?.data ?? []]));
}

/** Cached last performance, fetching it if we're online; offline and uncached → none. */
async function loadLastPerformance(
  queryClient: QueryClient,
  userId: string,
  exerciseId: string,
): Promise<SetValues[]> {
  const key = qk.workouts.lastPerformance(userId, exerciseId);
  const cached = queryClient.getQueryData<SetValues[]>(key);
  if (cached) return cached;
  if (!onlineManager.isOnline()) return [];
  try {
    return await queryClient.fetchQuery({
      queryKey: key,
      queryFn: () => fetchLastPerformance(exerciseId),
    });
  } catch {
    return [];
  }
}

/** Adds exercises to the active or edited workout, pre-filled from their last session. */
export function useAddExercises(target: EditorTarget) {
  const queryClient = useQueryClient();
  const userId = useUserId();
  return async (exerciseIds: string[]) => {
    if (!userId) return;
    const exercises = await Promise.all(
      exerciseIds.map(async (id) => {
        if (target === 'active') {
          return buildExercise(id, await loadLastPerformance(queryClient, userId, id));
        }
        // Adding to a finished workout: one set, already done, filled in by hand.
        const exercise = buildExercise(id, []);
        const completedAt = new Date().toISOString();
        return {
          ...exercise,
          sets: exercise.sets.map((s) => ({ ...s, is_completed: true, completed_at: completedAt })),
        };
      }),
    );
    updaterFor(target)((d) => edit.addExercises(d, exercises));
  };
}

// ---------- Active workout lifecycle ----------

export function useStartWorkout() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return async (template?: Template) => {
    if (!userId || useActiveWorkout.getState().workout) return;
    const exercises = template
      ? await Promise.all(
          template.template_exercises.map(async (te) =>
            buildExercise(
              te.exercise_id,
              await loadLastPerformance(queryClient, userId, te.exercise_id),
              {
                sets: te.target_sets,
                reps: te.target_reps,
              },
            ),
          ),
        )
      : [];
    useActiveWorkout.getState().start(
      newDraft({
        userId,
        name: template?.name ?? 'Workout',
        templateId: template?.id,
        exercises,
      }),
    );
  };
}

/**
 * Mounted once in the signed-in layout. Every change to the active workout bumps its
 * revision; ~1.5 s after the last change the whole snapshot is queued for the server.
 * Offline, the queue holds it (and survives restarts) until the connection returns.
 */
export function useWorkoutSync() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  const workout = useActiveWorkout((s) => s.workout);
  const queuedRevision = useActiveWorkout((s) => s.queuedRevision);
  const hydrated = useActiveWorkout((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated || !workout || !userId) return;
    // Belongs to someone else (shouldn't survive sign-out, but never sync it as this user).
    if (workout.user_id !== userId) {
      useActiveWorkout.getState().reset();
      return;
    }
    if (workout.revision <= queuedRevision) return;
    const timer = setTimeout(() => {
      queueSave(queryClient, workout);
      useActiveWorkout.getState().markQueued(workout.revision);
    }, 1500);
    return () => clearTimeout(timer);
  }, [hydrated, workout, queuedRevision, userId, queryClient]);
}

export function useFinishWorkout() {
  const queryClient = useQueryClient();
  return (): WorkoutDraft | null => {
    cancelRestNotification();
    const finished = useActiveWorkout.getState().finish();
    if (finished) queueSave(queryClient, finished);
    return finished;
  };
}

export function useDiscardWorkout() {
  const queryClient = useQueryClient();
  return () => {
    const { workout, queuedRevision } = useActiveWorkout.getState();
    cancelRestNotification();
    useActiveWorkout.getState().discard();
    if (!workout) return;
    pruneQueuedSaves(queryClient, workout.id);
    // If a snapshot may have reached the server, delete it there too (queued after it).
    if (queuedRevision > 0) {
      enqueue<DeleteWorkoutVars>(queryClient, mk.workouts.delete, {
        userId: workout.user_id,
        workoutId: workout.id,
      });
    }
  };
}

// ---------- History ----------

export function useWorkoutHistory() {
  const userId = useUserId();
  return useQuery({
    queryKey: qk.workouts.history(userId ?? ''),
    queryFn: fetchWorkoutHistory,
    enabled: !!userId,
  });
}

export function useWorkout(workoutId: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: qk.workouts.detail(userId ?? '', workoutId ?? ''),
    queryFn: () => fetchWorkout(workoutId!),
    enabled: !!userId && !!workoutId,
  });
}

export function useWorkoutPrs(workoutId: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: qk.workouts.prs(userId ?? '', workoutId ?? ''),
    queryFn: () => fetchWorkoutPrs(workoutId!),
    enabled: !!userId && !!workoutId,
  });
}

/** Saves an edited finished workout (one revision past the server's copy). */
export function useSaveEditedWorkout() {
  const queryClient = useQueryClient();
  return (draft: WorkoutDraft, serverRevision: number) =>
    enqueue<SaveWorkoutVars>(queryClient, mk.workouts.save, {
      draft: { ...draft, revision: Math.max(draft.revision, serverRevision) + 1 },
    });
}

export function useDeleteWorkout() {
  const userId = useUserId();
  const mutation = useMutation<void, Error, DeleteWorkoutVars>({ mutationKey: mk.workouts.delete });
  return {
    remove: (workoutId: string) => {
      if (!userId) return;
      useActiveWorkout.getState().forgetFinished(workoutId);
      mutation.mutate({ userId, workoutId });
    },
    error: mutation.error,
  };
}

// ---------- Exercise progress ----------

export function useExerciseHistory(exerciseId: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: qk.workouts.exerciseHistory(userId ?? '', exerciseId ?? ''),
    queryFn: () => fetchExerciseHistory(exerciseId!),
    enabled: !!userId && !!exerciseId,
  });
}

export function useExercisePrs(exerciseId: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: qk.workouts.exercisePrs(userId ?? '', exerciseId ?? ''),
    queryFn: () => fetchExercisePrs(exerciseId!),
    enabled: !!userId && !!exerciseId,
  });
}

// ---------- Templates ----------

export function useTemplates() {
  const userId = useUserId();
  return useQuery({
    queryKey: qk.workouts.templates(userId ?? ''),
    queryFn: fetchTemplates,
    enabled: !!userId,
  });
}

/** Turns a finished workout into a template: its exercises, working-set counts and top reps. */
export function useSaveAsTemplate() {
  const mutation = useMutation<void, Error, SaveTemplateVars>({
    mutationKey: mk.workouts.saveTemplate,
  });
  const save = (workout: WorkoutDraft, name: string): string => {
    const now = new Date().toISOString();
    const templateId = newId();
    const template: Template = {
      id: templateId,
      user_id: workout.user_id,
      name,
      notes: null,
      created_at: now,
      updated_at: now,
      template_exercises: workout.exercises.map((e, position) => {
        const working = e.sets.filter((s) => !s.is_warmup);
        const reps = working.map((s) => s.reps).filter((r): r is number => r !== null && r > 0);
        return {
          id: newId(),
          user_id: workout.user_id,
          template_id: templateId,
          exercise_id: e.exercise_id,
          position,
          target_sets: working.length > 0 ? Math.min(working.length, 20) : null,
          target_reps: reps.length > 0 ? Math.min(Math.max(...reps), 100) : null,
          notes: null,
          created_at: now,
        };
      }),
    };
    mutation.mutate({ template });
    return templateId;
  };
  return { save, error: mutation.error, isSuccess: mutation.isSuccess };
}

export function useDeleteTemplate() {
  const mutation = useMutation<void, Error, DeleteTemplateVars>({
    mutationKey: mk.workouts.deleteTemplate,
  });
  return { remove: (template: Template) => mutation.mutate({ template }), error: mutation.error };
}

/**
 * Workouts started today (user's timezone), newest first. Includes a just-finished workout
 * that hasn't synced yet, so "done" shows immediately even offline.
 */
export function useTodayWorkouts(today: string | undefined, timezone: string | undefined) {
  const history = useWorkoutHistory();
  const lastFinished = useActiveWorkout((s) => s.lastFinished);
  const isToday = (iso: string) => !!timezone && localDate(timezone, new Date(iso)) === today;

  const synced = (history.data ?? []).filter((w) => isToday(w.started_at)).map(lineFromRow);
  const pending =
    lastFinished &&
    isToday(lastFinished.started_at) &&
    !synced.some((l) => l.id === lastFinished.id)
      ? [{ ...lineFromDraft(lastFinished), unsynced: true }]
      : [];
  return { history, done: [...pending, ...synced.map((l) => ({ ...l, unsynced: false }))] };
}
