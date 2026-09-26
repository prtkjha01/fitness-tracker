import { useState } from 'react';

import { SegmentedControl } from '@/components/segmented-control';
import { TrendChart } from '@/components/trend-chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { localDate } from '@/lib/dates';
import { formatDuration } from '@/lib/duration';
import {
  distanceUnitLabel,
  kgToDisplayWeight,
  metersToDisplayDistance,
  weightUnitLabel,
  type UnitSystem,
} from '@/lib/units';

import type { ExerciseSession } from '../api';
import type { TrackingType } from '../draft';

type Metric = {
  value: string;
  label: string;
  description: string;
  pick: (s: ExerciseSession) => number | null;
  format: (v: number) => string;
  tick?: (v: number) => string;
};

function metricsFor(tracking: TrackingType, units: UnitSystem): Metric[] {
  const w = weightUnitLabel(units);
  const weight = (kg: number | null) => (kg === null ? null : kgToDisplayWeight(kg, units));
  switch (tracking) {
    case 'weight_reps':
      return [
        {
          value: 'e1rm',
          label: 'Est. 1RM',
          description: 'Best estimated one-rep max per session (Epley, sets of 1–12 reps)',
          pick: (s) => weight(s.best_e1rm),
          format: (v) => `${v} ${w}`,
          tick: (v) => String(Math.round(v)),
        },
        {
          value: 'top',
          label: 'Top set',
          description: 'Heaviest completed working set per session',
          pick: (s) => weight(s.top_weight_kg),
          format: (v) => `${v} ${w}`,
          tick: (v) => String(Math.round(v)),
        },
        {
          value: 'volume',
          label: 'Volume',
          description: 'Weight × reps across working sets per session',
          pick: (s) => weight(s.total_volume_kg),
          format: (v) => `${Math.round(v).toLocaleString()} ${w}`,
          tick: (v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v))),
        },
      ];
    case 'reps':
      return [
        {
          value: 'reps',
          label: 'Total reps',
          description: 'Reps across working sets per session',
          pick: (s) => s.total_reps,
          format: (v) => `${v} reps`,
          tick: String,
        },
      ];
    case 'duration':
      return [
        {
          value: 'time',
          label: 'Longest set',
          description: 'Longest completed set per session',
          pick: (s) => s.max_duration_seconds,
          format: formatDuration,
        },
      ];
    case 'distance_duration':
      return [
        {
          value: 'distance',
          label: 'Distance',
          description: 'Longest distance per session',
          pick: (s) =>
            s.max_distance_m === null ? null : metersToDisplayDistance(s.max_distance_m, units),
          format: (v) => `${v} ${distanceUnitLabel(units)}`,
          tick: (v) => String(Math.round(v * 10) / 10),
        },
      ];
  }
}

type ExerciseProgressChartProps = {
  sessions: ExerciseSession[];
  tracking: TrackingType;
  units: UnitSystem;
  timezone: string;
};

export function ExerciseProgressChart({
  sessions,
  tracking,
  units,
  timezone,
}: ExerciseProgressChartProps) {
  const metrics = metricsFor(tracking, units);
  const [selected, setSelected] = useState(metrics[0]!.value);
  const metric = metrics.find((m) => m.value === selected) ?? metrics[0]!;

  const points = sessions.flatMap((s) => {
    const value = metric.pick(s);
    return value === null || value <= 0
      ? []
      : [{ date: localDate(timezone, new Date(s.performed_at)), value }];
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress</CardTitle>
        <CardDescription>{metric.description}</CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        {metrics.length > 1 ? (
          <SegmentedControl
            accessibilityLabel="Chart metric"
            options={metrics}
            value={metric.value}
            onChange={setSelected}
          />
        ) : null}
        {points.length >= 2 ? (
          <>
            <Text>
              <Text className="text-2xl font-semibold">{metric.format(points.at(-1)!.value)}</Text>
              <Text className="text-muted-foreground"> latest</Text>
            </Text>
            <TrendChart
              points={points}
              formatValue={metric.format}
              formatTick={metric.tick}
              accessibilityLabel={`${metric.label}, ${points.length} sessions, from ${metric.format(points[0]!.value)} to ${metric.format(points.at(-1)!.value)}. Every session is listed below.`}
            />
          </>
        ) : (
          <Text className="text-muted-foreground">
            {points.length === 1
              ? `${metric.format(points[0]!.value)} so far. One more session and the trend appears.`
              : 'Finish a workout with this exercise to start the chart.'}
          </Text>
        )}
      </CardContent>
    </Card>
  );
}
