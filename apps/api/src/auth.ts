import { randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { getDb, saveDb } from './db.js';
import type { Session } from './db.js';

export function createSession(s: Omit<Session, 'token' | 'createdAt'>): Session {
  const session: Session = {
    ...s,
    token: randomBytes(24).toString('hex'),
    createdAt: new Date().toISOString(),
  };
  getDb().sessions.push(session);
  void saveDb();
  return session;
}

export function getSession(token: string | undefined): Session | null {
  if (!token) return null;
  return getDb().sessions.find((s) => s.token === token) ?? null;
}

declare module 'fastify' {
  interface FastifyRequest {
    session: Session;
  }
}

function unauthorized(reply: FastifyReply, msg: string) {
  return reply.code(401).send({ error: msg });
}

/** Requires any valid session; attaches it to request.session. */
export function requireAuth(req: FastifyRequest, reply: FastifyReply, done: () => void): void {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  const session = getSession(token);
  if (!session) {
    unauthorized(reply, 'Invalid or missing token');
    return;
  }
  req.session = session;
  done();
}

export function requireRole(...roles: Session['role'][]) {
  return (req: FastifyRequest, reply: FastifyReply, done: () => void): void => {
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    const session = getSession(token);
    if (!session) {
      unauthorized(reply, 'Invalid or missing token');
      return;
    }
    if (!roles.includes(session.role)) {
      reply.code(403).send({ error: `Requires role: ${roles.join(' or ')}` });
      return;
    }
    req.session = session;
    done();
  };
}
