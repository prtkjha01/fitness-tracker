import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { LoadingState } from '@/components/loading-state';
import { Screen } from '@/components/screen';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { useActiveWorkout } from '@/features/workouts/active-workout-store';
import {
  useDeleteTemplate,
  useExerciseMap,
  useStartWorkout,
  useTemplates,
} from '@/features/workouts/hooks';

export default function TemplateDetailScreen() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const templates = useTemplates();
  const exercises = useExerciseMap();
  const activeWorkout = useActiveWorkout((s) => s.workout);
  const startWorkout = useStartWorkout();
  const deleteTemplate = useDeleteTemplate();
  const [starting, setStarting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const template = templates.data?.find((t) => t.id === templateId);
  if (!template) {
    return (
      <Screen edges={[]}>
        {templates.data ? <EmptyState title="Template not found" /> : <LoadingState />}
      </Screen>
    );
  }

  const start = async () => {
    setStarting(true);
    try {
      await startWorkout(template);
      router.replace('/workout/active');
    } finally {
      setStarting(false);
    }
  };

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: template.name }} />
      <View>
        {template.template_exercises.map((te, index) => (
          <View key={te.id}>
            {index > 0 ? <Separator /> : null}
            <View className="min-h-12 flex-row items-center justify-between py-2">
              <Text className="font-medium">
                {exercises.get(te.exercise_id)?.name ?? 'Exercise'}
              </Text>
              <Text className="text-muted-foreground">
                {te.target_sets ?? '—'} × {te.target_reps ?? '—'}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <Text variant="muted">Weights are pre-filled from your last session of each exercise.</Text>

      {activeWorkout ? (
        <Button size="lg" variant="secondary" onPress={() => router.push('/workout/active')}>
          <Text>Resume the workout in progress</Text>
        </Button>
      ) : (
        <Button size="lg" onPress={start} disabled={starting}>
          <Text>{starting ? 'Starting…' : 'Start workout'}</Text>
        </Button>
      )}
      <Button variant="ghost" onPress={() => setConfirmDelete(true)}>
        <Text className="text-destructive">Delete template</Text>
      </Button>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{template.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Workouts you already did from it stay in your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive"
              onPress={() => {
                deleteTemplate.remove(template);
                router.back();
              }}
            >
              <Text>Delete</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Screen>
  );
}
