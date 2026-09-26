import { useEffect } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { useNow } from '@/hooks/use-now';
import { formatDuration } from '@/lib/duration';

import { useActiveWorkout } from '../active-workout-store';
import { adjustRest, completeRest, skipRest } from '../rest-timer';

/** Countdown pinned under the workout while resting. Derived from a timestamp, not ticks. */
export function RestBar() {
  const rest = useActiveWorkout((s) => s.rest);
  const now = useNow(250);
  const remaining = rest ? Math.ceil((new Date(rest.endsAt).getTime() - now) / 1000) : 0;

  useEffect(() => {
    if (rest && remaining <= 0) completeRest();
  }, [rest, remaining]);

  if (!rest || remaining <= 0) return null;

  return (
    <View className="gap-2 border-t border-border bg-card px-4 pb-2 pt-3">
      <View className="flex-row items-center justify-between">
        <View accessible aria-label={`Rest, ${remaining} seconds left`} aria-live="polite">
          <Text variant="muted">Rest</Text>
          <Text className="text-3xl font-semibold tabular-nums">{formatDuration(remaining)}</Text>
        </View>
        <View className="flex-row gap-2">
          <Button variant="outline" onPress={() => adjustRest(-15)} aria-label="15 seconds less">
            <Text>−15</Text>
          </Button>
          <Button variant="outline" onPress={() => adjustRest(15)} aria-label="15 seconds more">
            <Text>+15</Text>
          </Button>
          <Button variant="secondary" onPress={skipRest}>
            <Text>Skip</Text>
          </Button>
        </View>
      </View>
      <Progress
        value={(remaining / Math.max(rest.totalSeconds, 1)) * 100}
        className="h-1.5"
        indicatorClassName="bg-sky-500"
      />
    </View>
  );
}
