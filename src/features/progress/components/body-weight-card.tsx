import { format, parseISO } from 'date-fns';
import { Link } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { SegmentedControl } from '@/components/segmented-control';
import { TrendChart } from '@/components/trend-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { shiftDate } from '@/lib/dates';
import { formatWeight, kgToDisplayWeight, weightUnitLabel, type UnitSystem } from '@/lib/units';

import type { BodyWeight } from '../api';
import { useBodyWeights } from '../hooks';

const RANGES = [
  { value: '90', label: '3 months' },
  { value: '365', label: '1 year' },
  { value: 'all', label: 'All' },
] as const;
type Range = (typeof RANGES)[number]['value'];

/** Latest weight vs ~30 days earlier (the entry on or before that day). */
function change30(entries: BodyWeight[]): number | null {
  const latest = entries.at(-1);
  if (!latest) return null;
  const cutoff = shiftDate(latest.measured_on, -30);
  const before = [...entries].reverse().find((e) => e.measured_on <= cutoff);
  return before ? latest.weight_kg - before.weight_kg : null;
}

export function BodyWeightCard({ today, units }: { today: string; units: UnitSystem }) {
  const weights = useBodyWeights();
  const [range, setRange] = useState<Range>('90');

  const entries = weights.data ?? [];
  const latest = entries.at(-1);
  const delta = change30(entries);
  const shown =
    range === 'all'
      ? entries
      : entries.filter((e) => e.measured_on >= shiftDate(today, -Number(range)));
  const unit = weightUnitLabel(units);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Body weight</CardTitle>
        <Link href="/body-weight" asChild>
          <Button size="sm" variant="secondary">
            <Text>{latest?.measured_on === today ? 'Update today' : 'Log weight'}</Text>
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="gap-4">
        {weights.isPending && !weights.isPaused ? (
          <LoadingState />
        ) : weights.isError && !weights.data ? (
          <ErrorState error={weights.error} onRetry={() => weights.refetch()} />
        ) : !latest ? (
          <Text className="text-muted-foreground">
            Log your weight now and then to see the trend here.
          </Text>
        ) : (
          <>
            {/* Stat tile: value + neutral signed delta (whether down is good depends on the goal). */}
            <View accessible aria-label={`Latest ${formatWeight(latest.weight_kg, units)}`}>
              <Text className="text-3xl font-semibold">
                {formatWeight(latest.weight_kg, units)}
              </Text>
              <Text className="text-muted-foreground">
                {format(parseISO(latest.measured_on), 'MMM d')}
                {delta !== null
                  ? ` · ${delta > 0 ? '+' : delta < 0 ? '−' : '±'}${kgToDisplayWeight(Math.abs(delta), units)} ${unit} in 30 days`
                  : ''}
              </Text>
            </View>
            <SegmentedControl
              accessibilityLabel="Time range"
              options={RANGES}
              value={range}
              onChange={setRange}
            />
            {shown.length >= 2 ? (
              <TrendChart
                points={shown.map((e) => ({
                  date: e.measured_on,
                  value: kgToDisplayWeight(e.weight_kg, units),
                }))}
                formatValue={(v) => `${v.toLocaleString()} ${unit}`}
                formatTick={(v) => String(Math.round(v * 10) / 10)}
                accessibilityLabel={`Body weight, ${shown.length} entries, from ${formatWeight(shown[0]!.weight_kg, units)} to ${formatWeight(shown.at(-1)!.weight_kg, units)}. Open the log for every entry.`}
              />
            ) : (
              <Text className="text-muted-foreground">
                One more entry in this range and the trend line appears.
              </Text>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
