import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { UnitSystem } from '@/lib/units';

import type { Exercise } from '../api';
import type { WorkoutDraft } from '../draft';
import { formatSet } from '../format';

type WorkoutSetsViewProps = {
  workout: WorkoutDraft;
  exercises: Map<string, Exercise>;
  units: UnitSystem;
};

/** Read-only list of a workout's exercises and sets. */
export function WorkoutSetsView({ workout, exercises, units }: WorkoutSetsViewProps) {
  return (
    <>
      {workout.exercises.map((e) => {
        const meta = exercises.get(e.exercise_id);
        let working = 0;
        return (
          <Card key={e.id} className="py-4">
            <CardContent className="gap-1 px-4">
              <Link href={`/exercises/${e.exercise_id}`} asChild>
                <Pressable className="min-h-11 justify-center active:opacity-60">
                  <Text className="text-lg font-semibold text-sky-700 dark:text-sky-400">
                    {meta?.name ?? 'Exercise'}
                  </Text>
                </Pressable>
              </Link>
              {e.notes ? <Text className="italic text-muted-foreground">{e.notes}</Text> : null}
              {e.sets.map((s) => (
                <View key={s.id} className="flex-row gap-3 py-0.5">
                  <Text
                    className={
                      s.is_warmup
                        ? 'w-6 font-semibold text-amber-600 dark:text-amber-400'
                        : 'w-6 font-semibold'
                    }
                  >
                    {s.is_warmup ? 'W' : ++working}
                  </Text>
                  <Text>{formatSet(s, meta?.tracking_type ?? 'weight_reps', units)}</Text>
                </View>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}
