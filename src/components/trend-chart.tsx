import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { Text } from '@/components/ui/text';
import { niceScale, useChartTheme } from '@/lib/chart-theme';

export type TrendPoint = {
  /** "yyyy-MM-dd" (or an ISO instant); points must be in date order. */
  date: string;
  value: number;
};

type TrendChartProps = {
  points: TrendPoint[];
  /** Formats a value for ticks and the tooltip, e.g. v => `${v} kg`. */
  formatValue: (value: number) => string;
  /** Short tick labels (defaults to formatValue). */
  formatTick?: (value: number) => string;
  height?: number;
  /** Spoken summary for screen readers, e.g. "Estimated 1RM, 12 sessions, from 80 to 95 kg". */
  accessibilityLabel: string;
};

const Y_AXIS_WIDTH = 44;
const EDGE = 8;

/**
 * One series over time: 2px line, a ~10% area wash, an end dot, hairline solid grid, and a
 * press-and-hold crosshair tooltip. Callers render the values as a list too (table view).
 */
export function TrendChart({
  points,
  formatValue,
  formatTick = formatValue,
  height = 180,
  accessibilityLabel,
}: TrendChartProps) {
  const theme = useChartTheme();
  const [width, setWidth] = useState(0);

  const values = points.map((p) => p.value);
  const scale = niceScale(Math.min(...values), Math.max(...values));
  const plotWidth = Math.max(0, width - Y_AXIS_WIDTH - EDGE * 2);
  const spacing = points.length > 1 ? plotWidth / (points.length - 1) : plotWidth;

  // Values are plotted relative to the axis floor (scale.lo) so the y-axis needn't start at 0.
  const data = points.map((p, i) => ({
    value: p.value - scale.lo,
    hideDataPoint: i !== points.length - 1,
    dataPointRadius: 4,
    dataPointColor: theme.series,
  }));

  const label = (date: string) => format(parseISO(date), 'MMM d');

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={accessibilityLabel}
    >
      {width > 0 ? (
        <LineChart
          data={data}
          width={plotWidth + EDGE * 2}
          height={height}
          initialSpacing={EDGE}
          endSpacing={EDGE}
          spacing={spacing}
          disableScroll
          color={theme.series}
          thickness={2}
          areaChart
          startFillColor={theme.series}
          endFillColor={theme.series}
          startOpacity={0.12}
          endOpacity={0.02}
          maxValue={scale.hi - scale.lo}
          stepValue={scale.step}
          noOfSections={scale.sections}
          formatYLabel={(v) => formatTick(Number(v) + scale.lo)}
          yAxisLabelWidth={Y_AXIS_WIDTH}
          yAxisThickness={0}
          yAxisTextStyle={{ color: theme.text, fontSize: 11 }}
          xAxisThickness={1}
          xAxisColor={theme.grid}
          rulesColor={theme.grid}
          rulesThickness={1}
          rulesType="solid"
          xAxisLabelsHeight={0}
          pointerConfig={{
            activatePointersOnLongPress: true,
            activatePointersDelay: 150,
            pointerStripColor: theme.text,
            pointerStripWidth: 1,
            pointerColor: theme.series,
            radius: 5,
            pointerLabelWidth: 120,
            pointerLabelHeight: 48,
            autoAdjustPointerLabelPosition: true,
            pointerLabelComponent: (_items: unknown, _secondary: unknown, index: number) => {
              const point = points[index];
              if (!point) return null;
              return (
                <View className="rounded-md border border-border bg-popover px-2 py-1.5 shadow-sm shadow-black/10">
                  <Text className="text-sm font-semibold">{formatValue(point.value)}</Text>
                  <Text className="text-xs text-muted-foreground">{label(point.date)}</Text>
                </View>
              );
            },
          }}
        />
      ) : (
        <View style={{ height: height + 20 }} />
      )}
      {/* First and last dates only; press and hold the chart for any point in between. */}
      {points.length > 0 ? (
        <View className="flex-row justify-between" style={{ paddingLeft: Y_AXIS_WIDTH }}>
          <Text className="text-xs text-muted-foreground">{label(points[0]!.date)}</Text>
          {points.length > 1 ? (
            <Text className="text-xs text-muted-foreground">{label(points.at(-1)!.date)}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
