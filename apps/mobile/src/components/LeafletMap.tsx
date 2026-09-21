import { useCallback, useEffect, useRef } from 'react';
import { WebView } from 'react-native-webview';
import leafletScript from './leaflet/leafletScript';
import leafletStyle from './leaflet/leafletStyle';

export interface MapCheckpoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  points: number;
  visited: boolean;
}

export interface MapUserLocation {
  lat: number;
  lng: number;
}

interface LeafletMapProps {
  checkpoints: MapCheckpoint[];
  userLocation: MapUserLocation | null;
  onCheckpointPress?: (id: string) => void;
}

// Keyless embedded map: Leaflet + OpenStreetMap tiles inside a WebView.
// Data flows in via injectJavaScript calls; marker taps flow back via
// postMessage.
const HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>${leafletStyle}</style>
<style>html,body,#map{margin:0;padding:0;height:100%;}</style>
</head>
<body>
<div id="map"></div>
<script>${leafletScript}</script>
<script>
var map = L.map('map', { zoomControl: false });
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);
map.setView([50.0616, 19.9373], 13);
var checkpointLayer = L.layerGroup().addTo(map);
var userMarker = null;
var didFit = false;

window.setData = function (payload) {
  var bounds = [];
  checkpointLayer.clearLayers();
  payload.checkpoints.forEach(function (cp) {
    var color = cp.visited ? '#16a34a' : '#18181b';
    var m = L.circleMarker([cp.lat, cp.lng], {
      radius: 12, color: '#ffffff', weight: 2, fillColor: color, fillOpacity: 1
    });
    m.bindTooltip(cp.name + (cp.visited ? ' ✓' : ' · ' + cp.points + ' pts'));
    m.on('click', function () {
      window.ReactNativeWebView.postMessage(cp.id);
    });
    m.addTo(checkpointLayer);
    bounds.push([cp.lat, cp.lng]);
  });
  if (payload.userLocation) {
    var ll = [payload.userLocation.lat, payload.userLocation.lng];
    if (userMarker) { userMarker.setLatLng(ll); }
    else {
      userMarker = L.circleMarker(ll, {
        radius: 8, color: '#ffffff', weight: 2,
        fillColor: '#2563eb', fillOpacity: 1
      }).addTo(map);
    }
    bounds.push(ll);
  }
  if (!didFit && bounds.length > 0) {
    map.fitBounds(bounds, { padding: [30, 30] });
    didFit = true;
  }
};
document.addEventListener('message', function () {});
window.addEventListener('message', function () {});
</script>
</body>
</html>`;

export default function LeafletMap({ checkpoints, userLocation, onCheckpointPress }: LeafletMapProps) {
  const webRef = useRef<WebView>(null);

  const payload = JSON.stringify({ checkpoints, userLocation });

  useEffect(() => {
    webRef.current?.injectJavaScript(`window.setData(${payload}); true;`);
  }, [payload]);

  const handleLoad = useCallback(() => {
    webRef.current?.injectJavaScript(`window.setData(${payload}); true;`);
  }, [payload]);

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      onCheckpointPress?.(event.nativeEvent.data);
    },
    [onCheckpointPress],
  );

  return (
    <WebView
      ref={webRef}
      source={{ html: HTML }}
      style={{ flex: 1, backgroundColor: 'transparent' }}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled={false}
      onMessage={handleMessage}
      onLoad={handleLoad}
      setSupportMultipleWindows={false}
      startInLoadingState
      renderLoading={undefined}
    />
  );
}
