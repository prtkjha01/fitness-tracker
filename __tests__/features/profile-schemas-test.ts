import { onboardingSchema, settingsSchema } from '@/features/profile/schemas';

describe('profile schemas', () => {
  it('stores water in ml whatever unit it was typed in', () => {
    expect(
      onboardingSchema.parse({ display_name: 'A', units: 'imperial', daily_calorie_goal: '2200', daily_water_goal: '85' }),
    ).toEqual({ display_name: 'A', units: 'imperial', daily_calorie_goal: 2200, daily_water_goal_ml: 2514 });
  });

  it('checks the water goal range in the chosen unit', () => {
    const r = onboardingSchema.safeParse({ display_name: 'A', units: 'imperial', daily_calorie_goal: '2000', daily_water_goal: '5' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]).toMatchObject({ path: ['daily_water_goal'], message: 'Between 8 and 338 fl oz' });
  });

  const settings = {
    display_name: 'A', units: 'metric' as const, daily_calorie_goal: '2000', daily_water_goal: '2500',
    water_quick_adds: [{ amount: '500' }, { amount: '250' }, { amount: '500' }], default_rest_seconds: 90,
  };

  it('sorts and de-duplicates quick-add amounts', () => {
    expect(settingsSchema.parse(settings).water_quick_adds).toEqual([250, 500]);
  });

  it('points quick-add errors at the right field', () => {
    const r = settingsSchema.safeParse({ ...settings, water_quick_adds: [{ amount: '250' }, { amount: '9000' }] });
    expect(r.error?.issues[0]?.path).toEqual(['water_quick_adds', 1, 'amount']);
    expect(settingsSchema.safeParse({ ...settings, water_quick_adds: [] }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...settings, default_rest_seconds: 1000 }).success).toBe(false);
  });
});
