// PostgreSQL-backed store. The whole dataset for a single game day is small,
// so we hydrate an in-memory model on boot and write the changed rows back
// on every save (upsert by id; sessions/positions replaced wholesale).
// All route logic goes through loadDb/getDb/saveDb, so swapping the
// persistence layer never touches the routes.

import { randomUUID } from 'node:crypto';
import pg from 'pg';
import type {
  Checkpoint,
  ScoreEntry,
  Team,
  TeamPosition,
  Visit,
} from '@pandago/shared';

export interface Organizer {
  id: string;
  name: string;
  code: string;
}

export interface Session {
  token: string;
  role: 'player' | 'organizer' | 'admin';
  teamId: string | null;
  name: string;
  createdAt: string;
}

export interface Db {
  adminCode: string;
  organizers: Organizer[];
  teams: Team[];
  checkpoints: Checkpoint[];
  visits: Visit[];
  scoreEntries: ScoreEntry[];
  positions: TeamPosition[];
  sessions: Session[];
}

const Pool = pg.Pool;
export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgres://pandago:pandago@localhost:5433/pandago',
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL
);
CREATE TABLE IF NOT EXISTS organizers (
  id text PRIMARY KEY,
  name text NOT NULL,
  code text UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS teams (
  id text PRIMARY KEY,
  name text NOT NULL,
  join_code text UNIQUE NOT NULL,
  score integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS checkpoints (
  id text PRIMARY KEY,
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  points integer NOT NULL DEFAULT 100,
  order_index integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS visits (
  id text PRIMARY KEY,
  team_id text NOT NULL,
  checkpoint_id text NOT NULL,
  status text NOT NULL,
  points integer NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS score_entries (
  id text PRIMARY KEY,
  team_id text NOT NULL,
  delta integer NOT NULL,
  reason text NOT NULL,
  by text NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS positions (
  team_id text PRIMARY KEY,
  team_name text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token text PRIMARY KEY,
  role text NOT NULL,
  team_id text,
  name text NOT NULL,
  created_at timestamptz NOT NULL
);
`;

// Rows created by the old demo seed (Kraków checkpoints, demo teams/organizers).
// Removed once at boot so existing deployments start clean; user-created rows
// are never touched.
const LEGACY_SEED_TEAM_IDS = ['team-alpha', 'team-bravo', 'team-charlie', 'team-delta'];
const LEGACY_SEED_IDS = ['org-1', 'org-2', ...LEGACY_SEED_TEAM_IDS, 'cp-1', 'cp-2', 'cp-3', 'cp-4'];

async function purgeLegacySeed(): Promise<void> {
  const teamIds = LEGACY_SEED_TEAM_IDS;
  await pool.query(`DELETE FROM visits WHERE team_id = ANY($1) OR checkpoint_id = ANY($2)`, [teamIds, LEGACY_SEED_IDS]);
  await pool.query(`DELETE FROM score_entries WHERE team_id = ANY($1)`, [teamIds]);
  await pool.query(`DELETE FROM positions WHERE team_id = ANY($1)`, [teamIds]);
  await pool.query(`DELETE FROM sessions WHERE team_id = ANY($1)`, [teamIds]);
  await pool.query(`DELETE FROM organizers WHERE id = ANY($1)`, [LEGACY_SEED_IDS]);
  await pool.query(`DELETE FROM teams WHERE id = ANY($1)`, [teamIds]);
  await pool.query(`DELETE FROM checkpoints WHERE id = ANY($1)`, [LEGACY_SEED_IDS]);
}

let db: Db;

async function loadFromDb(): Promise<Db> {
  const [adminCode, organizers, teams, checkpoints, visits, scoreEntries, positions, sessions] =
    await Promise.all([
      pool.query<{ value: string }>(`SELECT value FROM settings WHERE key = 'adminCode'`),
      pool.query<Organizer & { id: string; name: string; code: string }>(
        `SELECT id, name, code FROM organizers ORDER BY code`,
      ),
      pool.query<{ id: string; name: string; join_code: string; score: number }>(
        `SELECT id, name, join_code, score FROM teams ORDER BY id`,
      ),
      pool.query<{
        id: string; name: string; code: string; lat: number; lng: number;
        points: number; order_index: number;
      }>(`SELECT id, name, code, lat, lng, points, order_index FROM checkpoints ORDER BY order_index, id`),
      pool.query<{
        id: string; team_id: string; checkpoint_id: string; status: string;
        points: number; created_at: Date;
      }>(`SELECT id, team_id, checkpoint_id, status, points, created_at FROM visits ORDER BY created_at`),
      pool.query<{
        id: string; team_id: string; delta: number; reason: string; by: string; created_at: Date;
      }>(`SELECT id, team_id, delta, reason, by, created_at FROM score_entries ORDER BY created_at`),
      pool.query<{ team_id: string; team_name: string; lat: number; lng: number; updated_at: Date }>(
        `SELECT team_id, team_name, lat, lng, updated_at FROM positions`,
      ),
      pool.query<{ token: string; role: string; team_id: string | null; name: string; created_at: Date }>(
        `SELECT token, role, team_id, name, created_at FROM sessions`,
      ),
    ]);

  return {
    adminCode: adminCode.rows[0]?.value ?? 'ADMIN-001',
    organizers: organizers.rows.map((o) => ({ id: o.id, name: o.name, code: o.code })),
    teams: teams.rows.map((t) => ({ id: t.id, name: t.name, joinCode: t.join_code, score: t.score })),
    checkpoints: checkpoints.rows.map((c) => ({
      id: c.id, name: c.name, code: c.code, lat: Number(c.lat), lng: Number(c.lng),
      points: c.points, orderIndex: c.order_index,
    })),
    visits: visits.rows.map((v) => ({
      id: v.id, teamId: v.team_id, checkpointId: v.checkpoint_id,
      status: v.status as Visit['status'], points: v.points,
      createdAt: new Date(v.created_at).toISOString(),
    })),
    scoreEntries: scoreEntries.rows.map((e) => ({
      id: e.id, teamId: e.team_id, delta: e.delta, reason: e.reason, by: e.by,
      createdAt: new Date(e.created_at).toISOString(),
    })),
    positions: positions.rows.map((p) => ({
      teamId: p.team_id, teamName: p.team_name, lat: Number(p.lat), lng: Number(p.lng),
      updatedAt: new Date(p.updated_at).toISOString(),
    })),
    sessions: sessions.rows.map((s) => ({
      token: s.token, role: s.role as Session['role'], teamId: s.team_id, name: s.name,
      createdAt: new Date(s.created_at).toISOString(),
    })),
  };
}

async function persistAll(d: Db): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO settings (key, value) VALUES ('adminCode', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [d.adminCode],
    );

    await client.query(`DELETE FROM organizers`);
    for (const o of d.organizers) {
      await client.query(
        `INSERT INTO organizers (id, name, code) VALUES ($1, $2, $3)`,
        [o.id, o.name, o.code],
      );
    }

    await client.query(`DELETE FROM sessions`);
    for (const s of d.sessions) {
      await client.query(
        `INSERT INTO sessions (token, role, team_id, name, created_at) VALUES ($1, $2, $3, $4, $5)`,
        [s.token, s.role, s.teamId, s.name, s.createdAt],
      );
    }

    await client.query(`DELETE FROM visits`);
    for (const v of d.visits) {
      await client.query(
        `INSERT INTO visits (id, team_id, checkpoint_id, status, points, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
        [v.id, v.teamId, v.checkpointId, v.status, v.points, v.createdAt],
      );
    }

    await client.query(`DELETE FROM score_entries`);
    for (const e of d.scoreEntries) {
      await client.query(
        `INSERT INTO score_entries (id, team_id, delta, reason, by, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
        [e.id, e.teamId, e.delta, e.reason, e.by, e.createdAt],
      );
    }

    await client.query(`DELETE FROM teams`);
    for (const t of d.teams) {
      await client.query(
        `INSERT INTO teams (id, name, join_code, score) VALUES ($1, $2, $3, $4)`,
        [t.id, t.name, t.joinCode, t.score],
      );
    }

    await client.query(`DELETE FROM checkpoints`);
    for (const c of d.checkpoints) {
      await client.query(
        `INSERT INTO checkpoints (id, name, code, lat, lng, points, order_index) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [c.id, c.name, c.code, c.lat, c.lng, c.points, c.orderIndex],
      );
    }

    await client.query(`DELETE FROM positions`);
    for (const p of d.positions) {
      await client.query(
        `INSERT INTO positions (team_id, team_name, lat, lng, updated_at) VALUES ($1, $2, $3, $4, $5)`,
        [p.teamId, p.teamName, p.lat, p.lng, p.updatedAt],
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Creates the schema, purges legacy demo seed and loads data. Resolves when ready. */
export async function loadDb(): Promise<Db> {
  await pool.query(SCHEMA);
  await purgeLegacySeed();
  db = await loadFromDb();
  const existing = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM settings WHERE key = 'adminCode'`,
  );
  if (Number(existing.rows[0]?.count ?? '0') === 0) {
    // persistAll upserts the default adminCode; keeps any data already loaded
    await persistAll(db);
  }
  return db;
}

// persistAll rewrites every table inside a transaction, so overlapping saves
// (e.g. a position ping fire-and-forget during a delete) would block or fail
// on row locks. Serialize all saves through one chain instead.
let saveChain: Promise<void> = Promise.resolve();

export function saveDb(): Promise<void> {
  const next = saveChain.then(() => persistAll(db));
  saveChain = next.catch(() => {});
  return next;
}

export function getDb(): Db {
  return db;
}

// Random ids for new organizers (teams/checkpoints build their own ids in routes).
export function newId(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}
