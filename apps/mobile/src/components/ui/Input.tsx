import { TextInput, type TextInputProps } from 'react-native';
import { usePalette } from './colors';

export function Input(props: TextInputProps) {
  const c = usePalette();
  return (
    <TextInput
      placeholderTextColor={c.muted}
      style={{
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.card,
        color: c.foreground,
        paddingHorizontal: 14,
        fontSize: 15,
      }}
      {...props}
    />
  );
}
