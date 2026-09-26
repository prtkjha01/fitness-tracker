import { niceScale } from '@/lib/chart-theme';

describe('niceScale', () => {
  it('picks clean 1/2/2.5/5 × 10ⁿ steps that cover the data', () => {
    expect(niceScale(80.2, 84.7)).toEqual({ lo: 80, hi: 86, step: 2, sections: 3 });
    expect(niceScale(1200, 5400)).toEqual({ lo: 0, hi: 6000, step: 2000, sections: 3 });
    for (const [min, max] of [[60, 100], [0.3, 0.9], [95, 97.5]] as const) {
      const s = niceScale(min, max);
      expect(s.lo).toBeLessThanOrEqual(min);
      expect(s.hi).toBeGreaterThanOrEqual(max);
      expect(s.sections).toBeLessThanOrEqual(5);
    }
  });

  it('never returns an empty range for a flat series', () => {
    const s = niceScale(80, 80);
    expect(s.hi).toBeGreaterThan(s.lo);
    expect(s.lo).toBeLessThanOrEqual(80);
  });
});
