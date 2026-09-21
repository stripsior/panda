import type { PlayerGameState } from '@pandago/shared';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth';
import { teamQrPayload } from '../../src/qr';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { usePalette } from '../../src/components/ui/colors';

export default function StatusScreen() {
  const { auth, logout } = useAuth();
  const router = useRouter();
  const c = usePalette();
  const [state, setState] = useState<PlayerGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!auth?.teamId) return;
    try {
      setState(await api.get<PlayerGameState>(`/teams/${auth.teamId}/state`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nie udało się wczytać statusu');
    }
  }, [auth?.teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const confirmedVisits = state
    ? state.visits.filter((v) => v.status === 'confirmed')
    : [];
  const doneIds = new Set(confirmedVisits.map((v) => v.checkpointId));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <ThemedText variant="h1">{auth?.displayName ?? 'Drużyna'}</ThemedText>
          <Button
            label="Wyloguj"
            variant="ghost"
            onPress={() => {
              void logout();
              router.replace('/login');
            }}
            style={{ height: 36, paddingHorizontal: 8 }}
          />
        </View>

        {error ? <ThemedText style={{ color: c.destructive }}>{error}</ThemedText> : null}

        {state ? (
          <>
            <Card>
              <ThemedText variant="h2">QR drużyny</ThemedText>
              <ThemedText variant="muted">
                Pokaż to organizatorowi, aby otrzymać punkty
              </ThemedText>
              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 12,
                  padding: 16,
                  alignSelf: 'center',
                  marginTop: 8,
                }}
              >
                <QRCode value={teamQrPayload(state.team.id)} size={200} color="#09090b" />
              </View>
            </Card>

            <Card>
              <ThemedText variant="muted">Wynik</ThemedText>
              <ThemedText variant="h1" style={{ fontSize: 32 }}>
                {state.team.score}
              </ThemedText>
              <ThemedText variant="small">
                {confirmedVisits.length} of {state.checkpoints.length} punktów kontrolnych
                odwiedzonych
              </ThemedText>
            </Card>

            <Card>
              <ThemedText variant="h2">Punkty kontrolne</ThemedText>
              {state.checkpoints.map((cp) => (
                <View
                  key={cp.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <ThemedText>
                    <ThemedText variant="muted">{cp.orderIndex}. </ThemedText>
                    {cp.name}
                  </ThemedText>
                  {doneIds.has(cp.id) ? <Badge tone="success">✓</Badge> : null}
                </View>
              ))}
            </Card>

            <Card>
              <ThemedText variant="h2">Ranking</ThemedText>
              {state.leaderboard.map((entry, index) => (
                <View
                  key={entry.teamId}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <ThemedText
                    style={
                      entry.teamId === state.team.id
                        ? { fontWeight: '600' }
                        : undefined
                    }
                  >
                    {index + 1}. {entry.teamName}
                  </ThemedText>
                  <ThemedText variant="muted">
                    {entry.score} · {entry.checkpointsVisited} pk
                  </ThemedText>
                </View>
              ))}
            </Card>
          </>
        ) : (
          <ThemedText variant="muted">Ładowanie…</ThemedText>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
