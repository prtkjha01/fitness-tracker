import { View } from 'react-native';

import { Progress } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

import type { DayTotals } from '../nutrients';

const MACROS = [
  { key: 'protein_g', label: 'Protein', kcalPerGram: 4, color: 'bg-rose-500' },
  { key: 'carbs_g', label: 'Carbs', kcalPerGram: 4, color: 'bg-amber-500' },
  { key: 'fat_g', label: 'Fat', kcalPerGram: 9, color: 'bg-violet-500' },
] as const;

type CalorieSummaryProps = { totals: DayTotals; goal: number };

export function CalorieSummary({ totals, goal }: CalorieSummaryProps) {
  const percent = goal > 0 ? Math.round((totals.calories / goal) * 100) : 0;
  const remaining = goal - totals.calories;
  const macroKcal = MACROS.map((m) => totals[m.key] * m.kcalPerGram);
  const macroKcalTotal = macroKcal.reduce((a, b) => a + b, 0);

  return (
    <View className="gap-4">
      <View
        className="gap-2"
        accessible
        aria-label={`${totals.calories} of ${goal} calories, ${Math.abs(remaining)} ${remaining >= 0 ? 'left' : 'over'}`}
      >
        <View className="flex-row items-baseline justify-between">
          <Text className="text-2xl font-semibold">
            {totals.calories.toLocaleString()}{' '}
            <Text className="text-base text-muted-foreground">/ {goal.toLocaleString()} kcal</Text>
          </Text>
          <Text
            className={cn(
              'font-medium',
              remaining < 0 ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {remaining >= 0
              ? `${remaining.toLocaleString()} left`
              : `${(-remaining).toLocaleString()} over`}
          </Text>
        </View>
        <Progress
          value={Math.min(percent, 100)}
          className="h-3"
          indicatorClassName={remaining < 0 ? 'bg-destructive' : 'bg-emerald-500'}
        />
      </View>

      {/* Share of calories from each macro, as one stacked bar plus gram totals. */}
      <View className="gap-2">
        <View className="h-2 flex-row overflow-hidden rounded-full bg-muted">
          {macroKcalTotal > 0
            ? MACROS.map((m, i) => (
                <View
                  key={m.key}
                  className={m.color}
                  style={{ flex: macroKcal[i]! / macroKcalTotal }}
                />
              ))
            : null}
        </View>
        <View className="flex-row justify-between">
          {MACROS.map((m, i) => (
            <View key={m.key} className="flex-row items-center gap-1.5">
              <View className={cn('size-2.5 rounded-full', m.color)} />
              <Text className="text-sm">
                {m.label} <Text className="text-sm font-semibold">{totals[m.key]} g</Text>
                {macroKcalTotal > 0 ? (
                  <Text className="text-sm text-muted-foreground">
                    {' '}
                    {Math.round((macroKcal[i]! / macroKcalTotal) * 100)}%
                  </Text>
                ) : null}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
