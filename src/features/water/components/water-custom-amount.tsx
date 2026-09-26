import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { volumeUnitLabel, type UnitSystem } from '@/lib/units';

import { useAddWater } from '../hooks';
import { customAmountSchema } from '../schemas';

export function WaterCustomAmount({ units }: { units: UnitSystem }) {
  const addWater = useAddWater();
  const form = useForm({
    resolver: zodResolver(customAmountSchema(units)),
    defaultValues: { amount: '' },
  });

  const onSubmit = form.handleSubmit(({ amount }) => {
    addWater.add(amount);
    form.reset();
  });

  return (
    <View className="flex-row items-start gap-2">
      <View className="flex-1">
        <FormField
          control={form.control}
          name="amount"
          label={`Custom amount (${volumeUnitLabel(units)})`}
          keyboardType="number-pad"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
      </View>
      {/* Offset by the label height so the button lines up with the input. */}
      <Button className="mt-7" onPress={onSubmit}>
        <Text>Add</Text>
      </Button>
    </View>
  );
}
