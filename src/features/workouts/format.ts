import { formatDuration } from '@/lib/duration';
import { formatDistance, formatWeight, type UnitSystem } from '@/lib/units';

import type { Equipment, ExerciseCategory, MuscleGroup } from './api';
import type { SetValues, TrackingType } from './draft';

/** One set as text for its tracking type: "60 kg × 8", "× 12", "1:30", "5 km · 25:00". */
export function formatSet(set: SetValues, tracking: TrackingType, units: UnitSystem): string {
  switch (tracking) {
    case 'weight_reps':
      return `${set.weight_kg !== null ? formatWeight(set.weight_kg, units) : '—'} × ${set.reps ?? '—'}`;
    case 'reps':
      return `× ${set.reps ?? '—'}`;
    case 'duration':
      return set.duration_seconds !== null ? formatDuration(set.duration_seconds) : '—';
    case 'distance_duration':
      return (
        [
          set.distance_m !== null ? formatDistance(set.distance_m, units) : null,
          set.duration_seconds !== null ? formatDuration(set.duration_seconds) : null,
        ]
          .filter(Boolean)
          .join(' · ') || '—'
      );
  }
}

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  core: 'Core',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  full_body: 'Full body',
  cardio: 'Cardio',
  other: 'Other',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  kettlebell: 'Kettlebell',
  bodyweight: 'Bodyweight',
  band: 'Band',
  other: 'Other',
};

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  strength: 'Strength',
  cardio: 'Cardio',
  mobility: 'Mobility',
  other: 'Other',
};

export const TRACKING_LABELS: Record<TrackingType, string> = {
  weight_reps: 'Weight × reps',
  reps: 'Reps only',
  duration: 'Time',
  distance_duration: 'Distance + time',
};

/** A PR value in the right unit for its kind (weights and volume are stored in kg). */
export function formatPrValue(kind: string, value: number, units: UnitSystem): string {
  switch (kind) {
    case 'max_weight':
    case 'best_e1rm':
    case 'max_set_volume':
      return formatWeight(value, units);
    case 'max_reps':
      return `${value} reps`;
    case 'longest_duration':
      return formatDuration(value);
    case 'longest_distance':
      return formatDistance(value, units);
    default:
      return String(value);
  }
}

export const PR_LABELS: Record<string, string> = {
  max_weight: 'Heaviest weight',
  best_e1rm: 'Best estimated 1RM',
  max_set_volume: 'Best set volume',
  max_reps: 'Most reps',
  longest_duration: 'Longest time',
  longest_distance: 'Longest distance',
};
