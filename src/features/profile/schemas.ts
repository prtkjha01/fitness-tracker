import { z } from 'zod';

import {
  displayVolumeToMl,
  mlToDisplayVolume,
  volumeUnitLabel,
  type UnitSystem,
} from '@/lib/units';

// Ranges mirror the check constraints on public.profiles.
const CALORIE_GOAL = { min: 500, max: 10000 };
const WATER_GOAL_ML = { min: 250, max: 10000 };
const QUICK_ADD_ML = { min: 1, max: 5000 };
export const MAX_QUICK_ADDS = 6;
const REST_SECONDS = { min: 0, max: 900 };

const wholeNumber = z.string().trim().regex(/^\d+$/, 'Enter a whole number').transform(Number);

const base = {
  display_name: z.string().trim().min(1, 'Enter a name').max(50, 'Use at most 50 characters'),
  units: z.enum(['metric', 'imperial']),
  daily_calorie_goal: wholeNumber.pipe(
    z
      .number()
      .min(CALORIE_GOAL.min, `At least ${CALORIE_GOAL.min} kcal`)
      .max(CALORIE_GOAL.max, `At most ${CALORIE_GOAL.max} kcal`),
  ),
  daily_water_goal: wholeNumber,
};

/** "Between 8 and 338 fl oz" for an ml range shown in the user's unit. */
function rangeMessage(range: { min: number; max: number }, units: UnitSystem) {
  return `Between ${Math.max(1, mlToDisplayVolume(range.min, units))} and ${mlToDisplayVolume(range.max, units)} ${volumeUnitLabel(units)}`;
}

function checkWaterGoal(v: { daily_water_goal: number; units: UnitSystem }, ctx: z.RefinementCtx) {
  const ml = displayVolumeToMl(v.daily_water_goal, v.units);
  if (ml < WATER_GOAL_ML.min || ml > WATER_GOAL_ML.max) {
    ctx.addIssue({
      code: 'custom',
      path: ['daily_water_goal'],
      message: rangeMessage(WATER_GOAL_ML, v.units),
    });
  }
}

/** Onboarding form. Water is typed in the chosen display unit and stored in ml. */
export const onboardingSchema = z
  .object(base)
  .superRefine(checkWaterGoal)
  .transform(({ daily_water_goal, ...rest }) => ({
    ...rest,
    daily_water_goal_ml: displayVolumeToMl(daily_water_goal, rest.units),
  }));

export type OnboardingInput = z.input<typeof onboardingSchema>;

/** Settings form: onboarding's fields plus quick-add amounts and the default rest time. */
export const settingsSchema = z
  .object({
    ...base,
    // Objects, because react-hook-form's field arrays need them.
    water_quick_adds: z
      .array(z.object({ amount: wholeNumber }))
      .min(1, 'Keep at least one amount')
      .max(MAX_QUICK_ADDS, `At most ${MAX_QUICK_ADDS} amounts`),
    default_rest_seconds: z.number().int().min(REST_SECONDS.min).max(REST_SECONDS.max),
  })
  .superRefine((v, ctx) => {
    checkWaterGoal(v, ctx);
    v.water_quick_adds.forEach(({ amount }, i) => {
      const ml = displayVolumeToMl(amount, v.units);
      if (ml < QUICK_ADD_ML.min || ml > QUICK_ADD_ML.max) {
        ctx.addIssue({
          code: 'custom',
          path: ['water_quick_adds', i, 'amount'],
          message: rangeMessage(QUICK_ADD_ML, v.units),
        });
      }
    });
  })
  .transform(({ daily_water_goal, water_quick_adds, ...rest }) => ({
    ...rest,
    daily_water_goal_ml: displayVolumeToMl(daily_water_goal, rest.units),
    // Sorted and de-duplicated so the buttons read small → large.
    water_quick_adds: [
      ...new Set(water_quick_adds.map(({ amount }) => displayVolumeToMl(amount, rest.units))),
    ].sort((a, b) => a - b),
  }));

export type SettingsInput = z.input<typeof settingsSchema>;
