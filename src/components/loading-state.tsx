import { ActivityIndicator, View } from 'react-native';

import { Text } from '@/components/ui/text';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View className="items-center justify-center gap-3 py-12" accessibilityLabel={label}>
      <ActivityIndicator />
      <Text className="text-muted-foreground">{label}</Text>
    </View>
  );
}
