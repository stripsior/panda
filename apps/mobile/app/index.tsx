import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../src/auth';
import { ThemedText } from '../src/components/ui/ThemedText';
import { usePalette } from '../src/components/ui/colors';

export default function IndexRedirect() {
  const { auth, loading } = useAuth();
  const router = useRouter();
  const c = usePalette();

  useEffect(() => {
    if (loading) return;
    if (!auth) {
      router.replace('/login');
    } else if (auth.role === 'player') {
      router.replace('/(player)/map');
    } else {
      // organizer (and admin) both use the organizer console
      router.replace('/(organizer)/teams');
    }
  }, [auth, loading, router]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.background,
      }}
    >
      <ActivityIndicator size="large" color={c.muted} />
      <ThemedText variant="muted" style={{ marginTop: 12 }}>
        Ładowanie PandaGo…
      </ThemedText>
    </View>
  );
}
