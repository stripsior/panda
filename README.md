# PandaGo — terrain game platform

Monorepo with three apps for a terrain-based team game:

- **`apps/api`** — Fastify + TypeScript backend. Code-based auth (3 roles: player, organizer, admin), teams, checkpoints, visit validation, scoring, live team positions.
- **`apps/admin`** — Admin web dashboard (Vite + React + Tailwind v4, coss-style UI). Live overview of all team positions, leaderboard, checkpoint management.
- **`apps/mobile`** — Expo / React Native app for players and organizers. Main screen is a map with checkpoints; organizers can award points to squads.
- **`packages/shared`** — Shared API contract types used by all three apps.

## Roles

| Role | Login | Capabilities |
|---|---|---|
| Player | team code (e.g. `TEAM-ALPHA`) | see map of checkpoints, check in at a checkpoint with its code, see squad score |
| Organizer | organizer code (e.g. `ORG-001`) | award/deduct points to any squad, validate check-ins |
| Admin | admin code (e.g. `ADMIN-001`) | everything: manage checkpoints/teams, monitor all team positions live |

## Quick start

```bash
npm install

# API (port 3001)
npm run dev -w apps/api

# Admin dashboard (port 5173)
npm run dev -w apps/admin

# Mobile (Expo)
npm run start -w apps/mobile
```

The API seeds demo data on first run (teams, checkpoints, codes). See `apps/api/src/db.ts`.

Default codes: `ADMIN-001`, `ORG-001`, `ORG-002`, teams `TEAM-ALPHA` … `TEAM-DELTA`, checkpoint codes `CP-A1` etc.
