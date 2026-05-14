import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../index';
import { ScoringService } from '../services/scoring.service';

const adminRouter = Router();

/**
 * POST /api/admin/match-result
 *
 * Manually enter match scores and trigger re-scoring + leaderboard recalculation.
 * Body: { matchId: string, homeScore: number, awayScore: number, bonusResult: boolean }
 *
 * Authorization: must be mounted behind `requireAdminToken` middleware in
 * apps/api/src/index.ts. The route itself does not re-check auth — it trusts
 * the middleware chain (DEC-018: env-var admin, HMAC JWT).
 */
adminRouter.post('/match-result', async (req: Request, res: Response) => {
  const { matchId, homeScore, awayScore, bonusResult } = req.body;

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
    // Chain .select() so we can detect "0 rows affected" (e.g. matchId not found,
    // or a future RLS misconfiguration). Without .select(), Supabase returns
    // data: null on update and we'd silently report success on a no-op.
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('matches')
      .update({
        home_score: homeScore,
        away_score: awayScore,
        bonus_result: bonusResult,
        is_final: true,
        is_manual_override: true,
      })
      .eq('id', matchId)
      .select('id');

    if (updateError) {
      console.error('[admin/match-result] Match update error:', updateError.message);
      return res.status(500).json({ message: 'Failed to update match result' });
    }
    if (!updated || updated.length === 0) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // Instantiated here (not at module load) because `supabaseAdmin` from
    // ../index is still in the TDZ when this module is evaluated — admin.ts
    // is imported before the `export const supabaseAdmin = ...` line runs.
    const scoringService = new ScoringService(supabaseAdmin);
    await scoringService.scoreMatch(matchId);

    return res.status(200).json({ message: 'Match result finalized and scores updated' });
  } catch (err) {
    console.error('[admin/match-result] Unexpected error:', err);
    return res.status(500).json({ message: 'Internal server error during match result finalization' });
  }
});

export { adminRouter };
