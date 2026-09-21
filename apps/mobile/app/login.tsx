import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { ThemedText } from '../src/components/ui/ThemedText';
import { Button } from '../src/components/ui/Button';
import { Input } from '../src/components/ui/Input';
import { usePalette } from '../src/components/ui/colors';
import { useAuth } from '../src/auth';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const c = usePalette();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = await login(code);
      router.dismissAll();
      router.replace(
        session.role === 'player' ? '/(player)/map' : '/(organizer)/teams',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Logowanie nie powiodło się');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Image
            source={require('../assets/panda-logo.png')}
            style={{ width: 72, height: 72, borderRadius: 20, marginBottom: 16 }}
            resizeMode="cover"
          />
          <ThemedText variant="h1">PandaGo</ThemedText>
          <ThemedText variant="muted" style={{ marginTop: 6 }}>
            Wejdź do gry swoim kodem drużyny
          </ThemedText>
        </View>

        <View style={{ gap: 12 }}>
          <Input
            placeholder="TEAM-ALPHA or ORG-001"
            autoCapitalize="characters"
            autoCorrect={false}
            value={code}
            onChangeText={setCode}
            onSubmitEditing={submit}
            editable={!busy}
          />
          {error ? (
            <ThemedText style={{ color: c.destructive, fontSize: 14 }}>
              {error}
            </ThemedText>
          ) : null}
          <Button
            label={busy ? 'Logowanie…' : 'Wejdź'}
            onPress={submit}
            loading={busy}
            disabled={!code.trim()}
          />
          <ThemedText variant="small" style={{ textAlign: 'center', marginTop: 8 }}>
            Gracze logują się kodem drużyny · Organizatorzy kodem ORG-001
          </ThemedText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
