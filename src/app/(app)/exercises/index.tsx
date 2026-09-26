import { Link, router, Stack } from 'expo-router';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ExerciseList } from '@/features/workouts/components/exercise-list';

export default function ExercisesScreen() {
  return (
    <Screen edges={[]}>
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
      <ExerciseList showArchived onPress={(e) => router.push(`/exercises/${e.id}`)} />
    </Screen>
  );
}
