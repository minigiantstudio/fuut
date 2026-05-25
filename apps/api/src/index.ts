import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@fuut/types';
import { authMiddleware } from './middleware/auth';
import { requireAdminToken } from './middleware/admin-token';
import { ScoringJob } from './cron/scoring.job';
import { adminRouter } from './routes/admin';
import { adminAuthRouter } from './routes/admin-auth';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Supabase Client Initialization
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and ANON KEY must be provided in environment variables.');
}

// Fully-typed Supabase client — query results are inferred from the DB schema.
// The Database type is generated from the live project via `bun run gen` in packages/types.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Server-only service-role client for operations that must bypass RLS (admin
// match overrides, ScoringService writes). Never exposed to clients. Falls back
// to the anon client with a warning if SUPABASE_SERVICE_ROLE_KEY is not set,
// which lets local dev boot but writes to RLS-protected tables will silently
// affect 0 rows — set the env var for any real testing.
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseServiceRoleKey) {
  console.warn(
    '[supabaseAdmin] SUPABASE_SERVICE_ROLE_KEY missing — falling back to anon key. ' +
    'Admin overrides and scoring writes will be RLS-blocked.'
  );
}
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey ?? supabaseAnonKey,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Initialize Scoring Job
const footballApiKey = process.env.FOOTBALL_DATA_API_KEY;
if (footballApiKey) {
  const scoringJob = new ScoringJob(supabase, footballApiKey);
  scoringJob.start();
} else {
  console.warn('FOOTBALL_DATA_API_KEY missing; background scoring job disabled.');
}

// // Middleware
// app.use(cors({
//   origin: ['https://fuut-web.vercel.app', 'http://localhost:5173'],
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: true,
// }));

// // Explicitly handle preflight OPTIONS
// app.options('*', cors({
//   origin: ['https://fuut-web.vercel.app', 'http://localhost:5173'],
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: true,
// }));

app.use(express.json());

// Health Check Endpoint
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// Protected Route: Example /api/me
app.get('/api/me', authMiddleware, (req, res) => {
  const { user } = req as any;
  res.status(200).json({
    message: 'Welcome to your protected profile!',
    user: {
      id: user.id,
      email: user.email,
    },
  });
});

// Admin auth — public POST /api/admin/login (verifies env-var creds, issues JWT).
// Mounted BEFORE the admin router so /login isn't itself behind requireAdminToken.
app.use('/api/admin', adminAuthRouter);

// Admin actions — protected by requireAdminToken (HMAC JWT from /api/admin/login).
// DEC-018: env-var admin replaces the prior DB-flag path (DEC-016/017 superseded).
app.use('/api/admin', requireAdminToken, adminRouter);

// Start Server
app.listen(port, () => {
  console.log(`API Server running on port ${port}`);
});
