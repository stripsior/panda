import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { usePalette } from '@/src/components/ui/colors';

export default function PlayerTabsLayout() {
  const c = usePalette();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.foreground,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.border,
        },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color }) => <MapIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="status"
        options={{
          title: 'Status',
          tabBarIcon: ({ color }) => <StatusIcon color={color} />,
        }}
      />
    </Tabs>
  );
}

function MapIcon({ color }: { color: string }) {
  return (
    <Text style={{ color, fontSize: 18, fontWeight: '600' }}>◉</Text>
  );
}

function StatusIcon({ color }: { color: string }) {
  return (
    <Text style={{ color, fontSize: 18, fontWeight: '600' }}>≡</Text>
  );
}
