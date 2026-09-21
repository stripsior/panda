import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { AuthProvider } from '../src/auth';
import { usePalette } from '../src/components/ui/colors';

function RootStack() {
  const c = usePalette();
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.background },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const c = usePalette();
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <AuthProvider>
        <RootStack />
      </AuthProvider>
    </View>
  );
}
