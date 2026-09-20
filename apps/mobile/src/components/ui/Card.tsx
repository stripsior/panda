import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { usePalette } from './colors';

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
}) {
  const c = usePalette();
  return (
    <View
      style={[
        {
          backgroundColor: c.card,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: 12,
          padding: 16,
          gap: 8,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
