import type { QueryClient } from '@tanstack/react-query';

import { invalidateWhenIdle, removeById, upsertById } from '@/lib/optimistic';
import { mk, qk } from '@/lib/query-keys';

import {
  archiveExercise,
  createExercise,
  deleteTemplate,
  deleteWorkout,
  saveTemplate,
  saveWorkout,
  type ArchiveExerciseVars,
  type CreateExerciseVars,
  type DeleteTemplateVars,
  type DeleteWorkoutVars,
  type Exercise,
  type SaveTemplateVars,
  type SaveWorkoutVars,
  type Template,
  type WorkoutSummaryRow,
} from './api';
import type { WorkoutDraft } from './draft';

// One queue for every workout write: a custom exercise must exist before a workout
// references it, and a discard must not be overtaken by an older save of that workout.
const scope = { id: 'workouts' };
const retry = 3;

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);

/** See registerWaterMutations for why these are registered at startup. */
export function registerWorkoutMutations(queryClient: QueryClient) {
  const settle = (userId: string) =>
    invalidateWhenIdle(queryClient, ['workouts'], qk.workouts.all(userId));

  queryClient.setMutationDefaults<void, Error, SaveWorkoutVars>(mk.workouts.save, {
    mutationFn: saveWorkout,
    scope,
    retry,
    onMutate: async ({ draft }) => {
      // Edits to finished workouts show immediately in their detail view.
      if (!draft.ended_at) return;
      const key = qk.workouts.detail(draft.user_id, draft.id);
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData<WorkoutDraft>(key, draft);
    },
    onSettled: (_data, _error, { draft }) => {
      // In-progress saves fire every few seconds; only refresh lists once it's finished.
      if (draft.ended_at) return settle(draft.user_id);
    },
  });

  queryClient.setMutationDefaults<void, Error, DeleteWorkoutVars>(mk.workouts.delete, {
    mutationFn: deleteWorkout,
    scope,
    retry,
    onMutate: async ({ userId, workoutId }) => {
      await queryClient.cancelQueries({ queryKey: qk.workouts.history(userId) });
      queryClient.setQueryData<WorkoutSummaryRow[]>(qk.workouts.history(userId), (list) =>
        removeById(list, workoutId),
      );
    },
    // No rollback: the refetch in settle restores the row if the delete failed.
    onSettled: (_data, _error, { userId }) => settle(userId),
  });

  queryClient.setMutationDefaults<void, Error, CreateExerciseVars>(mk.workouts.createExercise, {
    mutationFn: createExercise,
    scope,
    retry,
    onMutate: async ({ exercise }) => {
      const key = qk.workouts.exercises(exercise.user_id!);
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData<Exercise[]>(key, (list) => upsertById(list, exercise, byName));
    },
    onError: (_error, { exercise }) =>
      queryClient.setQueryData<Exercise[]>(qk.workouts.exercises(exercise.user_id!), (list) =>
        removeById(list, exercise.id),
      ),
    onSettled: (_data, _error, { exercise }) => settle(exercise.user_id!),
  });

  queryClient.setMutationDefaults<void, Error, ArchiveExerciseVars>(mk.workouts.archiveExercise, {
    mutationFn: archiveExercise,
    scope,
    retry,
    onMutate: async ({ exercise, archived }) => {
      const key = qk.workouts.exercises(exercise.user_id!);
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData<Exercise[]>(key, (list) =>
        upsertById(list, { ...exercise, is_archived: archived }, byName),
      );
    },
    onError: (_error, { exercise }) =>
      queryClient.setQueryData<Exercise[]>(qk.workouts.exercises(exercise.user_id!), (list) =>
        upsertById(list, exercise, byName),
      ),
    onSettled: (_data, _error, { exercise }) => settle(exercise.user_id!),
  });

  queryClient.setMutationDefaults<void, Error, SaveTemplateVars>(mk.workouts.saveTemplate, {
    mutationFn: saveTemplate,
    scope,
    retry,
    onMutate: async ({ template }) => {
      const key = qk.workouts.templates(template.user_id);
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData<Template[]>(key, (list) => upsertById(list, template, byName));
    },
    onError: (_error, { template }) =>
      queryClient.setQueryData<Template[]>(qk.workouts.templates(template.user_id), (list) =>
        removeById(list, template.id),
      ),
    onSettled: (_data, _error, { template }) => settle(template.user_id),
  });

  queryClient.setMutationDefaults<void, Error, DeleteTemplateVars>(mk.workouts.deleteTemplate, {
    mutationFn: deleteTemplate,
    scope,
    retry,
    onMutate: async ({ template }) => {
      const key = qk.workouts.templates(template.user_id);
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData<Template[]>(key, (list) => removeById(list, template.id));
    },
    onError: (_error, { template }) =>
      queryClient.setQueryData<Template[]>(qk.workouts.templates(template.user_id), (list) =>
        upsertById(list, template, byName),
      ),
    onSettled: (_data, _error, { template }) => settle(template.user_id),
  });
}
