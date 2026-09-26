// A workout being logged or edited, as plain data. Every change goes through the pure
// functions below, and the whole draft is sent to the server as one snapshot
// (public.save_workout), so there is no per-set write to get out of order.
import { roundTo } from '@/lib/number';
import { newId } from '@/lib/uuid';
import type { Enums, Json } from '@/types/database.types';

export type TrackingType = Enums<'tracking_type'>;

export type DraftSet = {
  id: string;
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_m: number | null;
  is_warmup: boolean;
  is_completed: boolean;
  completed_at: string | null;
};

export type DraftExercise = {
  id: string;
  exercise_id: string;
  notes: string | null;
  sets: DraftSet[];
};

export type WorkoutDraft = {
  id: string;
  user_id: string;
  name: string;
  started_at: string;
  /** null while in progress. */
  ended_at: string | null;
  notes: string | null;
  template_id: string | null;
  /** Bumped on every change; the server ignores snapshots older than what it has. */
  revision: number;
  exercises: DraftExercise[];
};

/** The values a set can be pre-filled with. */
export type SetValues = Pick<
  DraftSet,
  'weight_kg' | 'reps' | 'duration_seconds' | 'distance_m' | 'is_warmup'
>;

const EMPTY_VALUES: SetValues = {
  weight_kg: null,
  reps: null,
  duration_seconds: null,
  distance_m: null,
  is_warmup: false,
};

export function newSet(values: Partial<SetValues> = {}, completed = false): DraftSet {
  return {
    ...EMPTY_VALUES,
    ...values,
    id: newId(),
    is_completed: completed,
    completed_at: completed ? new Date().toISOString() : null,
  };
}

export function newDraft(args: {
  userId: string;
  name: string;
  templateId?: string | null;
  exercises?: DraftExercise[];
}): WorkoutDraft {
  return {
    id: newId(),
    user_id: args.userId,
    name: args.name,
    started_at: new Date().toISOString(),
    ended_at: null,
    notes: null,
    template_id: args.templateId ?? null,
    revision: 1,
    exercises: args.exercises ?? [],
  };
}

/**
 * A new exercise block, pre-filled from the last session of that exercise
 * ("previous: 60 kg × 8"). With a template target, the working-set count and
 * default reps come from the template.
 */
export function buildExercise(
  exerciseId: string,
  last: SetValues[],
  target?: { sets: number | null; reps: number | null },
): DraftExercise {
  const lastWorking = last.filter((s) => !s.is_warmup);
  const pick = (i: number): Partial<SetValues> => {
    const prev = lastWorking[i] ?? lastWorking.at(-1);
    if (prev) return { ...prev, is_warmup: false };
    return target?.reps ? { reps: target.reps } : {};
  };

  let sets: DraftSet[];
  if (target?.sets) {
    sets = Array.from({ length: target.sets }, (_, i) => newSet(pick(i)));
  } else if (last.length > 0) {
    sets = last.map((s) => newSet(s));
  } else {
    sets = [newSet(pick(0))];
  }
  return { id: newId(), exercise_id: exerciseId, notes: null, sets };
}

// ---------- Edits (all pure) ----------

type ExerciseFn = (exercise: DraftExercise) => DraftExercise;

function mapExercise(draft: WorkoutDraft, exerciseId: string, fn: ExerciseFn): WorkoutDraft {
  return {
    ...draft,
    exercises: draft.exercises.map((e) => (e.id === exerciseId ? fn(e) : e)),
  };
}

export const edit = {
  rename: (draft: WorkoutDraft, name: string): WorkoutDraft => ({ ...draft, name }),

  setNotes: (draft: WorkoutDraft, notes: string): WorkoutDraft => ({
    ...draft,
    notes: notes === '' ? null : notes,
  }),

  addExercises: (draft: WorkoutDraft, exercises: DraftExercise[]): WorkoutDraft => ({
    ...draft,
    exercises: [...draft.exercises, ...exercises],
  }),

  removeExercise: (draft: WorkoutDraft, exerciseId: string): WorkoutDraft => ({
    ...draft,
    exercises: draft.exercises.filter((e) => e.id !== exerciseId),
  }),

  moveExercise: (draft: WorkoutDraft, exerciseId: string, delta: -1 | 1): WorkoutDraft => {
    const from = draft.exercises.findIndex((e) => e.id === exerciseId);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= draft.exercises.length) return draft;
    const exercises = [...draft.exercises];
    [exercises[from], exercises[to]] = [exercises[to]!, exercises[from]!];
    return { ...draft, exercises };
  },

  setExerciseNotes: (draft: WorkoutDraft, exerciseId: string, notes: string | null) =>
    mapExercise(draft, exerciseId, (e) => ({ ...e, notes })),

  /** Copies the values of the exercise's last set (or `fallback`), like a gym notebook. */
  addSet: (
    draft: WorkoutDraft,
    exerciseId: string,
    opts: { completed: boolean; fallback?: SetValues },
  ) =>
    mapExercise(draft, exerciseId, (e) => {
      const last = e.sets.at(-1);
      const values = last
        ? { ...pickValues(last), is_warmup: false }
        : (opts.fallback ?? EMPTY_VALUES);
      return { ...e, sets: [...e.sets, newSet(values, opts.completed)] };
    }),

  updateSet: (draft: WorkoutDraft, exerciseId: string, setId: string, patch: Partial<DraftSet>) =>
    mapExercise(draft, exerciseId, (e) => ({
      ...e,
      sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
    })),

  removeSet: (draft: WorkoutDraft, exerciseId: string, setId: string) =>
    mapExercise(draft, exerciseId, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setId) })),

  /**
   * Toggles completion. Completing a set with empty fields fills them from `placeholder`
   * (the "previous" values shown greyed out), so one tap logs a repeat of last time.
   */
  toggleComplete: (
    draft: WorkoutDraft,
    exerciseId: string,
    setId: string,
    placeholder?: SetValues,
  ) =>
    mapExercise(draft, exerciseId, (e) => ({
      ...e,
      sets: e.sets.map((s) => {
        if (s.id !== setId) return s;
        if (s.is_completed) return { ...s, is_completed: false, completed_at: null };
        return {
          ...s,
          weight_kg: s.weight_kg ?? placeholder?.weight_kg ?? null,
          reps: s.reps ?? placeholder?.reps ?? null,
          duration_seconds: s.duration_seconds ?? placeholder?.duration_seconds ?? null,
          distance_m: s.distance_m ?? placeholder?.distance_m ?? null,
          is_completed: true,
          completed_at: new Date().toISOString(),
        };
      }),
    })),
};

function pickValues(s: SetValues): SetValues {
  return {
    weight_kg: s.weight_kg,
    reps: s.reps,
    duration_seconds: s.duration_seconds,
    distance_m: s.distance_m,
    is_warmup: s.is_warmup,
  };
}

/** Drops sets that were never completed and exercises left with no sets. */
export function dropIncomplete(draft: WorkoutDraft): WorkoutDraft {
  return {
    ...draft,
    exercises: draft.exercises
      .map((e) => ({ ...e, sets: e.sets.filter((s) => s.is_completed) }))
      .filter((e) => e.sets.length > 0),
  };
}

export function finalize(draft: WorkoutDraft, endedAt: string): WorkoutDraft {
  return { ...dropIncomplete(draft), ended_at: endedAt, revision: draft.revision + 1 };
}

// ---------- Reading ----------

export type WorkoutStats = {
  durationSeconds: number;
  exerciseCount: number;
  /** Completed, non-warm-up sets. */
  workingSets: number;
  /** Σ weight × reps over completed working sets, in kg. */
  volumeKg: number;
  incompleteSets: number;
};

export function workoutStats(draft: WorkoutDraft, now: Date = new Date()): WorkoutStats {
  const end = draft.ended_at ? new Date(draft.ended_at) : now;
  let workingSets = 0;
  let volumeKg = 0;
  let incompleteSets = 0;
  for (const e of draft.exercises) {
    for (const s of e.sets) {
      if (!s.is_completed) incompleteSets++;
      else if (!s.is_warmup) {
        workingSets++;
        volumeKg += (s.weight_kg ?? 0) * (s.reps ?? 0);
      }
    }
  }
  return {
    durationSeconds: Math.max(0, (end.getTime() - new Date(draft.started_at).getTime()) / 1000),
    exerciseCount: draft.exercises.length,
    workingSets,
    volumeKg: roundTo(volumeKg, 1),
    incompleteSets,
  };
}

/** The jsonb argument of public.save_workout; positions come from array order. */
export function toSnapshot(draft: WorkoutDraft): Json {
  return {
    id: draft.id,
    name: draft.name.trim() || 'Workout',
    started_at: draft.started_at,
    ended_at: draft.ended_at,
    notes: draft.notes,
    template_id: draft.template_id,
    revision: draft.revision,
    exercises: draft.exercises.map((e, position) => ({
      id: e.id,
      exercise_id: e.exercise_id,
      position,
      notes: e.notes,
      sets: e.sets.map((s, setPosition) => ({ ...s, position: setPosition })),
    })),
  };
}
