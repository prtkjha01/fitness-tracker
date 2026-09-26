import { buildExercise, dropIncomplete, edit, finalize, newDraft, toSnapshot, workoutStats } from '@/features/workouts/draft';
import { formatWorkoutLine, lineFromRow } from '@/features/workouts/workout-line';

const set = (weight_kg: number, reps: number, is_warmup = false) => ({
  weight_kg, reps, duration_seconds: null, distance_m: null, is_warmup,
});

describe('workout draft', () => {
  const last = [set(20, 10, true), set(60, 8)];

  it('pre-fills a new exercise from the last session, or from a template target', () => {
    expect(buildExercise('ex', last).sets.map((s) => [s.weight_kg, s.reps, s.is_warmup, s.is_completed]))
      .toEqual([[20, 10, true, false], [60, 8, false, false]]);
    expect(buildExercise('ex', last, { sets: 3, reps: 5 }).sets.map((s) => [s.weight_kg, s.reps]))
      .toEqual([[60, 8], [60, 8], [60, 8]]);
    expect(buildExercise('ex', [], { sets: 2, reps: 12 }).sets.map((s) => s.reps)).toEqual([12, 12]);
    expect(buildExercise('ex', []).sets).toHaveLength(1);
  });

  it('adds sets like a gym notebook and fills an empty completed set from "previous"', () => {
    const bench = buildExercise('bench', last);
    const blank = buildExercise('curl', []);
    let w = newDraft({ userId: 'u', name: 'Push', exercises: [bench, blank] });
    w = edit.addSet(w, bench.id, { completed: false });
    expect(w.exercises[0]!.sets.at(-1)).toMatchObject({ weight_kg: 60, reps: 8, is_warmup: false });

    w = edit.toggleComplete(w, blank.id, blank.sets[0]!.id, set(12, 15));
    expect(w.exercises[1]!.sets[0]).toMatchObject({ weight_kg: 12, reps: 15, is_completed: true });
    expect(w.exercises[1]!.sets[0]!.completed_at).not.toBeNull();

    w = edit.toggleComplete(w, blank.id, blank.sets[0]!.id);
    expect(w.exercises[1]!.sets[0]).toMatchObject({ is_completed: false, completed_at: null });
  });

  it('reorders, and a no-op move returns the same object (no revision bump)', () => {
    const a = buildExercise('a', []);
    const b = buildExercise('b', []);
    const w = newDraft({ userId: 'u', name: 'W', exercises: [a, b] });
    expect(edit.moveExercise(w, b.id, -1).exercises.map((e) => e.exercise_id)).toEqual(['b', 'a']);
    expect(edit.moveExercise(w, a.id, -1)).toBe(w);
  });

  it('finishing drops unticked sets and empty exercises, and bumps the revision', () => {
    const a = buildExercise('a', [set(50, 5)]);
    const b = buildExercise('b', [set(10, 10)]);
    let w = newDraft({ userId: 'u', name: 'W', exercises: [a, b] });
    w = edit.toggleComplete(w, a.id, a.sets[0]!.id);
    expect(workoutStats(w)).toMatchObject({ workingSets: 1, volumeKg: 250, incompleteSets: 1 });
    const done = finalize(w, '2026-09-26T11:00:00Z');
    expect(done.exercises.map((e) => e.exercise_id)).toEqual(['a']);
    expect(done.revision).toBe(w.revision + 1);
    expect(dropIncomplete(w).exercises).toHaveLength(1);
  });

  it('snapshots positions from array order for save_workout', () => {
    const a = buildExercise('a', [set(50, 5), set(55, 5)]);
    const snapshot = toSnapshot(newDraft({ userId: 'u', name: '  ', exercises: [a] })) as any;
    expect(snapshot.name).toBe('Workout');
    expect(snapshot.exercises[0].position).toBe(0);
    expect(snapshot.exercises[0].sets.map((s: any) => s.position)).toEqual([0, 1]);
  });
});

describe('workout line', () => {
  it('summarises a history row', () => {
    const line = lineFromRow({
      id: 'w', name: 'Push', started_at: '2026-09-26T18:00:00Z', ended_at: '2026-09-26T18:52:00Z',
      workout_exercises: [
        { exercise_id: 'a', workout_sets: [
          { weight_kg: 20, reps: 10, is_completed: true, is_warmup: true },
          { weight_kg: 60, reps: 8, is_completed: true, is_warmup: false },
          { weight_kg: 60, reps: 8, is_completed: true, is_warmup: false },
        ] },
        { exercise_id: 'b', workout_sets: [{ weight_kg: null, reps: 12, is_completed: true, is_warmup: false }] },
      ],
    });
    expect(formatWorkoutLine(line, 'metric')).toBe('52 min · 2 exercises · 3 sets · 960 kg');
  });
});
