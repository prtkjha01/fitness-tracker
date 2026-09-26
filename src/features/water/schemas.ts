import { z } from 'zod';

import {
  displayVolumeToMl,
  mlToDisplayVolume,
  volumeUnitLabel,
  type UnitSystem,
} from '@/lib/units';

// Mirrors the water_logs.amount_ml check constraint.
const AMOUNT_ML = { min: 1, max: 5000 };

/** A custom amount typed in the user's display unit, parsed to ml. */
export function customAmountSchema(units: UnitSystem) {
  const max = mlToDisplayVolume(AMOUNT_ML.max, units);
  return z.object({
    amount: z
      .string()
      .trim()
      .regex(/^\d+$/, 'Enter a whole number')
      .transform((v) => displayVolumeToMl(Number(v), units))
      .refine((ml) => ml >= AMOUNT_ML.min && ml <= AMOUNT_ML.max, {
        message: `Between 1 and ${max} ${volumeUnitLabel(units)}`,
      }),
  });
}
