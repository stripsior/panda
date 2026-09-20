import { useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Button } from '@/src/components/ui/Button';
import { ThemedText } from '@/src/components/ui/ThemedText';
import { usePalette } from '@/src/components/ui/colors';
import { parseTeamQr } from '@/src/qr';

export default function ScanScreen() {
  const c = usePalette();
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const scannedRef = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();

  const onScanned = ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    const teamId = parseTeamQr(data);
    if (!teamId) {
      setError('To nie jest kod QR drużyny PandaGo');
      return;
    }
    scannedRef.current = true;
    setLocked(true);
    router.replace({
      pathname: '/(organizer)/teams/[id]',
      params: { id: teamId },
    });
  };

  if (!permission?.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
          <ThemedText style={{ textAlign: 'center' }}>
            Do skanowania kodów QR drużyn potrzebny jest dostęp do aparatu.
          </ThemedText>
          {permission?.canAskAgain === false ? (
            <ThemedText variant="muted">
              Włącz aparat dla PandaGo w ustawieniach systemu.
            </ThemedText>
          ) : permission === null ? (
            <ActivityIndicator />
          ) : (
            <Button label="Zezwól na dostęp do aparatu" onPress={() => void requestPermission()} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <View style={{ flex: 1 }}>
        <CameraView
          style={{ flex: 1 }}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={locked ? undefined : onScanned}
        />
        <View
          style={{
            position: 'absolute',
            alignSelf: 'center',
            top: '35%',
            width: 220,
            height: 220,
            borderWidth: 2,
            borderColor: error ? c.destructive : c.card,
            borderRadius: 16,
          }}
        />
        <View
          style={{
            position: 'absolute',
            alignSelf: 'center',
            bottom: 48,
            backgroundColor: c.card,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
          }}
        >
          <ThemedText style={{ textAlign: 'center' }}>
            {error ?? 'Skieruj aparat na kod QR drużyny'}
          </ThemedText>
        </View>
      </View>
    </SafeAreaView>
  );
}
