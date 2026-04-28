import { Request, Response, NextFunction } from 'express';
import { supabase } from '../index'; // Import the Supabase client

interface UserRequest extends Request {
  user?: { id: string; email: string }; // Define the user structure you expect
}

export const authMiddleware = async (req: UserRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const token = authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Invalid token format' });
  }

  try {
    // Verify the token using Supabase's getUser function
    // This function checks the token's validity and returns the user if valid
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      // Log the error for debugging purposes without leaking sensitive info to the client
      console.error('Supabase Auth Error:', error?.message || 'User not found');
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Attach the user to the request object
    req.user = { id: user.id, email: user.email! }; // email is usually non-null for logged-in users
    next();
  } catch (e) {
    console.error('Unexpected error during auth middleware:', e);
    res.status(500).json({ message: 'Internal server error during authentication' });
  }
};
