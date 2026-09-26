import { View } from 'react-native';

import { Text } from '@/components/ui/text';

import type { Consistency } from '../streak';

/** Headline numbers as stat tiles: the numbers are the chart. */
export function ConsistencyTiles({ stats }: { stats: Consistency }) {
  const tiles = [
    {
      label: 'Week streak',
      value: String(stats.weekStreak),
      detail: stats.weekStreak === 1 ? 'week in a row' : 'weeks in a row',
    },
    { label: 'This week', value: String(stats.thisWeek), detail: plural(stats.thisWeek) },
    { label: 'Last 30 days', value: String(stats.last30Days), detail: plural(stats.last30Days) },
  ];
  return (
    <View className="flex-row gap-2">
      {tiles.map((t) => (
        <View
          key={t.label}
          className="flex-1 gap-0.5 rounded-lg bg-muted p-3"
          accessible
          aria-label={`${t.label}: ${t.value} ${t.detail}`}
        >
          <Text variant="muted" numberOfLines={1}>
            {t.label}
          </Text>
          <Text className="text-2xl font-semibold">{t.value}</Text>
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {t.detail}
          </Text>
        </View>
      ))}
    </View>
  );
}

function plural(n: number) {
  return n === 1 ? 'workout' : 'workouts';
}
