import * as Location from 'expo-location';
import type { CheckInRequest, PlayerGameState, Visit } from '@pandago/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, View } from 'react-native';
import { api } from '@/src/api';
import { useAuth } from '@/src/auth';
import LeafletMap, { type MapCheckpoint, type MapUserLocation } from '@/src/components/LeafletMap';
import { Button } from '@/src/components/ui/Button';
import { ThemedText } from '@/src/components/ui/ThemedText';
import { usePalette } from '@/src/components/ui/colors';
import { POSITION_INTERVAL_MS } from '@/src/config';

export default function MapScreen() {
  const { auth } = useAuth();
  const c = usePalette();
  const [state, setState] = useState<PlayerGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [userLocation, setUserLocation] = useState<MapUserLocation | null>(null);
  const coordsRef = useRef<MapUserLocation | null>(null);

  const selected = state?.checkpoints.find((cp) => cp.id === selectedId) ?? null;

  const loadState = useCallback(async () => {
    if (!auth?.teamId) return;
    try {
      setState(await api.get<PlayerGameState>(`/teams/${auth.teamId}/state`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nie udało się wczytać stanu gry');
    }
  }, [auth?.teamId]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  // Request foreground GPS permission and watch position continuously.
  // Every fix updates the map; the first fix is reported to the server
  // right away so the admin dashboard sees the team without waiting for
  // the periodic timer below.
  useEffect(() => {
    let cancelled = false;
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        let reportedFirst = false;
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 5000 },
          (pos) => {
            if (cancelled) return;
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            coordsRef.current = coords;
            setUserLocation(coords);
            if (auth?.role === 'player' && !reportedFirst) {
              reportedFirst = true;
              api.post('/positions', coords).catch(() => undefined);
            }
          },
        );
      } catch {
        // GPS unavailable — check-ins and positions simply go without coords
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [auth?.role]);

  // Report position every POSITION_INTERVAL_MS (best-effort, players only).
  useEffect(() => {
    if (auth?.role !== 'player') return;
    const id = setInterval(() => {
      const coords = coordsRef.current;
      if (!coords) return;
      api.post('/positions', coords).catch(() => undefined);
    }, POSITION_INTERVAL_MS);
    return () => clearInterval(id);
  }, [auth?.role]);

  const submitCheckIn = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      const body: CheckInRequest = {
        checkpointId: selected.id,
        ...(coordsRef.current ?? {}),
      };
      const visit = await api.post<Visit>('/checkins', body);
      Alert.alert(
        'Meldunek potwierdzony',
        `${selected.name} · +${visit.points} pkt`,
      );
      setSelectedId(null);
      await loadState();
    } catch (e) {
      Alert.alert(
        'Meldunek nie powiódł się',
        e instanceof Error ? e.message : 'Coś poszło nie tak',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const checkpoints: MapCheckpoint[] = (state?.checkpoints ?? []).map((cp) => ({
    id: cp.id,
    name: cp.name,
    lat: cp.lat,
    lng: cp.lng,
    points: cp.points,
    visited: (state?.visits ?? []).some(
      (v) => v.checkpointId === cp.id && v.status === 'confirmed',
    ),
  }));

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {error ? (
        <View style={{ padding: 16 }}>
          <ThemedText style={{ color: c.destructive }}>{error}</ThemedText>
        </View>
      ) : null}
      {state ? (
        <LeafletMap
          checkpoints={checkpoints}
          userLocation={userLocation}
          onCheckpointPress={setSelectedId}
        />
      ) : (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <ThemedText variant="muted">Ładowanie punktów kontrolnych…</ThemedText>
        </View>
      )}

      <Modal
        visible={selected !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedId(null)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        >
          <View
            style={{
              backgroundColor: c.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderColor: c.border,
              borderWidth: 1,
              padding: 20,
              gap: 12,
            }}
          >
            <ThemedText variant="h2">{selected?.name ?? ''}</ThemedText>
            <ThemedText variant="muted">
              Zamelduj się, aby zdobyć {selected?.points} punktów. Organizator potwierdzi
              meldunek na miejscu i w razie potrzeby skoryguje punkty.
            </ThemedText>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button
                label="Anuluj"
                variant="outline"
                onPress={() => setSelectedId(null)}
                style={{ flex: 1 }}
              />
              <Button
                label={submitting ? 'Zapisywanie…' : 'Zamelduj się'}
                onPress={submitCheckIn}
                loading={submitting}
                disabled={submitting}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
