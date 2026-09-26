import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ellipsis, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { distanceUnitLabel, weightUnitLabel, type UnitSystem } from '@/lib/units';

import type { Exercise } from '../api';
import {
  edit,
  type DraftExercise,
  type DraftSet,
  type SetValues,
  type TrackingType,
  type WorkoutDraft,
} from '../draft';
import { SetRow } from './set-row';

type ExerciseCardProps = {
  exercise: DraftExercise;
  meta: Exercise | undefined;
  units: UnitSystem;
  /** Last session's sets for this exercise, matched to rows by position. */
  previous: SetValues[];
  mode: 'active' | 'edit';
  isFirst: boolean;
  isLast: boolean;
  update: (fn: (draft: WorkoutDraft) => WorkoutDraft) => void;
  /** Active workouts start the rest timer when a set is completed. */
  onSetCompleted?: (set: DraftSet) => void;
};

export function ExerciseCard({
  exercise,
  meta,
  units,
  previous,
  mode,
  isFirst,
  isLast,
  update,
  onSetCompleted,
}: ExerciseCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const tracking = meta?.tracking_type ?? 'weight_reps';
  const name = meta?.name ?? 'Exercise';

  let working = 0;
  const labels = exercise.sets.map((s) => (s.is_warmup ? 'W' : String(++working)));

  const menuAction = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  return (
    <Card className="gap-3 py-4">
      <CardContent className="gap-2 px-3">
        <View className="flex-row items-center justify-between">
          <Pressable
            className="min-h-11 flex-1 justify-center active:opacity-60"
            onPress={() => router.push(`/exercises/${exercise.exercise_id}`)}
            aria-label={`${name}. Open exercise history`}
          >
            <Text
              className="text-lg font-semibold text-sky-700 dark:text-sky-400"
              numberOfLines={1}
            >
              {name}
            </Text>
          </Pressable>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => setMenuOpen(true)}
            aria-label={`Options for ${name}`}
          >
            <Icon as={Ellipsis} size={20} className="text-foreground" />
          </Button>
        </View>

        {exercise.notes !== null ? (
          <Input
            value={exercise.notes}
            onChangeText={(notes) => update((d) => edit.setExerciseNotes(d, exercise.id, notes))}
            placeholder="Note for this exercise"
            aria-label={`Note for ${name}`}
            multiline
            className="h-auto min-h-11 py-2"
          />
        ) : null}

        <ColumnHeaders tracking={tracking} units={units} />

        {exercise.sets.map((set, index) => (
          <SetRow
            key={set.id}
            set={set}
            label={labels[index]!}
            tracking={tracking}
            units={units}
            previous={previous[index]}
            onChange={(patch) => update((d) => edit.updateSet(d, exercise.id, set.id, patch))}
            onToggleWarmup={() =>
              update((d) => edit.updateSet(d, exercise.id, set.id, { is_warmup: !set.is_warmup }))
            }
            onRemove={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              update((d) => edit.removeSet(d, exercise.id, set.id));
            }}
            onToggleComplete={() => {
              update((d) => edit.toggleComplete(d, exercise.id, set.id, previous[index]));
              if (!set.is_completed) {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSetCompleted?.(set);
              }
            }}
          />
        ))}

        <Button
          variant="secondary"
          onPress={() =>
            update((d) =>
              edit.addSet(d, exercise.id, {
                completed: mode === 'edit',
                fallback: previous[exercise.sets.length],
              }),
            )
          }
          aria-label={`Add a set to ${name}`}
        >
          <Icon as={Plus} size={16} className="text-secondary-foreground" />
          <Text>Add set</Text>
        </Button>
        <Text variant="muted" className="text-center text-xs">
          Tap a set number for warm-up · long-press it to delete
        </Text>
      </CardContent>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="w-80 max-w-full">
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
          </DialogHeader>
          <View className="gap-2">
            <Button
              variant="outline"
              disabled={isFirst}
              onPress={menuAction(() => update((d) => edit.moveExercise(d, exercise.id, -1)))}
            >
              <Text>Move up</Text>
            </Button>
            <Button
              variant="outline"
              disabled={isLast}
              onPress={menuAction(() => update((d) => edit.moveExercise(d, exercise.id, 1)))}
            >
              <Text>Move down</Text>
            </Button>
            <Button
              variant="outline"
              onPress={menuAction(() =>
                update((d) =>
                  edit.setExerciseNotes(d, exercise.id, exercise.notes === null ? '' : null),
                ),
              )}
            >
              <Text>{exercise.notes === null ? 'Add note' : 'Remove note'}</Text>
            </Button>
            <Button
              variant="destructive"
              onPress={menuAction(() => update((d) => edit.removeExercise(d, exercise.id)))}
            >
              <Text>Remove exercise</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ColumnHeaders({ tracking, units }: { tracking: TrackingType; units: UnitSystem }) {
  const columns = {
    weight_reps: [weightUnitLabel(units), 'Reps'],
    reps: ['Reps'],
    duration: ['Time'],
    distance_duration: [distanceUnitLabel(units), 'Time'],
  }[tracking];
  return (
    <View className="flex-row items-center gap-2 px-1">
      <Text className="w-11 text-center text-xs font-semibold text-muted-foreground">Set</Text>
      <Text className="w-20 text-xs font-semibold text-muted-foreground">Previous</Text>
      {columns.map((c) => (
        <Text key={c} className="flex-1 text-center text-xs font-semibold text-muted-foreground">
          {c}
        </Text>
      ))}
      <View className="w-11" />
    </View>
  );
}
