import { Stack, useRouter } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { usePalette } from '../../src/components/ui/colors';
import { useAuth } from '../../src/auth';

export default function OrganizerLayout() {
  const c = usePalette();
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.card },
        headerTintColor: c.foreground,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.background },
        headerRight: () => (
          <Button
            label="Wyloguj"
            variant="ghost"
            onPress={() => {
              void logout();
              router.replace('/login');
            }}
            style={{ height: 34, paddingHorizontal: 8 }}
          />
        ),
      }}
    >
      <Stack.Screen name="teams/index" options={{ title: 'Drużyny' }} />
      <Stack.Screen
        name="teams/[id]"
        options={{ title: 'Drużyna' }}
      />
      <Stack.Screen
        name="scan"
        options={{ title: 'Skanuj QR drużyny' }}
      />
    </Stack>
  );
}
