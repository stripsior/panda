import type {
  AdminOverview,
  AuthResponse,
  Checkpoint,
  CreateCheckpointRequest,
  CreateOrganizerRequest,
  Organizer,
  ScoreEntry,
  Team,
  UpdateCheckpointRequest,
  Visit,
} from '@pandago/shared';

// VITE_API_BASE_URL is baked in at build time (see apps/admin/Dockerfile);
// defaults to the local dev API.
export const API_BASE: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

const TOKEN_KEY = 'pandago.token';
const SESSION_KEY = 'pandago.session';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredSession(): AuthResponse | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthResponse;
  } catch {
    return null;
  }
}

function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 401 && !path.startsWith('/auth/login')) {
    clearAuth();
    window.location.href = '/login';
    throw new ApiError(401, 'Unauthorized');
  }

  if (res.status === 204) return undefined as T;

  const body = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return body as T;
}

// ---- auth ----

export async function login(code: string): Promise<AuthResponse> {
  const res = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  localStorage.setItem(TOKEN_KEY, res.token);
  localStorage.setItem(SESSION_KEY, JSON.stringify(res));
  return res;
}

export function logout(): void {
  clearAuth();
  window.location.href = '/login';
}

// ---- endpoints ----

export const api = {
  getOverview: () => request<AdminOverview>('/overview'),
  getTeams: () => request<Team[]>('/teams'),
  createTeam: (name: string) =>
    request<Team>('/teams', { method: 'POST', body: JSON.stringify({ name }) }),
  awardPoints: (teamId: string, delta: number, reason: string) =>
    request<Team>(`/teams/${teamId}/score`, {
      method: 'POST',
      body: JSON.stringify({ delta, reason }),
    }),
  getScoreEntries: (teamId: string) =>
    request<ScoreEntry[]>(`/teams/${teamId}/score-entries`),
  getCheckpoints: () => request<Checkpoint[]>('/checkpoints'),
  createCheckpoint: (body: CreateCheckpointRequest) =>
    request<Checkpoint>('/checkpoints', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteCheckpoint: (id: string) =>
    request<void>(`/checkpoints/${id}`, { method: 'DELETE' }),
  updateCheckpoint: (id: string, body: UpdateCheckpointRequest) =>
    request<Checkpoint>(`/checkpoints/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  getOrganizers: () => request<Organizer[]>('/organizers'),
  createOrganizer: (body: CreateOrganizerRequest) =>
    request<Organizer>('/organizers', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteOrganizer: (id: string) =>
    request<void>(`/organizers/${id}`, { method: 'DELETE' }),
  validateVisit: (visitId: string, approve: boolean) =>
    request<Visit>(`/visits/${visitId}/validate`, {
      method: 'POST',
      body: JSON.stringify({ approve }),
    }),
};
