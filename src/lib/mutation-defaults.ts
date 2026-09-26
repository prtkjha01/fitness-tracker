import type { QueryClient } from '@tanstack/react-query';

import { registerNutritionMutations } from '@/features/nutrition/mutations';
import { registerProfileMutations } from '@/features/profile/mutations';
import { registerProgressMutations } from '@/features/progress/mutations';
import { registerWaterMutations } from '@/features/water/mutations';
import { registerWorkoutMutations } from '@/features/workouts/mutations';

/** Every offline-queueable mutation registers its defaults here (see features/<x>/mutations.ts). */
export function registerMutationDefaults(queryClient: QueryClient) {
  registerWaterMutations(queryClient);
  registerNutritionMutations(queryClient);
  registerWorkoutMutations(queryClient);
  registerProgressMutations(queryClient);
  registerProfileMutations(queryClient);
}
