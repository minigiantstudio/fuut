import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const adminAuthRouter = Router();

/**
 * POST /api/admin/login
 *
 * Verifies email/password against env-var-configured admin credentials and
 * issues an HMAC-signed JWT on success. Replaces the DB-flag admin path
 * (DEC-018 supersedes DEC-016/017).
 *
 * Required env vars:
 * - ADMIN_EMAIL              — the admin email (plain string)
 * - ADMIN_PASSWORD_HASH      — bcrypt hash of the admin password
 * - ADMIN_JWT_SECRET         — HMAC signing secret (>= 32 bytes recommended)
 */
adminAuthRouter.post('/login', async (req: Request, res: Response) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  const jwtSecret = process.env.ADMIN_JWT_SECRET;

  if (!adminEmail || !adminPasswordHash || !jwtSecret) {
    console.error('[admin/login] Admin env vars missing — refusing login');
    return res.status(500).json({ message: 'Admin auth not configured on server' });
  }

  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ message: 'email and password are required' });
  }

  // Constant-time email comparison would be ideal, but for env-var single-admin
  // this is acceptable; bcrypt.compare is already constant-time for the password.
  if (email !== adminEmail) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const passwordOk = await bcrypt.compare(password, adminPasswordHash);
  if (!passwordOk) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const expiresInSeconds = 8 * 60 * 60; // 8 hours
  const token = jwt.sign({ sub: 'admin' }, jwtSecret, {
    algorithm: 'HS256',
    expiresIn: expiresInSeconds,
  });
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

  return res.status(200).json({ token, expiresAt });
});

export { adminAuthRouter };
