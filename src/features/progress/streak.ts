import { differenceInCalendarDays, parseISO, startOfWeek } from 'date-fns';

import { shiftDate } from '@/lib/dates';

/** Monday of the week containing `date` ("yyyy-MM-dd"). */
export function weekStart(date: string): string {
  const monday = startOfWeek(parseISO(date), { weekStartsOn: 1 });
  return shiftDate(date, differenceInCalendarDays(monday, parseISO(date)));
}

export type Consistency = {
  /** Consecutive weeks (Mon–Sun) with at least one workout. This week counts once it has one;
   *  until then the streak runs to last week, so Monday morning doesn't "break" it. */
  weekStreak: number;
  thisWeek: number;
  last30Days: number;
};

/** `days` maps "yyyy-MM-dd" → finished workouts that day (user's timezone). */
export function consistency(days: Map<string, number>, today: string): Consistency {
  const countWeek = (monday: string) => {
    let n = 0;
    for (let i = 0; i < 7; i++) n += days.get(shiftDate(monday, i)) ?? 0;
    return n;
  };

  const thisMonday = weekStart(today);
  const thisWeek = countWeek(thisMonday);

  let weekStreak = 0;
  let monday = thisWeek > 0 ? thisMonday : shiftDate(thisMonday, -7);
  while (countWeek(monday) > 0) {
    weekStreak++;
    monday = shiftDate(monday, -7);
  }

  let last30Days = 0;
  for (let i = 0; i < 30; i++) last30Days += days.get(shiftDate(today, -i)) ?? 0;

  return { weekStreak, thisWeek, last30Days };
}
