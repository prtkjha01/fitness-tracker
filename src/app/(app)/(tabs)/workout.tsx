import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { LoadingState } from '@/components/loading-state';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { useActiveWorkout } from '@/features/workouts/active-workout-store';
import type { Template } from '@/features/workouts/api';
import { ElapsedTime } from '@/features/workouts/components/elapsed-time';
import { useStartWorkout, useTemplates } from '@/features/workouts/hooks';

export default function WorkoutTab() {
  const hydrated = useActiveWorkout((s) => s.hydrated);
  const workout = useActiveWorkout((s) => s.workout);
  const templates = useTemplates();
  const startWorkout = useStartWorkout();
  const [starting, setStarting] = useState(false);

  const start = async (template?: Template) => {
    setStarting(true);
    try {
      await startWorkout(template);
      router.push('/workout/active');
    } finally {
      setStarting(false);
    }
  };

  if (!hydrated) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="h3">Workout</Text>

      {workout ? (
        <Card>
          <CardHeader>
            <CardTitle>In progress: {workout.name}</CardTitle>
            <CardDescription>
              <ElapsedTime since={workout.started_at} /> ·{' '}
              {workout.exercises.length === 1
                ? '1 exercise'
                : `${workout.exercises.length} exercises`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" onPress={() => router.push('/workout/active')}>
              <Text>Resume workout</Text>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Button size="lg" onPress={() => start()} disabled={starting}>
          <Text>{starting ? 'Starting…' : 'Start empty workout'}</Text>
        </Button>
      )}

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-semibold">Templates</Text>
          <Link href="/templates" asChild>
            <Button variant="link" size="sm">
              <Text>See all</Text>
            </Button>
          </Link>
        </View>
        {templates.data && templates.data.length > 0 ? (
          templates.data.slice(0, 5).map((t, index) => (
            <View key={t.id}>
              {index > 0 ? <Separator /> : null}
              <View className="min-h-14 flex-row items-center gap-2 py-1">
                <Link href={`/templates/${t.id}`} asChild>
                  <Pressable className="flex-1 py-2 active:opacity-60">
                    <Text className="font-medium">{t.name}</Text>
                    <Text className="text-sm text-muted-foreground">
                      {t.template_exercises.length}{' '}
                      {t.template_exercises.length === 1 ? 'exercise' : 'exercises'}
                    </Text>
                  </Pressable>
                </Link>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!!workout || starting}
                  onPress={() => start(t)}
                  aria-label={`Start ${t.name}`}
                >
                  <Text>Start</Text>
                </Button>
              </View>
            </View>
          ))
        ) : (
          <Text className="text-muted-foreground">
            {templates.isPending && !templates.isPaused
              ? 'Loading…'
              : 'Finish a workout and tap “Save as template” to reuse it here.'}
          </Text>
        )}
      </View>

      <Separator />
      <View className="flex-row gap-2">
        <Link href="/workout/history" asChild>
          <Button variant="outline" className="flex-1">
            <Text>History</Text>
          </Button>
        </Link>
        <Link href="/exercises" asChild>
          <Button variant="outline" className="flex-1">
            <Text>Exercises</Text>
          </Button>
        </Link>
      </View>
    </Screen>
  );
}
