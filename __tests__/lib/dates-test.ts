import { formatDayLabel, isValidDate, localDate, localHour, shiftDate } from '@/lib/dates';

describe('dates', () => {
  it('computes the calendar day in the user timezone, not UTC', () => {
    const instant = new Date('2026-09-26T20:00:00Z');
    expect(localDate('Asia/Kolkata', instant)).toBe('2026-09-27');
    expect(localDate('America/Los_Angeles', instant)).toBe('2026-09-26');
    expect(localHour('Asia/Kolkata', instant)).toBe(1);
  });

  it('shifts plain dates across month, year and DST boundaries', () => {
    expect(shiftDate('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDate('2026-03-08', 1)).toBe('2026-03-09'); // US DST start
    expect(shiftDate('2026-11-01', -1)).toBe('2026-10-31'); // US DST end
  });

  it('labels days relative to today', () => {
    expect(formatDayLabel('2026-09-26', '2026-09-26')).toBe('Today');
    expect(formatDayLabel('2026-09-25', '2026-09-26')).toBe('Yesterday');
    expect(formatDayLabel('2026-09-23', '2026-09-26')).toBe('Wed, Sep 23');
  });

  it('validates route params', () => {
    expect(isValidDate('2026-09-01')).toBe(true);
    expect(isValidDate('2026-9-1')).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
    expect(isValidDate(['2026-09-01'])).toBe(false);
  });
});
