import { useColorScheme } from 'react-native';

// shadcn-like neutral zinc palette.
export interface Palette {
  background: string;
  foreground: string;
  card: string;
  border: string;
  muted: string;
  primary: string;
  primaryForeground: string;
  destructive: string;
  success: string;
}

export const zinc: Record<'light' | 'dark', Palette> = {
  light: {
    background: '#fafafa',
    foreground: '#09090b',
    card: '#ffffff',
    border: '#e4e4e7',
    muted: '#71717a',
    primary: '#18181b',
    primaryForeground: '#fafafa',
    destructive: '#dc2626',
    success: '#16a34a',
  },
  dark: {
    background: '#09090b',
    foreground: '#fafafa',
    card: '#09090b',
    border: '#27272a',
    muted: '#a1a1aa',
    primary: '#fafafa',
    primaryForeground: '#18181b',
    destructive: '#ef4444',
    success: '#22c55e',
  },
};

export function usePalette(): Palette {
  const scheme = useColorScheme();
  return scheme === 'dark' ? zinc.dark : zinc.light;
}
