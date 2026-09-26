import { roundTo } from '@/lib/number';

/** Calories and macros of a food at some quantity. Macros are optional (null = not tracked). */
export type Nutrients = {
  calories: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

const round1 = (n: number) => roundTo(n, 1);

/**
 * Nutrients for `quantity` of a food whose nutrients are known at `baseQuantity`
 * (same unit), e.g. a saved "100 g" food re-logged as 150 g.
 */
export function scaleNutrients(base: Nutrients, baseQuantity: number, quantity: number): Nutrients {
  const factor = baseQuantity > 0 ? quantity / baseQuantity : 1;
  const scale = (grams: number | null) => (grams === null ? null : round1(grams * factor));
  return {
    calories: Math.round(base.calories * factor),
    protein_g: scale(base.protein_g),
    carbs_g: scale(base.carbs_g),
    fat_g: scale(base.fat_g),
  };
}

export type DayTotals = { calories: number; protein_g: number; carbs_g: number; fat_g: number };

/** Summed client-side so optimistic and offline entries count immediately. */
export function sumNutrients(items: Nutrients[]): DayTotals {
  return items.reduce<DayTotals>(
    (sum, item) => ({
      calories: sum.calories + item.calories,
      protein_g: round1(sum.protein_g + (item.protein_g ?? 0)),
      carbs_g: round1(sum.carbs_g + (item.carbs_g ?? 0)),
      fat_g: round1(sum.fat_g + (item.fat_g ?? 0)),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}
