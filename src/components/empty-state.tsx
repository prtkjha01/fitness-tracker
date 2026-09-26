import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <View className="items-center justify-center gap-2 py-12">
      <Text className="font-semibold">{title}</Text>
      {description ? (
        <Text className="text-center text-muted-foreground">{description}</Text>
      ) : null}
      {action}
    </View>
  );
}
