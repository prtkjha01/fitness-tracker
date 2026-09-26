import { Link, router } from 'expo-router';
import { CircleCheck } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { UnitSystem } from '@/lib/units';

import { useActiveWorkout } from '../active-workout-store';
import { useTodayWorkouts } from '../hooks';
import { formatWorkoutLine } from '../workout-line';
import { ElapsedTime } from './elapsed-time';

type TodayWorkoutCardProps = { today: string; timezone: string; units: UnitSystem };

/** Today's training: in progress, done (with each session), or not yet. */
export function TodayWorkoutCard({ today, timezone, units }: TodayWorkoutCardProps) {
  const active = useActiveWorkout((s) => s.workout);
  const { history, done } = useTodayWorkouts(today, timezone);

  const status = active ? 'In progress' : done.length > 0 ? 'Done' : 'Not yet';

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Workout</CardTitle>
        <Text
          className={
            active
              ? 'font-medium text-sky-600 dark:text-sky-400'
              : done.length > 0
                ? 'font-medium text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground'
          }
        >
          {status}
        </Text>
      </CardHeader>
      <CardContent className="gap-3">
        {active ? (
          <Pressable
            onPress={() => router.push('/workout/active')}
            className="min-h-12 justify-center gap-0.5 active:opacity-70"
            aria-label={`Resume ${active.name}`}
          >
            <Text className="font-semibold">{active.name}</Text>
            <Text className="text-muted-foreground">
              <ElapsedTime since={active.started_at} className="text-muted-foreground" /> ·{' '}
              {active.exercises.length === 1
                ? '1 exercise'
                : `${active.exercises.length} exercises`}
            </Text>
          </Pressable>
        ) : null}

        {done.map((w) => (
          <Pressable
            key={w.id}
            // Not synced yet: its summary is stored locally; otherwise open it from history.
            onPress={() =>
              router.push(
                w.unsynced
                  ? { pathname: '/workout/summary', params: { id: w.id } }
                  : `/workout/${w.id}`,
              )
            }
            className="min-h-12 flex-row items-center gap-3 active:opacity-70"
          >
            <Icon as={CircleCheck} size={20} className="text-emerald-500" />
            <View className="flex-1">
              <Text className="font-medium">{w.name}</Text>
              <Text className="text-sm text-muted-foreground">
                {formatWorkoutLine(w, units)}
                {w.unsynced ? ' · not synced yet' : ''}
              </Text>
            </View>
          </Pressable>
        ))}

        {!active && done.length === 0 ? (
          <Text className="text-muted-foreground">
            {history.isPending && !history.isPaused ? 'Checking…' : 'Nothing logged yet today.'}
          </Text>
        ) : null}

        {active ? (
          <Button onPress={() => router.push('/workout/active')}>
            <Text>Resume workout</Text>
          </Button>
        ) : (
          <Link href="/workout" asChild>
            <Button variant="outline">
              <Text>{done.length > 0 ? 'Train again' : 'Start a workout'}</Text>
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
