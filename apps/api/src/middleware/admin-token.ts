import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AdminRequest extends Request {
  admin?: { sub: string };
}

/**
 * requireAdminToken middleware
 *
 * Verifies an HMAC-signed admin JWT issued by POST /api/admin/login.
 * Replaces the previous DB-flag-based requireGlobalAdmin (DEC-016, superseded
 * by DEC-018). No DB lookup — admin identity is configured via env vars on
 * the API process: ADMIN_EMAIL, ADMIN_PASSWORD_HASH, ADMIN_JWT_SECRET.
 */
export const requireAdminToken = (req: AdminRequest, res: Response, next: NextFunction) => {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    console.error('[requireAdminToken] ADMIN_JWT_SECRET is not set');
    return res.status(500).json({ message: 'Admin auth not configured on server' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Admin authorization missing' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ message: 'Admin token missing' });
  }

  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    if (payload.sub !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: not an admin token' });
    }
    req.admin = { sub: 'admin' };
    next();
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown';
    console.warn('[requireAdminToken] token rejected:', reason);
    return res.status(401).json({ message: 'Invalid or expired admin token' });
  }
};
