import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ThemedText } from './ThemedText';
import { usePalette, type Palette } from './colors';

type Tone = 'default' | 'success' | 'destructive';

const tones: Record<Tone, (c: Palette) => { bg: string; fg: string }> = {
  default: (c) => ({ bg: c.border, fg: c.foreground }),
  success: (c) => ({ bg: `${c.success}22`, fg: c.success }),
  destructive: (c) => ({ bg: `${c.destructive}22`, fg: c.destructive }),
};

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  const c = usePalette();
  const t = tones[tone](c);
  return (
    <View
      style={{
        backgroundColor: t.bg,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 3,
        alignSelf: 'flex-start',
      }}
    >
      <ThemedText style={{ fontSize: 12, fontWeight: '600', color: t.fg }}>
        {children}
      </ThemedText>
    </View>
  );
}
