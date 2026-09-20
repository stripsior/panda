import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthResponse, Role } from '@pandago/shared';
import { api, setAuthToken } from './api';

const TOKEN_KEY = 'pandago.auth';

interface StoredAuth {
  token: string;
  role: Role;
  teamId: string | null;
  displayName: string;
}

interface AuthContextValue {
  auth: StoredAuth | null;
  loading: boolean;
  login: (code: string) => Promise<StoredAuth>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY)
      .then((raw) => {
        if (raw) {
          const stored = JSON.parse(raw) as StoredAuth;
          setAuthToken(stored.token);
          setAuth(stored);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (code: string) => {
    const res = await api.post<AuthResponse>('/auth/login', { code });
    const stored: StoredAuth = {
      token: res.token,
      role: res.role,
      teamId: res.teamId,
      displayName: res.displayName,
    };
    setAuthToken(stored.token);
    setAuth(stored);
    await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(stored));
    return stored;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // best-effort — drop the local session regardless
    }
    setAuthToken(null);
    setAuth(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
  }, []);

  const value = useMemo(
    () => ({ auth, loading, login, logout }),
    [auth, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
