import { z } from 'zod';

import { Constants } from '@/types/database.types';

const enums = Constants.public.Enums;

export const exerciseFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(80, 'Use at most 80 characters'),
  category: z.enum(enums.exercise_category),
  muscle_group: z.enum(enums.muscle_group),
  equipment: z.enum(enums.equipment),
  tracking_type: z.enum(enums.tracking_type),
});
