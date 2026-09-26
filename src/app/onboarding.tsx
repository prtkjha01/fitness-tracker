import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';

import { ErrorState } from '@/components/error-state';
import { FormError, FormField } from '@/components/form-field';
import { LoadingState } from '@/components/loading-state';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useSignOut } from '@/features/auth/hooks';
import type { Profile } from '@/features/profile/api';
import { useProfile, useUpdateProfile } from '@/features/profile/hooks';
import { onboardingSchema } from '@/features/profile/schemas';
import { getDeviceUnits } from '@/lib/locale';
import {
  displayVolumeToMl,
  mlToDisplayVolume,
  volumeUnitLabel,
  type UnitSystem,
} from '@/lib/units';

const UNIT_OPTIONS = [
  { value: 'metric', label: 'Metric (kg, ml)' },
  { value: 'imperial', label: 'Imperial (lb, fl oz)' },
] as const;

export default function OnboardingScreen() {
  const profile = useProfile();

  return (
    <Screen>
      <View className="gap-1">
        <Text variant="h3">Welcome</Text>
        <Text className="text-muted-foreground">
          A few basics to set up your goals. You can change these later in Settings.
        </Text>
      </View>
      {profile.data ? (
        <OnboardingForm profile={profile.data} />
      ) : profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
      ) : (
        <LoadingState />
      )}
    </Screen>
  );
}

function OnboardingForm({ profile }: { profile: Profile }) {
  const update = useUpdateProfile();
  const signOut = useSignOut();
  const initialUnits = getDeviceUnits();

  const form = useForm({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      display_name: profile.display_name ?? '',
      units: initialUnits,
      daily_calorie_goal: String(profile.daily_calorie_goal),
      daily_water_goal: String(mlToDisplayVolume(profile.daily_water_goal_ml, initialUnits)),
    },
  });
  const units = useWatch({ control: form.control, name: 'units' });

  // Keep the typed water amount the same quantity when switching unit systems.
  const changeUnits = (next: UnitSystem, onChange: (value: UnitSystem) => void) => {
    const typed = Number(form.getValues('daily_water_goal'));
    if (next !== units && Number.isFinite(typed) && typed > 0) {
      const ml = displayVolumeToMl(typed, units);
      form.setValue('daily_water_goal', String(mlToDisplayVolume(ml, next)));
    }
    onChange(next);
  };

  // On success the cached profile has onboarded_at set and the root guard opens the app.
  const onSubmit = form.handleSubmit((values) =>
    update.mutate({ ...values, onboarded_at: new Date().toISOString() }),
  );

  return (
    <>
      <FormError message={update.error?.message} />
      <FormField
        control={form.control}
        name="display_name"
        label="What should we call you?"
        autoComplete="given-name"
        textContentType="givenName"
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={() => form.setFocus('daily_calorie_goal')}
      />

      <View className="gap-1.5">
        <Label nativeID="units-label">Units</Label>
        <Controller
          control={form.control}
          name="units"
          render={({ field }) => (
            <SegmentedControl
              accessibilityLabel="Units"
              options={UNIT_OPTIONS}
              value={field.value}
              onChange={(next) => changeUnits(next, field.onChange)}
            />
          )}
        />
      </View>

      <FormField
        control={form.control}
        name="daily_calorie_goal"
        label="Daily calorie goal (kcal)"
        keyboardType="number-pad"
        returnKeyType="next"
        onSubmitEditing={() => form.setFocus('daily_water_goal')}
      />
      <FormField
        control={form.control}
        name="daily_water_goal"
        label={`Daily water goal (${volumeUnitLabel(units)})`}
        keyboardType="number-pad"
        returnKeyType="done"
      />

      <Button size="lg" onPress={onSubmit} disabled={update.isPending}>
        <Text>{update.isPending ? 'Saving…' : 'Get started'}</Text>
      </Button>
      <Button variant="ghost" onPress={() => signOut.mutate()} disabled={signOut.isPending}>
        <Text>Sign out</Text>
      </Button>
    </>
  );
}
