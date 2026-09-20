import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Checkpoint, TeamPosition } from '@pandago/shared';

const checkpointIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:9999px;background:hsl(217 91% 60%);border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const teamIcon = L.divIcon({
  className: '',
  html: '<div style="width:12px;height:12px;border-radius:3px;background:hsl(142 71% 45%);border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const KRAKOW: [number, number] = [50.0616, 19.9373];

export function MapView({
  checkpoints,
  positions,
}: {
  checkpoints: Checkpoint[];
  positions: TeamPosition[];
}) {
  const center = useMemo<[number, number]>(() => {
    const pts = [...checkpoints, ...positions];
    if (pts.length === 0) return KRAKOW;
    const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
    const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
    return [lat, lng];
  }, [checkpoints, positions]);

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      className="h-[420px] w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {checkpoints.map((cp) => (
        <Marker key={cp.id} position={[cp.lat, cp.lng]} icon={checkpointIcon}>
          <Popup>
            <span className="font-medium">{cp.name}</span>
            <br />
            {cp.code} · {cp.points} pts · #{cp.orderIndex}
          </Popup>
        </Marker>
      ))}
      {positions.map((p) => (
        <Marker key={p.teamId} position={[p.lat, p.lng]} icon={teamIcon}>
          <Popup>
            <span className="font-medium">{p.teamName}</span>
            <br />
            updated {new Date(p.updatedAt).toLocaleTimeString()}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
