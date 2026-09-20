import type { ScoreEntry, Team } from '@pandago/shared';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/src/api';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Input } from '@/src/components/ui/Input';
import { ThemedText } from '@/src/components/ui/ThemedText';
import { usePalette } from '@/src/components/ui/colors';

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = usePalette();
  const [team, setTeam] = useState<Team | null>(null);
  const [entries, setEntries] = useState<ScoreEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [delta, setDelta] = useState(10);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const teams = await api.get<Team[]>('/teams');
      const found = teams.find((t) => t.id === id) ?? null;
      setTeam(found);
      setEntries(
        await api.get<ScoreEntry[]>(`/teams/${id}/score-entries`),
      );
      setError(found ? null : 'Nie znaleziono drużyny');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nie udało się wczytać drużyny');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!id || busy || delta === 0 || !reason.trim()) return;
    setBusy(true);
    try {
      await api.post<Team>(`/teams/${id}/score`, {
        delta,
        reason: reason.trim(),
      });
      setReason('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nie udało się przyznać punktów');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {error ? <ThemedText style={{ color: c.destructive }}>{error}</ThemedText> : null}

        {team ? (
          <Card>
            <ThemedText variant="h2">{team.name}</ThemedText>
            <ThemedText variant="h1" style={{ fontSize: 32 }}>
              {team.score} pkt
            </ThemedText>
            <ThemedText variant="small">{team.joinCode}</ThemedText>
          </Card>
        ) : null}

        <Card>
          <ThemedText variant="h2">Przyznaj / odejmij punkty</ThemedText>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Button
              label="−10"
              variant="outline"
              onPress={() => setDelta((d) => d - 10)}
              style={{ flex: 1 }}
            />
            <ThemedText variant="h1" style={{ fontSize: 28, minWidth: 72, textAlign: 'center' }}>
              {delta > 0 ? `+${delta}` : delta}
            </ThemedText>
            <Button
              label="+10"
              variant="outline"
              onPress={() => setDelta((d) => d + 10)}
              style={{ flex: 1 }}
            />
          </View>
          <Input
            placeholder="Powód (np. zadanie bonusowe)"
            value={reason}
            onChangeText={setReason}
            onSubmitEditing={submit}
            editable={!busy}
          />
          <Button
            label={busy ? 'Zapisywanie…' : 'Zastosuj'}
            onPress={submit}
            loading={busy}
            disabled={delta === 0 || !reason.trim()}
          />
        </Card>

        <Card>
          <ThemedText variant="h2">Ostatnie zmiany punktów</ThemedText>
          {entries.length === 0 ? (
            <ThemedText variant="muted">Brak wpisów.</ThemedText>
          ) : (
            entries.map((entry) => (
              <View
                key={entry.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText>{entry.reason}</ThemedText>
                  <ThemedText variant="small">
                    {entry.by} · {new Date(entry.createdAt).toLocaleString()}
                  </ThemedText>
                </View>
                <ThemedText
                  style={{
                    color: entry.delta > 0 ? c.success : c.destructive,
                    fontWeight: '600',
                  }}
                >
                  {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                </ThemedText>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
