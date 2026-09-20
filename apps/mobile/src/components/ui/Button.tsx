import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { usePalette } from './colors';

type Variant = 'primary' | 'outline' | 'ghost' | 'destructive';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const c = usePalette();
  const pressed = { opacity: 0.8 };

  const container: ViewStyle = {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  };
  const textStyle: TextStyle = { fontSize: 15, fontWeight: '600' };

  const variantStyles: Record<Variant, { box: ViewStyle; text: TextStyle }> = {
    primary: {
      box: { backgroundColor: c.primary },
      text: { ...textStyle, color: c.primaryForeground },
    },
    outline: {
      box: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.border },
      text: { ...textStyle, color: c.foreground },
    },
    ghost: {
      box: { backgroundColor: 'transparent' },
      text: { ...textStyle, color: c.foreground },
    },
    destructive: {
      box: { backgroundColor: c.destructive },
      text: { ...textStyle, color: '#ffffff' },
    },
  };

  const v = variantStyles[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed: isPressed }) => [
        container,
        v.box,
        isPressed && pressed,
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text.color} />
      ) : (
        <ThemedText style={v.text}>{label}</ThemedText>
      )}
    </Pressable>
  );
}
