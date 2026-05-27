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

/**
 * GET /api/admin/app-config
 *
 * Returns all app_config rows as a single object: { [key]: value }. Used by the
 * admin UI to populate the reveal-time editor and any future global toggles.
 */
adminRouter.get('/app-config', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('app_config')
      .select('key, value');
    if (error) {
      console.error('[admin/app-config GET] error:', error.message);
      return res.status(500).json({ message: 'Failed to read app_config' });
    }
    const config: Record<string, unknown> = {};
    for (const row of data ?? []) config[row.key] = row.value;
    return res.status(200).json({ config });
  } catch (err) {
    console.error('[admin/app-config GET] unexpected:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * PATCH /api/admin/app-config/:key
 *
 * Update a single app_config row. Body: { value: <jsonb-compatible> }. The
 * value type is validated per-key to keep typed contracts intact (the JS
 * client casts `value::text::int` for these specific keys).
 *
 * Currently writable keys:
 *   - bonus_reveal_lead_minutes (positive integer)
 *   - LEAGUE_FREE_MAX_MEMBERS   (positive integer)
 */
adminRouter.patch('/app-config/:key', async (req: Request, res: Response) => {
  const { key } = req.params;
  const { value } = req.body;

  const intKeys = new Set(['bonus_reveal_lead_minutes', 'LEAGUE_FREE_MAX_MEMBERS']);
  if (!intKeys.has(key)) {
    return res.status(400).json({ message: `Unknown or read-only config key: ${key}` });
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return res.status(400).json({ message: `value for "${key}" must be a positive integer` });
  }

  try {
    const { data: updated, error } = await supabaseAdmin
      .from('app_config')
      .update({ value })
      .eq('key', key)
      .select('key');
    if (error) {
      console.error('[admin/app-config PATCH] error:', error.message);
      return res.status(500).json({ message: 'Failed to update app_config' });
    }
    if (!updated || updated.length === 0) {
      return res.status(404).json({ message: `Config key not found: ${key}` });
    }
    return res.status(200).json({ message: 'Config updated', key, value });
  } catch (err) {
    console.error('[admin/app-config PATCH] unexpected:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/admin/leagues
 *
 * Returns all leagues with their tier and live member counts so the admin UI
 * can render the tier-flip controls and any "near cap" warnings. Two queries
 * + an in-memory join — fine for the project's expected league count.
 */
adminRouter.get('/leagues', async (_req: Request, res: Response) => {
  try {
    const [{ data: leagues, error: lErr }, { data: members, error: mErr }] = await Promise.all([
      supabaseAdmin.from('leagues').select('id, name, invite_code, tier, created_at'),
      supabaseAdmin.from('league_members').select('league_id'),
    ]);
    if (lErr || mErr) {
      console.error('[admin/leagues GET] error:', lErr?.message ?? mErr?.message);
      return res.status(500).json({ message: 'Failed to read leagues' });
    }
    const counts = new Map<string, number>();
    for (const row of members ?? []) {
      counts.set(row.league_id, (counts.get(row.league_id) ?? 0) + 1);
    }
    const enriched = (leagues ?? []).map((l) => ({
      ...l,
      member_count: counts.get(l.id) ?? 0,
    }));
    return res.status(200).json({ leagues: enriched });
  } catch (err) {
    console.error('[admin/leagues GET] unexpected:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/admin/leagues/:id/tier
 *
 * Flip a league's tier (free|premium). The leagues table has no public UPDATE
 * policy so this service-role write is the only sanctioned mutation path.
 * Body: { tier: 'free' | 'premium' }.
 */
adminRouter.post('/leagues/:id/tier', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { tier } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'League id is required' });
  }
  if (tier !== 'free' && tier !== 'premium') {
    return res.status(400).json({ message: "tier must be 'free' or 'premium'" });
  }

  try {
    const { data: updated, error } = await supabaseAdmin
      .from('leagues')
      .update({ tier })
      .eq('id', id)
      .select('id, tier');
    if (error) {
      console.error('[admin/leagues tier POST] error:', error.message);
      return res.status(500).json({ message: 'Failed to update league tier' });
    }
    if (!updated || updated.length === 0) {
      return res.status(404).json({ message: 'League not found' });
    }
    return res.status(200).json({ message: 'Tier updated', league: updated[0] });
  } catch (err) {
    console.error('[admin/leagues tier POST] unexpected:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export { adminRouter };
