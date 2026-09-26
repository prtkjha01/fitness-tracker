import { formatDurationWords } from '@/lib/duration';
import { formatWeight, type UnitSystem } from '@/lib/units';

import type { WorkoutSummaryRow } from './api';
import { workoutStats, type WorkoutDraft } from './draft';

/** The one-line description of a finished workout used in lists. */
export type WorkoutLine = {
  id: string;
  name: string;
  startedAt: string;
  durationSeconds: number;
  exerciseCount: number;
  workingSets: number;
  volumeKg: number;
};

export function lineFromRow(row: WorkoutSummaryRow): WorkoutLine {
  let workingSets = 0;
  let volumeKg = 0;
  for (const e of row.workout_exercises) {
    for (const s of e.workout_sets) {
      if (s.is_completed && !s.is_warmup) {
        workingSets++;
        volumeKg += (s.weight_kg ?? 0) * (s.reps ?? 0);
      }
    }
  }
  return {
    id: row.id,
    name: row.name,
    startedAt: row.started_at,
    durationSeconds: row.ended_at
      ? (new Date(row.ended_at).getTime() - new Date(row.started_at).getTime()) / 1000
      : 0,
    exerciseCount: row.workout_exercises.length,
    workingSets,
    volumeKg,
  };
}

export function lineFromDraft(draft: WorkoutDraft): WorkoutLine {
  const stats = workoutStats(draft);
  return {
    id: draft.id,
    name: draft.name,
    startedAt: draft.started_at,
    durationSeconds: stats.durationSeconds,
    exerciseCount: stats.exerciseCount,
    workingSets: stats.workingSets,
    volumeKg: stats.volumeKg,
  };
}

/** "52 min · 4 exercises · 16 sets · 4,250 kg" */
export function formatWorkoutLine(line: WorkoutLine, units: UnitSystem): string {
  const parts = [
    formatDurationWords(line.durationSeconds),
    `${line.exerciseCount} ${line.exerciseCount === 1 ? 'exercise' : 'exercises'}`,
    `${line.workingSets} ${line.workingSets === 1 ? 'set' : 'sets'}`,
  ];
  if (line.volumeKg > 0) parts.push(formatWeight(line.volumeKg, units));
  return parts.join(' · ');
}
