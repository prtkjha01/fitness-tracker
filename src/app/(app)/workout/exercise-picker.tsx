import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { EditorTarget } from '@/features/workouts/active-workout-store';
import { ExerciseList } from '@/features/workouts/components/exercise-list';
import { useAddExercises } from '@/features/workouts/hooks';

export default function ExercisePickerScreen() {
  const params = useLocalSearchParams<{ target?: string }>();
  const target: EditorTarget = params.target === 'edit' ? 'edit' : 'active';
  const addExercises = useAddExercises(target);
  // An array, so exercises are added in the order they were tapped.
  const [picked, setPicked] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  const toggle = (id: string) =>
    setPicked((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  const add = async () => {
    setAdding(true);
    try {
      await addExercises(picked);
      router.back();
    } finally {
      setAdding(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/exercises/new" asChild>
              <Button variant="ghost" size="sm">
                <Text>New</Text>
              </Button>
            </Link>
          ),
        }}
      />
      <ScrollView contentContainerClassName="p-4 pb-8" keyboardShouldPersistTaps="handled">
        <ExerciseList selected={new Set(picked)} onPress={(e) => toggle(e.id)} />
      </ScrollView>
      <SafeAreaView edges={['bottom']} className="border-t border-border bg-card px-4 pt-3">
        <Button size="lg" disabled={picked.length === 0 || adding} onPress={add}>
          <Text>
            {adding
              ? 'Adding…'
              : picked.length === 0
                ? 'Select exercises'
                : `Add ${picked.length} ${picked.length === 1 ? 'exercise' : 'exercises'}`}
          </Text>
        </Button>
      </SafeAreaView>
    </View>
  );
}
