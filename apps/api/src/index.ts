import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@fuut/types';
import { authMiddleware } from './middleware/auth';

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

// Middleware
app.use(cors());
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

// Routes will be added here
// Example: app.use('/api/users', userRouter);

// Start Server
app.listen(port, () => {
  console.log(`API Server running on port ${port}`);
});
