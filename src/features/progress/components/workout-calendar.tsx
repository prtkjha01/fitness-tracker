import { addMonths, format, getDaysInMonth, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useChartTheme } from '@/lib/chart-theme';
import { shiftDate } from '@/lib/dates';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type WorkoutCalendarProps = {
  /** "yyyy-MM-dd" → workouts that day. */
  days: Map<string, number>;
  today: string;
  /** Earliest day with data; can't page back past its month. */
  earliest: string;
};

/** Month grid; each day shaded by workouts done (validated single-hue ordinal ramp). */
export function WorkoutCalendar({ days, today, earliest }: WorkoutCalendarProps) {
  const theme = useChartTheme();
  const { colorScheme } = useColorScheme();
  const thisMonth = today.slice(0, 7) + '-01';
  const [month, setMonth] = useState(thisMonth);

  const first = month;
  const daysInMonth = getDaysInMonth(parseISO(first));
  // Pad to Monday so columns line up with the weekday header.
  const lead = (parseISO(first).getDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => shiftDate(first, i)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  const monthTotal = cells.reduce((n, d) => n + (d ? (days.get(d) ?? 0) : 0), 0);
  const canGoBack = month > earliest.slice(0, 7) + '-01';
  const canGoForward = month < thisMonth;
  const step = (delta: number) => setMonth(format(addMonths(parseISO(month), delta), 'yyyy-MM-01'));

  const fill = (count: number) => (count <= 0 ? theme.empty : theme.ramp[Math.min(count, 3) - 1]!);
  // Ink picked by fill luminance: the lightest light-mode step takes dark text.
  const whiteText = (count: number) => count >= 2 || (count === 1 && colorScheme === 'dark');

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onPress={() => step(-1)}
          disabled={!canGoBack}
          aria-label="Previous month"
        >
          <Icon as={ChevronLeft} size={20} className="text-foreground" />
        </Button>
        <View className="items-center">
          <Text className="font-semibold">{format(parseISO(month), 'MMMM yyyy')}</Text>
          <Text variant="muted">
            {monthTotal} {monthTotal === 1 ? 'workout' : 'workouts'}
          </Text>
        </View>
        <Button
          variant="ghost"
          size="icon"
          onPress={() => step(1)}
          disabled={!canGoForward}
          aria-label="Next month"
        >
          <Icon as={ChevronRight} size={20} className="text-foreground" />
        </Button>
      </View>

      <View className="flex-row gap-1">
        {WEEKDAYS.map((d, i) => (
          <Text key={i} className="flex-1 text-center text-xs text-muted-foreground">
            {d}
          </Text>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week.find(Boolean) ?? 'empty'} className="flex-row gap-1">
          {week.map((day, i) => {
            if (!day) return <View key={i} className="aspect-square flex-1" />;
            const count = days.get(day) ?? 0;
            const future = day > today;
            return (
              <View
                key={day}
                className={cn(
                  'aspect-square flex-1 items-center justify-center rounded-md',
                  day === today && 'border-2 border-foreground',
                  future && 'opacity-40',
                )}
                style={{ backgroundColor: fill(count) }}
                accessible
                aria-label={`${format(parseISO(day), 'MMMM d')}: ${count === 0 ? 'no workout' : count === 1 ? '1 workout' : `${count} workouts`}`}
              >
                <Text
                  className={cn('text-xs', count > 0 && 'font-semibold')}
                  style={whiteText(count) ? { color: '#ffffff' } : undefined}
                >
                  {parseISO(day).getDate()}
                </Text>
              </View>
            );
          })}
        </View>
      ))}

      {/* Ordinal legend: the shade means how many workouts. */}
      <View className="flex-row items-center justify-end gap-3 pt-1">
        {['1', '2', '3+'].map((label, i) => (
          <View key={label} className="flex-row items-center gap-1">
            <View className="size-3 rounded-sm" style={{ backgroundColor: theme.ramp[i] }} />
            <Text className="text-xs text-muted-foreground">{label}</Text>
          </View>
        ))}
        <Text className="text-xs text-muted-foreground">workouts</Text>
      </View>
    </View>
  );
}
