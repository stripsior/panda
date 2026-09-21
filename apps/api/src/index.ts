import Fastify from 'fastify';
import cors from '@fastify/cors';
import { randomUUID } from 'node:crypto';
import type {
  AdminOverview,
  AuthResponse,
  AwardPointsRequest,
  Checkpoint,
  CreateCheckpointRequest,
  CreateOrganizerRequest,
  LeaderboardEntry,
  Organizer,
  PlayerGameState,
  ReportPositionRequest,
  Team,
  UpdateCheckpointRequest,
} from '@pandago/shared';
import { getDb, loadDb, saveDb, newId } from './db.js';
import { createSession, requireAuth, requireRole } from './auth.js';

const PORT = Number(process.env.PORT ?? 3001);

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

// ---- helpers ----

function leaderboard(): LeaderboardEntry[] {
  const db = getDb();
  return db.teams
    .map((team) => ({
      teamId: team.id,
      teamName: team.name,
      score: team.score,
      checkpointsVisited: db.visits.filter(
        (v) => v.teamId === team.id && v.status === 'confirmed',
      ).length,
    }))
    .sort((a, b) => b.score - a.score);
}

function publicTeam(team: Team): Team {
  return { ...team };
}

// ---- auth ----

app.post<{ Body: { code?: string } }>('/auth/login', async (req, reply) => {
  const code = req.body?.code?.trim().toUpperCase();
  if (!code) return reply.code(400).send({ error: 'Kod jest wymagany' });
  const db = getDb();

  if (code === db.adminCode) {
    const s = createSession({ role: 'admin', teamId: null, name: 'Administrator' });
    return reply.send({ token: s.token, role: s.role, teamId: null, displayName: s.name } satisfies AuthResponse);
  }

  const organizer = db.organizers.find((o) => o.code === code);
  if (organizer) {
    const s = createSession({ role: 'organizer', teamId: null, name: organizer.name });
    return reply.send({ token: s.token, role: s.role, teamId: null, displayName: s.name } satisfies AuthResponse);
  }

  const team = db.teams.find((t) => t.joinCode === code);
  if (team) {
    const s = createSession({ role: 'player', teamId: team.id, name: team.name });
    return reply.send({ token: s.token, role: s.role, teamId: team.id, displayName: s.name } satisfies AuthResponse);
  }

  return reply.code(401).send({ error: 'Nieznany kod dostępu' });
});

app.get('/me', { preHandler: requireAuth }, async (req) => {
  const s = req.session;
  return { token: s.token, role: s.role, teamId: s.teamId, displayName: s.name } satisfies AuthResponse;
});

app.post('/auth/logout', { preHandler: requireAuth }, async (req, reply) => {
  const db = getDb();
  db.sessions = db.sessions.filter((s) => s.token !== req.session.token);
  await saveDb();
  return reply.code(204).send();
});

// ---- player ----

app.get<{ Params: { id: string } }>(
  '/teams/:id/state',
  { preHandler: requireRole('player', 'organizer', 'admin') },
  async (req, reply) => {
    const db = getDb();
    const team = db.teams.find((t) => t.id === req.params.id);
    if (!team) return reply.code(404).send({ error: 'Nie znaleziono drużyny' });
    // players may only see their own state
    if (req.session.role === 'player' && req.session.teamId !== team.id) {
      return reply.code(403).send({ error: 'Gracze mogą oglądać tylko swoją drużynę' });
    }
    return {
      team: publicTeam(team),
      checkpoints: req.session.role === 'player'
        ? db.checkpoints.map(({ code: _code, ...cp }) => cp)
        : db.checkpoints,
      visits: db.visits.filter((v) => v.teamId === team.id),
      leaderboard: leaderboard(),
    } satisfies PlayerGameState;
  },
);

// Check-ins are intentionally not supported: players only see checkpoints on
// the map; points are awarded on site by an organizer via POST /teams/:id/score.

app.post<{ Body: ReportPositionRequest }>(
  '/positions',
  { preHandler: requireRole('player') },
  async (req, reply) => {
    updatePosition(req.session.teamId!, req.body.lat, req.body.lng);
    return reply.code(204).send();
  },
);

function updatePosition(teamId: string, lat: number, lng: number) {
  const db = getDb();
  const team = db.teams.find((t) => t.id === teamId)!;
  const existing = db.positions.find((p) => p.teamId === teamId);
  const entry = { teamId, teamName: team.name, lat, lng, updatedAt: new Date().toISOString() };
  if (existing) Object.assign(existing, entry);
  else db.positions.push(entry);
  void saveDb();
}

// ---- organizer ----

app.get('/teams', { preHandler: requireRole('organizer', 'admin') }, async () => {
  return getDb().teams.map(publicTeam);
});

app.post<{ Params: { id: string }; Body: AwardPointsRequest }>(
  '/teams/:id/score',
  { preHandler: requireRole('organizer', 'admin') },
  async (req, reply) => {
    const { delta, reason } = req.body;
    if (!Number.isInteger(delta) || delta === 0) {
      return reply.code(400).send({ error: 'Zmiana punktów musi być niezerową liczbą całkowitą' });
    }
    if (!reason?.trim()) return reply.code(400).send({ error: 'Podaj powód przyznania punktów' });
    const db = getDb();
    const team = db.teams.find((t) => t.id === req.params.id);
    if (!team) return reply.code(404).send({ error: 'Nie znaleziono drużyny' });

    team.score += delta;
    db.scoreEntries.push({
      id: randomUUID(),
      teamId: team.id,
      delta,
      reason: reason.trim(),
      by: req.session.name,
      createdAt: new Date().toISOString(),
    });
    await saveDb();
    return reply.send(publicTeam(team));
  },
);

app.get<{ Params: { id: string } }>(
  '/teams/:id/score-entries',
  { preHandler: requireRole('organizer', 'admin') },
  async (req, reply) => {
    const db = getDb();
    if (!db.teams.some((t) => t.id === req.params.id)) {
      return reply.code(404).send({ error: 'Nie znaleziono drużyny' });
    }
    return db.scoreEntries
      .filter((e) => e.teamId === req.params.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
);

app.post<{ Params: { visitId: string }; Body: { approve: boolean } }>(
  '/visits/:visitId/validate',
  { preHandler: requireRole('organizer', 'admin') },
  async (req, reply) => {
    const db = getDb();
    const visit = db.visits.find((v) => v.id === req.params.visitId);
    if (!visit) return reply.code(404).send({ error: 'Nie znaleziono meldunku' });
    if (visit.status !== 'pending') {
      return reply.code(409).send({ error: 'Meldunek został już rozpatrzony' });
    }
    visit.status = req.body.approve ? 'confirmed' : 'rejected';
    if (visit.status === 'confirmed') {
      const team = db.teams.find((t) => t.id === visit.teamId)!;
      team.score += visit.points;
    }
    await saveDb();
    return reply.send(visit);
  },
);

// ---- admin: checkpoints ----

app.get('/checkpoints', { preHandler: requireAuth }, async () => getDb().checkpoints);

app.post<{ Body: CreateCheckpointRequest }>(
  '/checkpoints',
  { preHandler: requireRole('admin') },
  async (req, reply) => {
    const { name, code, lat, lng, points, orderIndex } = req.body;
    if (!name?.trim()) {
      return reply.code(400).send({ error: 'Nazwa jest wymagana' });
    }
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return reply.code(400).send({ error: 'Szerokość i długość geograficzna muszą być liczbami' });
    }
    const db = getDb();
    const checkpoint: Checkpoint = {
      id: randomUUID(),
      name: name.trim(),
      // codes are no longer used for check-ins; kept as a station identifier
      code: (code?.trim() || `CP-${randomUUID().slice(0, 4)}`).toUpperCase(),
      lat,
      lng,
      points: points ?? 100,
      orderIndex: orderIndex ?? 0,
    };
    db.checkpoints.push(checkpoint);
    await saveDb();
    return reply.code(201).send(checkpoint);
  },
);

app.patch<{ Params: { id: string }; Body: UpdateCheckpointRequest }>(
  '/checkpoints/:id',
  { preHandler: requireRole('admin') },
  async (req, reply) => {
    const db = getDb();
    const checkpoint = db.checkpoints.find((c) => c.id === req.params.id);
    if (!checkpoint) return reply.code(404).send({ error: 'Nie znaleziono punktu kontrolnego' });
    const { name, code, lat, lng, points, orderIndex } = req.body;
    if (points !== undefined && (!Number.isInteger(points) || points < 0)) {
      return reply.code(400).send({ error: 'Punkty muszą być nieujemną liczbą całkowitą' });
    }
    if (name !== undefined) checkpoint.name = name.trim();
    if (code !== undefined) checkpoint.code = code.trim().toUpperCase();
    if (lat !== undefined) checkpoint.lat = lat;
    if (lng !== undefined) checkpoint.lng = lng;
    if (points !== undefined) checkpoint.points = points;
    if (orderIndex !== undefined) checkpoint.orderIndex = orderIndex;
    await saveDb();
    return reply.send(checkpoint);
  },
);

app.delete<{ Params: { id: string } }>(
  '/checkpoints/:id',
  { preHandler: requireRole('admin') },
  async (req, reply) => {
    const db = getDb();
    const before = db.checkpoints.length;
    db.checkpoints = db.checkpoints.filter((c) => c.id !== req.params.id);
    if (db.checkpoints.length === before) {
      return reply.code(404).send({ error: 'Nie znaleziono punktu kontrolnego' });
    }
    await saveDb();
    return reply.code(204).send();
  },
);

// ---- admin: teams ----

app.post<{ Body: { name: string } }>(
  '/teams',
  { preHandler: requireRole('admin') },
  async (req, reply) => {
    if (!req.body?.name?.trim()) {
      return reply.code(400).send({ error: 'Nazwa jest wymagana' });
    }
    const db = getDb();
    // normalize Polish diacritics so join codes stay readable
    const slug = req.body.name.trim().toLowerCase()
      .replace(/[ąćęłńóśźż]/g, (ch) => (({ ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' }) as Record<string, string>)[ch] ?? ch)
      .replace(/[^a-z0-9]+/g, '-');
    const team: Team = {
      id: `team-${slug}-${randomUUID().slice(0, 4)}`,
      name: req.body.name.trim(),
      joinCode: `TEAM-${slug.replace(/-/g, '').slice(0, 8).toUpperCase()}-${randomUUID().slice(0, 4)}`.toUpperCase(),
      score: 0,
    };
    db.teams.push(team);
    await saveDb();
    return reply.code(201).send(team);
  },
);

app.delete<{ Params: { id: string } }>(
  '/teams/:id',
  { preHandler: requireRole('admin') },
  async (req, reply) => {
    const db = getDb();
    if (!db.teams.some((t) => t.id === req.params.id)) {
      return reply.code(404).send({ error: 'Nie znaleziono drużyny' });
    }
    db.teams = db.teams.filter((t) => t.id !== req.params.id);
    db.visits = db.visits.filter((v) => v.teamId !== req.params.id);
    db.scoreEntries = db.scoreEntries.filter((e) => e.teamId !== req.params.id);
    db.positions = db.positions.filter((p) => p.teamId !== req.params.id);
    db.sessions = db.sessions.filter((s) => s.teamId !== req.params.id);
    await saveDb();
    return reply.code(204).send();
  },
);

// ---- admin: organizers (dynamic users) ----

app.get(
  '/organizers',
  { preHandler: requireRole('admin', 'organizer') },
  async (): Promise<Organizer[]> => getDb().organizers,
);

app.post<{ Body: CreateOrganizerRequest }>(
  '/organizers',
  { preHandler: requireRole('admin') },
  async (req, reply) => {
    const { name, code } = req.body;
    if (!name?.trim()) {
      return reply.code(400).send({ error: 'Imię lub nazwa jest wymagana' });
    }
    const db = getDb();
    const finalCode = (code?.trim() || `ORG-${randomUUID().slice(0, 4)}`).toUpperCase();
    if (db.organizers.some((o) => o.code === finalCode)) {
      return reply.code(409).send({ error: 'Organizator z takim kodem już istnieje' });
    }
    const organizer: Organizer = {
      id: newId('org'),
      name: name.trim(),
      code: finalCode,
    };
    db.organizers.push(organizer);
    await saveDb();
    return reply.code(201).send(organizer);
  },
);

app.delete<{ Params: { id: string } }>(
  '/organizers/:id',
  { preHandler: requireRole('admin') },
  async (req, reply) => {
    const db = getDb();
    const before = db.organizers.length;
    db.organizers = db.organizers.filter((o) => o.id !== req.params.id);
    if (db.organizers.length === before) {
      return reply.code(404).send({ error: 'Nie znaleziono organizatora' });
    }
    await saveDb();
    return reply.code(204).send();
  },
);

// ---- overview ----

app.get('/overview', { preHandler: requireRole('admin', 'organizer') }, async () => {
  const db = getDb();
  return {
    teams: db.teams.map(publicTeam),
    checkpoints: db.checkpoints,
    positions: db.positions,
    leaderboard: leaderboard(),
    pendingVisits: db.visits.filter((v) => v.status === 'pending'),
  } satisfies AdminOverview;
});

app.get('/leaderboard', { preHandler: requireAuth }, async () => leaderboard());

// ---- start ----

await loadDb();
app.listen({ port: PORT, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
