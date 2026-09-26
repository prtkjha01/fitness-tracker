import { consistency, weekStart } from '@/features/progress/streak';

describe('consistency', () => {
  it('uses Monday-start weeks', () => {
    expect([weekStart('2026-09-26'), weekStart('2026-09-28'), weekStart('2026-09-27'), weekStart('2026-03-01')])
      .toEqual(['2026-09-21', '2026-09-28', '2026-09-21', '2026-02-23']);
  });

  it('counts consecutive weeks, and an empty current week does not break the streak', () => {
    const days = new Map([['2026-09-08', 1], ['2026-09-16', 2], ['2026-09-22', 1]]);
    expect(consistency(days, '2026-09-26')).toEqual({ weekStreak: 3, thisWeek: 1, last30Days: 4 });
    expect(consistency(days, '2026-09-28').weekStreak).toBe(3); // Monday, nothing yet
    expect(consistency(days, '2026-10-06').weekStreak).toBe(0); // a whole week missed
    expect(consistency(new Map([['2026-09-01', 1], ['2026-09-22', 1]]), '2026-09-26').weekStreak).toBe(1);
    expect(consistency(new Map(), '2026-09-26')).toEqual({ weekStreak: 0, thisWeek: 0, last30Days: 0 });
  });
});
