import type { ReactNode } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { usePalette, type Palette } from './colors';

type Variant = 'h1' | 'h2' | 'body' | 'muted' | 'small';

const variants: Record<Variant, (c: Palette) => TextStyle> = {
  h1: (c) => ({ fontSize: 24, fontWeight: '600', letterSpacing: -0.5, color: c.foreground }),
  h2: (c) => ({ fontSize: 16, fontWeight: '600', letterSpacing: -0.25, color: c.foreground }),
  body: (c) => ({ fontSize: 15, fontWeight: '400', color: c.foreground }),
  muted: (c) => ({ fontSize: 14, fontWeight: '400', color: c.muted }),
  small: (c) => ({ fontSize: 12, fontWeight: '400', color: c.muted }),
};

interface ThemedTextProps extends TextProps {
  variant?: Variant;
  children?: ReactNode;
}

export function ThemedText({ variant = 'body', style, ...rest }: ThemedTextProps) {
  const c = usePalette();
  return <Text style={[variants[variant](c), style]} {...rest} />;
}
