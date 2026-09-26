import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type FormFieldProps<T extends FieldValues, TOut> = Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChangeText' | 'onBlur'
> & {
  control: Control<T, any, TOut>;
  name: Path<T>;
  label: string;
  hint?: string;
};

/** Labelled text input bound to react-hook-form, with the field's validation message below it. */
export function FormField<T extends FieldValues, TOut = T>({
  control,
  name,
  label,
  hint,
  className,
  ...inputProps
}: FormFieldProps<T, TOut>) {
  const labelId = `${name}-label`;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <View className="gap-1.5">
          <Label nativeID={labelId}>{label}</Label>
          <Input
            ref={field.ref}
            value={field.value ?? ''}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            aria-labelledby={labelId}
            aria-invalid={!!fieldState.error}
            className={cn(fieldState.error && 'border-destructive', className)}
            {...inputProps}
          />
          {fieldState.error ? (
            <Text className="text-sm text-destructive" role="alert">
              {fieldState.error.message}
            </Text>
          ) : hint ? (
            <Text variant="muted">{hint}</Text>
          ) : null}
        </View>
      )}
    />
  );
}

/** Form-level error, e.g. "Email or password is incorrect." */
export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <View className="rounded-md border border-destructive/40 bg-destructive/10 p-3" role="alert">
      <Text className="text-sm text-destructive">{message}</Text>
    </View>
  );
}
