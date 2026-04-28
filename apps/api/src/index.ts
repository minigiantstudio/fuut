import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@fuut/types'; // Assuming types are available
import { authMiddleware } from './middleware/auth'; // Import the auth middleware

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Supabase Client Initialization
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and ANON KEY must be provided in environment variables.');
}

// Use `as Database` to get type safety
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Middleware
app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Protected Route: Example /api/me
// This route will only be accessible if the user is authenticated
app.get('/api/me', authMiddleware, (req, res) => {
  // The 'user' property is attached by the authMiddleware
  const { user } = req as any; // Cast to 'any' for simplicity here, but a proper UserRequest type is better
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
