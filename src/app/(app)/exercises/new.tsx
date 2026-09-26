import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm, type Control } from 'react-hook-form';
import { View } from 'react-native';
import type { z } from 'zod';

import { FormField } from '@/components/form-field';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import {
  CATEGORY_LABELS,
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
  TRACKING_LABELS,
} from '@/features/workouts/format';
import { useCreateExercise, useExercises } from '@/features/workouts/hooks';
import { exerciseFormSchema } from '@/features/workouts/schemas';

type FormInput = z.input<typeof exerciseFormSchema>;

const DEFAULTS: FormInput = {
  name: '',
  category: 'strength',
  muscle_group: 'chest',
  equipment: 'barbell',
  tracking_type: 'weight_reps',
};

export default function NewExerciseScreen() {
  const exercises = useExercises();
  const createExercise = useCreateExercise();
  const form = useForm({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues: DEFAULTS,
  });

  const onSubmit = form.handleSubmit((values) => {
    // Custom names are unique per user (case-insensitive); catch it here rather than
    // letting a queued insert fail later.
    const taken = exercises.data?.some(
      (e) => e.user_id !== null && e.name.toLowerCase() === values.name.toLowerCase(),
    );
    if (taken) {
      form.setError('name', { message: 'You already have an exercise with this name' });
      return;
    }
    createExercise.create(values);
    router.back();
  });

  return (
    <Screen edges={[]}>
      <FormField
        control={form.control}
        name="name"
        label="Name"
        placeholder="e.g. Incline Dumbbell Curl"
        autoCapitalize="words"
        autoFocus
      />
      <ChipField
        control={form.control}
        name="tracking_type"
        label="What you log"
        labels={TRACKING_LABELS}
      />
      <ChipField
        control={form.control}
        name="muscle_group"
        label="Main muscle"
        labels={MUSCLE_LABELS}
      />
      <ChipField
        control={form.control}
        name="equipment"
        label="Equipment"
        labels={EQUIPMENT_LABELS}
      />
      <ChipField control={form.control} name="category" label="Category" labels={CATEGORY_LABELS} />
      <Button size="lg" onPress={onSubmit}>
        <Text>Create exercise</Text>
      </Button>
    </Screen>
  );
}

type ChipName = Exclude<keyof FormInput, 'name'>;

function ChipField<N extends ChipName>({
  control,
  name,
  label,
  labels,
}: {
  control: Control<FormInput, any, z.output<typeof exerciseFormSchema>>;
  name: N;
  label: string;
  labels: Record<FormInput[N], string>;
}) {
  const labelId = `${name}-label`;
  return (
    <View className="gap-1.5">
      <Label nativeID={labelId}>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <View className="flex-row flex-wrap gap-2" role="radiogroup" aria-labelledby={labelId}>
            {(Object.entries(labels) as [FormInput[N], string][]).map(([value, text]) => (
              <Button
                key={value}
                size="sm"
                variant={field.value === value ? 'default' : 'secondary'}
                onPress={() => field.onChange(value)}
                role="radio"
                aria-checked={field.value === value}
              >
                <Text>{text}</Text>
              </Button>
            ))}
          </View>
        )}
      />
    </View>
  );
}
