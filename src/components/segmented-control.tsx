import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type Option<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
};

/** A row of mutually exclusive choices (e.g. metric / imperial). Each segment is 44pt tall. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  return (
    <View
      role="radiogroup"
      aria-label={accessibilityLabel}
      className="flex-row gap-1 rounded-lg bg-muted p-1"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            role="radio"
            aria-checked={selected}
            onPress={() => onChange(option.value)}
            // Selection is a border, not a shadow: NativeWind can't add shadow (CSS-variable)
            // classes to a component after its first render, and in dev that crashes.
            className={cn(
              'h-11 flex-1 items-center justify-center rounded-md border',
              selected ? 'border-border bg-background' : 'border-transparent',
            )}
          >
            <Text
              className={cn(
                'text-sm font-medium',
                selected ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
