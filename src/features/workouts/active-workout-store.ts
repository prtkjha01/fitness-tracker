import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { finalize, type WorkoutDraft } from './draft';

export type RestTimer = {
  /** ISO instant the rest ends; the countdown is derived from this, so it survives kills. */
  endsAt: string;
  totalSeconds: number;
  notificationId: string | null;
};

type ActiveWorkoutState = {
  /** The in-progress workout, or null. This store (not the server) is its source of truth. */
  workout: WorkoutDraft | null;
  /** Highest revision handed to the sync queue, so a restart doesn't resend it. */
  queuedRevision: number;
  rest: RestTimer | null;
  /** The workout just finished, for the summary screen (works before it has synced). */
  lastFinished: WorkoutDraft | null;
  hydrated: boolean;

  start: (workout: WorkoutDraft) => void;
  /** Applies a pure edit from draft.ts and bumps the revision. */
  update: (fn: (draft: WorkoutDraft) => WorkoutDraft) => void;
  markQueued: (revision: number) => void;
  setRest: (rest: RestTimer | null) => void;
  /** Returns the finalized workout (uncompleted sets dropped). */
  finish: () => WorkoutDraft | null;
  discard: () => void;
  /** Forget the local copy of a finished workout (e.g. after deleting it). */
  forgetFinished: (workoutId: string) => void;
  /** On sign-out: another user must never see this workout. */
  reset: () => void;
};

const initial = { workout: null, queuedRevision: 0, rest: null, lastFinished: null };

export const useActiveWorkout = create<ActiveWorkoutState>()(
  persist(
    (set, get) => ({
      ...initial,
      hydrated: false,

      start: (workout) => set({ workout, queuedRevision: 0, rest: null }),

      update: (fn) =>
        set((state) => {
          if (!state.workout) return state;
          const next = fn(state.workout);
          if (next === state.workout) return state;
          return { workout: { ...next, revision: state.workout.revision + 1 } };
        }),

      markQueued: (revision) => set({ queuedRevision: revision }),

      setRest: (rest) => set({ rest }),

      finish: () => {
        const { workout } = get();
        if (!workout) return null;
        const finished = finalize(workout, new Date().toISOString());
        set({ workout: null, queuedRevision: 0, rest: null, lastFinished: finished });
        return finished;
      },

      discard: () => set({ workout: null, queuedRevision: 0, rest: null }),

      forgetFinished: (workoutId) =>
        set((state) => (state.lastFinished?.id === workoutId ? { lastFinished: null } : state)),

      reset: () => set(initial),
    }),
    {
      name: 'active-workout',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ workout, queuedRevision, rest, lastFinished }) => ({
        workout,
        queuedRevision,
        rest,
        lastFinished,
      }),
      onRehydrateStorage: () => () => useActiveWorkout.setState({ hydrated: true }),
    },
  ),
);

// ---------- Editing a finished workout (in memory only) ----------

type EditWorkoutState = {
  draft: WorkoutDraft | null;
  load: (draft: WorkoutDraft) => void;
  update: (fn: (draft: WorkoutDraft) => WorkoutDraft) => void;
  clear: () => void;
};

export const useEditWorkout = create<EditWorkoutState>()((set) => ({
  draft: null,
  load: (draft) => set({ draft }),
  // The revision is bumped once, on save, relative to the server's copy.
  update: (fn) => set((state) => (state.draft ? { draft: fn(state.draft) } : state)),
  clear: () => set({ draft: null }),
}));

/** The two places a workout is edited; the exercise picker adds to one of them. */
export type EditorTarget = 'active' | 'edit';

export function updaterFor(target: EditorTarget) {
  return target === 'active'
    ? useActiveWorkout.getState().update
    : useEditWorkout.getState().update;
}
