import type { Team } from '@pandago/shared';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { api } from '../../../src/api';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { ThemedText } from '../../../src/components/ui/ThemedText';
import { usePalette } from '../../../src/components/ui/colors';

export default function TeamsScreen() {
  const c = usePalette();
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setTeams(await api.get<Team[]>('/teams'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nie udało się wczytać drużyn');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <ThemedText variant="h1">Drużyny</ThemedText>
        <Button label="Skanuj QR drużyny" onPress={() => router.push('/(organizer)/scan')} />
        {error ? <ThemedText style={{ color: c.destructive }}>{error}</ThemedText> : null}
        {(teams ?? []).map((team) => (
          <Pressable
            key={team.id}
            onPress={() =>
              router.push({
                pathname: '/(organizer)/teams/[id]',
                params: { id: team.id },
              })
            }
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Card>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <ThemedText variant="h2">{team.name}</ThemedText>
                <ThemedText variant="muted">{team.score} pkt</ThemedText>
              </View>
              <ThemedText variant="small">{team.joinCode}</ThemedText>
            </Card>
          </Pressable>
        ))}
        {teams && teams.length === 0 ? (
          <ThemedText variant="muted">Nie ma jeszcze drużyn.</ThemedText>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
