import { mealForHour } from '@/features/nutrition/meals';
import { scaleNutrients, sumNutrients } from '@/features/nutrition/nutrients';
import { entryFormSchema } from '@/features/nutrition/schemas';

describe('nutrients', () => {
  it('scales a saved food to a new quantity in the same unit', () => {
    expect(scaleNutrients({ calories: 190, protein_g: 6.5, carbs_g: 33, fat_g: null }, 50, 75)).toEqual({
      calories: 285,
      protein_g: 9.8,
      carbs_g: 49.5,
      fat_g: null,
    });
  });

  it('sums a day, treating missing macros as zero without float noise', () => {
    expect(
      sumNutrients([
        { calories: 100, protein_g: 0.1, carbs_g: null, fat_g: 1 },
        { calories: 50, protein_g: 0.2, carbs_g: 3, fat_g: null },
      ]),
    ).toEqual({ calories: 150, protein_g: 0.3, carbs_g: 3, fat_g: 1 });
  });

  it('suggests a meal from the local hour', () => {
    expect([3, 4, 11, 16, 17, 22].map(mealForHour)).toEqual([
      'snack', 'breakfast', 'lunch', 'snack', 'dinner', 'snack',
    ]);
  });
});

describe('entryFormSchema', () => {
  const valid = {
    meal_type: 'lunch' as const,
    name: ' Rice ',
    quantity: '1.255',
    unit: 'cup',
    calories: '200',
    protein_g: '',
    carbs_g: '44.44',
    fat_g: '0',
    save_food: false,
  };

  it('parses strings to rounded numbers and empty macros to null', () => {
    expect(entryFormSchema.parse(valid)).toMatchObject({
      name: 'Rice',
      quantity: 1.26,
      calories: 200,
      protein_g: null,
      carbs_g: 44.4,
      fat_g: 0,
    });
  });

  it('rejects impossible values', () => {
    expect(entryFormSchema.safeParse({ ...valid, quantity: '0' }).success).toBe(false);
    expect(entryFormSchema.safeParse({ ...valid, calories: '20000' }).success).toBe(false);
    expect(entryFormSchema.safeParse({ ...valid, calories: '1.5' }).success).toBe(false);
  });
});
