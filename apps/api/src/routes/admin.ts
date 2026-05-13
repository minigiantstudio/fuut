import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../index';
import { ScoringService } from '../services/scoring.service';

interface UserRequest extends Request {
  user?: { id: string; email: string };
}

/**
 * requireGlobalAdmin middleware
 * Mitigates T-03-04 (Elevation of Privilege): reads `is_global_admin` from
 * the database using the authenticated user's id — NEVER trusts a client header.
 */
const requireGlobalAdmin = async (req: UserRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { data, error } = await supabase
    .from('users')
    .select('is_global_admin')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('[requireGlobalAdmin] DB lookup error:', error?.message);
    return res.status(500).json({ message: 'Internal server error during authorization' });
  }

  if (!data.is_global_admin) {
    return res.status(403).json({ message: 'Forbidden: Global admin access required' });
  }

  next();
};

const adminRouter = Router();

/**
 * POST /api/admin/match-result
 * Manually enter match scores and trigger re-scoring + leaderboard recalculation.
 * Body: { matchId: string, homeScore: number, awayScore: number, bonusResult: boolean }
 */
adminRouter.post('/match-result', async (req: UserRequest, res: Response) => {
  const { matchId, homeScore, awayScore, bonusResult } = req.body;

  // Input validation
  if (!matchId || typeof matchId !== 'string') {
    return res.status(400).json({ message: 'matchId is required and must be a string' });
  }
  if (typeof homeScore !== 'number' || !Number.isInteger(homeScore) || homeScore < 0) {
    return res.status(400).json({ message: 'homeScore must be a non-negative integer' });
  }
  if (typeof awayScore !== 'number' || !Number.isInteger(awayScore) || awayScore < 0) {
    return res.status(400).json({ message: 'awayScore must be a non-negative integer' });
  }
  if (typeof bonusResult !== 'boolean') {
    return res.status(400).json({ message: 'bonusResult must be a boolean' });
  }

  try {
    // Update the match record with manual override
    const { error: updateError } = await supabase
      .from('matches')
      .update({
        home_score: homeScore,
        away_score: awayScore,
        bonus_result: bonusResult,
        is_final: true,
        is_manual_override: true,
      })
      .eq('id', matchId);

    if (updateError) {
      console.error('[admin/match-result] Match update error:', updateError.message);
      return res.status(500).json({ message: 'Failed to update match result' });
    }

    // Score all predictions for this match.
    // Instantiated here (not at module load) because `supabase` from ../index
    // is still in the TDZ when this module is evaluated — admin.ts is imported
    // before the `export const supabase = createClient(...)` line runs.
    const scoringService = new ScoringService(supabase);
    await scoringService.scoreMatch(matchId);

    return res.status(200).json({ message: 'Match result finalized and scores updated' });
  } catch (err) {
    console.error('[admin/match-result] Unexpected error:', err);
    return res.status(500).json({ message: 'Internal server error during match result finalization' });
  }
});

export { adminRouter, requireGlobalAdmin };
