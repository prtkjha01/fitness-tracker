import type { MealType } from './api';

export const MEAL_TYPES = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
] as const satisfies readonly MealType[];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export function isMealType(value: unknown): value is MealType {
  return typeof value === 'string' && (MEAL_TYPES as readonly string[]).includes(value);
}

/** Sensible default meal for "log food" right now, by local hour. */
export function mealForHour(hour: number): MealType {
  if (hour >= 4 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'snack';
}
