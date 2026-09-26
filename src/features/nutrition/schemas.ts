import { z } from 'zod';

import { roundTo } from '@/lib/number';

import { MEAL_TYPES } from './meals';

// Limits mirror the food_entries / saved_foods column types and check constraints.
const number = (max: number, label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d+(\.\d+)?$/, 'Enter a number')
    .transform(Number)
    .pipe(z.number().max(max, `${label} is too large`));

const grams = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\d+(\.\d+)?$/.test(v), 'Enter a number or leave empty')
  .transform((v) => (v === '' ? null : roundTo(Number(v), 1)))
  .pipe(z.number().max(1000, 'At most 1000 g').nullable());

export const entryFormSchema = z.object({
  meal_type: z.enum(MEAL_TYPES),
  name: z.string().trim().min(1, 'Enter a name').max(120, 'Use at most 120 characters'),
  quantity: number(999999, 'Quantity')
    .refine((n) => n > 0, 'Must be more than 0')
    .transform((n) => roundTo(n, 2)),
  unit: z.string().trim().min(1, 'Enter a unit').max(20, 'Use at most 20 characters'),
  calories: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Enter a whole number')
    .transform(Number)
    .pipe(z.number().max(10000, 'At most 10000 kcal')),
  protein_g: grams,
  carbs_g: grams,
  fat_g: grams,
  save_food: z.boolean(),
});

export type EntryFormInput = z.input<typeof entryFormSchema>;
export type EntryFormOutput = z.output<typeof entryFormSchema>;
