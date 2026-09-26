import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { useChartTheme } from '@/lib/chart-theme';
import { shiftDate } from '@/lib/dates';
import { formatVolume, type UnitSystem } from '@/lib/units';

import type { WeeklySummary as Week } from '../api';

const Y_AXIS_WIDTH = 28;
const MAX_BAR = 24;

type WeeklySummaryProps = { weeks: Week[]; units: UnitSystem };

/**
 * Workouts per week as columns (one hue, magnitude), then every week's numbers as a table.
 * Calories and water have their own scales, so they live in the table, never a second axis.
 */
export function WeeklySummary({ weeks, units }: WeeklySummaryProps) {
  const theme = useChartTheme();
  const [width, setWidth] = useState(0);

  const plotWidth = Math.max(0, width - Y_AXIS_WIDTH - 8);
  const slot = weeks.length > 0 ? plotWidth / weeks.length : 0;
  const barWidth = Math.min(MAX_BAR, slot * 0.6);
  const top = Math.max(3, ...weeks.map((w) => w.workouts_completed));

  const data = weeks.map((w) => ({
    value: w.workouts_completed,
    label: format(parseISO(w.week_start), 'M/d'),
    // Value on the cap; zero weeks stay unlabeled so empty space reads as empty.
    topLabelComponent: () =>
      w.workouts_completed > 0 ? (
        <Text className="pb-0.5 text-xs text-muted-foreground">{w.workouts_completed}</Text>
      ) : null,
  }));

  const summary = weeks
    .map((w) => `week of ${format(parseISO(w.week_start), 'MMM d')}: ${w.workouts_completed}`)
    .join(', ');

  return (
    <View className="gap-4">
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityLabel={`Workouts per week, ${summary}`}
      >
        {width > 0 ? (
          <BarChart
            data={data}
            width={plotWidth}
            height={140}
            barWidth={barWidth}
            spacing={slot - barWidth}
            initialSpacing={(slot - barWidth) / 2}
            endSpacing={0}
            disableScroll
            disablePress
            frontColor={theme.series}
            barBorderTopLeftRadius={4}
            barBorderTopRightRadius={4}
            maxValue={top}
            noOfSections={Math.min(top, 5)}
            stepValue={Math.ceil(top / Math.min(top, 5))}
            yAxisLabelWidth={Y_AXIS_WIDTH}
            yAxisThickness={0}
            yAxisTextStyle={{ color: theme.text, fontSize: 11 }}
            xAxisThickness={1}
            xAxisColor={theme.grid}
            rulesColor={theme.grid}
            rulesThickness={1}
            rulesType="solid"
            xAxisLabelTextStyle={{ color: theme.text, fontSize: 10 }}
            labelWidth={slot}
          />
        ) : (
          <View style={{ height: 170 }} />
        )}
      </View>

      {/* Table view: every number the chart shows, plus calories and water. */}
      <View>
        <View className="flex-row pb-1">
          <Text className="flex-1 text-xs font-semibold text-muted-foreground">Week</Text>
          <Text className="w-16 text-right text-xs font-semibold text-muted-foreground">
            Workouts
          </Text>
          <Text className="w-20 text-right text-xs font-semibold text-muted-foreground">
            Avg kcal
          </Text>
          <Text className="w-20 text-right text-xs font-semibold text-muted-foreground">
            Avg water
          </Text>
        </View>
        {[...weeks].reverse().map((w, i) => (
          <View key={w.week_start}>
            {i > 0 ? <Separator /> : null}
            <View className="flex-row py-2">
              <Text className="flex-1 text-sm">
                {format(parseISO(w.week_start), 'MMM d')}–
                {format(parseISO(shiftDate(w.week_start, 6)), 'd')}
              </Text>
              <Text className="w-16 text-right text-sm tabular-nums">{w.workouts_completed}</Text>
              <Text className="w-20 text-right text-sm tabular-nums">
                {w.avg_calories !== null ? Math.round(w.avg_calories).toLocaleString() : '—'}
              </Text>
              <Text className="w-20 text-right text-sm tabular-nums">
                {w.avg_water_ml !== null ? formatVolume(w.avg_water_ml, units) : '—'}
              </Text>
            </View>
          </View>
        ))}
        <Text variant="muted" className="pt-1 text-xs">
          Averages are over the days you logged something.
        </Text>
      </View>
    </View>
  );
}
