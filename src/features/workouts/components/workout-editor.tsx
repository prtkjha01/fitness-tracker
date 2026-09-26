import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';

import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { UnitSystem } from '@/lib/units';

import type { EditorTarget } from '../active-workout-store';
import type { DraftSet, WorkoutDraft } from '../draft';
import { useExerciseMap, useLastPerformance } from '../hooks';
import { ExerciseCard } from './exercise-card';

type WorkoutEditorProps = {
  draft: WorkoutDraft;
  update: (fn: (draft: WorkoutDraft) => WorkoutDraft) => void;
  target: EditorTarget;
  units: UnitSystem;
  onSetCompleted?: (set: DraftSet) => void;
};

/** The exercise cards of a workout plus "Add exercises"; shared by live and past workouts. */
export function WorkoutEditor({
  draft,
  update,
  target,
  units,
  onSetCompleted,
}: WorkoutEditorProps) {
  const exercises = useExerciseMap();
  const previous = useLastPerformance(
    target === 'active' ? [...new Set(draft.exercises.map((e) => e.exercise_id))] : [],
  );

  return (
    <>
      {draft.exercises.length === 0 ? (
        <EmptyState
          title="No exercises yet"
          description="Add the first exercise to start logging sets."
        />
      ) : (
        draft.exercises.map((exercise, index) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            meta={exercises.get(exercise.exercise_id)}
            units={units}
            previous={previous.get(exercise.exercise_id) ?? []}
            mode={target}
            isFirst={index === 0}
            isLast={index === draft.exercises.length - 1}
            update={update}
            onSetCompleted={onSetCompleted}
          />
        ))
      )}
      <Button
        variant="outline"
        size="lg"
        onPress={() => router.push({ pathname: '/workout/exercise-picker', params: { target } })}
      >
        <Icon as={Plus} size={18} className="text-foreground" />
        <Text>Add exercises</Text>
      </Button>
    </>
  );
}
