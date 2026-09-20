// Shared domain types for PandaGo. Used by the API server and all clients.

export type Role = 'player' | 'organizer' | 'admin';

export interface AuthResponse {
  token: string;
  role: Role;
  teamId: string | null;
  displayName: string;
}

export interface Team {
  id: string;
  name: string;
  joinCode: string;
  score: number;
}

export interface Checkpoint {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
  points: number;
  orderIndex: number;
}

/** Checkpoint as seen by players — the secret code is stripped server-side. */
export type CheckpointWithoutCode = Omit<Checkpoint, 'code'>;

export type VisitStatus = 'pending' | 'confirmed' | 'rejected';

export interface Visit {
  id: string;
  teamId: string;
  checkpointId: string;
  status: VisitStatus;
  points: number;
  createdAt: string;
}

export interface ScoreEntry {
  id: string;
  teamId: string;
  delta: number;
  reason: string;
  by: string;
  createdAt: string;
}

export interface TeamPosition {
  teamId: string;
  teamName: string;
  lat: number;
  lng: number;
  updatedAt: string;
}

export interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  score: number;
  checkpointsVisited: number;
}

export interface PlayerGameState {
  team: Team;
  checkpoints: CheckpointWithoutCode[];
  visits: Visit[];
  leaderboard: LeaderboardEntry[];
}

export interface CheckInRequest {
  checkpointId: string;
  lat?: number;
  lng?: number;
}

export interface ReportPositionRequest {
  lat: number;
  lng: number;
}

export interface AwardPointsRequest {
  delta: number;
  reason: string;
}

export interface Organizer {
  id: string;
  name: string;
  code: string;
}

export interface CreateOrganizerRequest {
  name: string;
  code?: string;
}

export interface CreateCheckpointRequest {
  name: string;
  code?: string;
  lat: number;
  lng: number;
  points?: number;
  orderIndex?: number;
}

export interface UpdateCheckpointRequest {
  name?: string;
  code?: string;
  lat?: number;
  lng?: number;
  points?: number;
  orderIndex?: number;
}

export interface AdminOverview {
  teams: Team[];
  checkpoints: Checkpoint[];
  positions: TeamPosition[];
  leaderboard: LeaderboardEntry[];
  pendingVisits: Visit[];
}
