// Backend base URL.
// EXPO_PUBLIC_API_URL is inlined at bundle time — production builds (e.g. in
// GitHub Actions) bake in https://panda.strikx.dev.
// Local dev defaults:
// - iOS simulator / Expo Go on the same machine: http://localhost:3001
// - Android emulator: the host machine is reachable as 10.0.2.2
// - Physical device on the same Wi-Fi: use your computer's LAN IP.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3001';

// How often the player app reports its GPS position to the server (ms).
export const POSITION_INTERVAL_MS = 30_000;
