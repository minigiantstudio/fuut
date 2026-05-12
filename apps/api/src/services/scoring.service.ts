import type { Database } from '@fuut/types';

type Prediction = Database['public']['Tables']['predictions']['Row'];

/**
 * Scoring Logic
 * 3/1 Standard:
 * - 3 Points: Exact score match.
 * - 1 Point: Correct outcome (Winner/Draw).
 * Bonus Prediction:
 * - 2 Points: Correct bonus answer (Yes/No).
 */
export const calculatePoints = (
  predHome: number,
  predAway: number,
  resultHome: number,
  resultAway: number,
  predBonus: boolean | null,
  resultBonus: boolean | null
) => {
  let pointsMatch = 0;
  let pointsBonus = 0;

  // 1. Match Points
  if (predHome === resultHome && predAway === resultAway) {
    pointsMatch = 3;
  } else if (
    (predHome > predAway && resultHome > resultAway) ||
    (predHome < predAway && resultHome < resultAway) ||
    (predHome === predAway && resultHome === resultAway)
  ) {
    pointsMatch = 1;
  }

  // 2. Bonus Points
  if (predBonus !== null && resultBonus !== null && predBonus === resultBonus) {
    pointsBonus = 2;
  }

  return {
    pointsMatch,
    pointsBonus,
    totalPoints: pointsMatch + pointsBonus,
  };
};

export class ScoringService {
  private supabase;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Scores a single match and updates all associated predictions.
   */
  async scoreMatch(matchId: string) {
    // 1. Fetch match result
    const { data: match, error: matchError } = await this.supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError || !match) throw new Error('Match not found');
    if (match.home_score === null || match.away_score === null) return;

    // 2. Fetch all predictions for this match
    const { data: predictions, error: predError } = await this.supabase
      .from('predictions')
      .select('*')
      .eq('match_id', matchId);

    if (predError || !predictions) throw new Error('Error fetching predictions');

    // 3. Calculate and update each prediction
    const updates = (predictions as Prediction[]).map((p) => {
      const { pointsMatch, pointsBonus, totalPoints } = calculatePoints(
        p.home_score,
        p.away_score,
        match.home_score,
        match.away_score,
        p.bonus_answer,
        match.bonus_result
      );

      return {
        id: p.id,
        points: totalPoints,
        points_match: pointsMatch,
        points_bonus: pointsBonus,
        is_scored: true,
        is_bonus_scored: match.bonus_result !== null,
      };
    });

    // Bulk update predictions (using upsert if direct update isn't efficient)
    for (const update of updates) {
      await this.supabase
        .from('predictions')
        .update(update)
        .eq('id', update.id);
    }

    // 4. Trigger leaderboard recalculation for affected leagues
    const leagueIds = Array.from(new Set((predictions as Prediction[]).map((p) => p.league_id)));
    for (const leagueId of leagueIds) {
      await this.recalculateLeaderboard(leagueId as string);
    }
  }

  /**
   * Recalculates the leaderboard for a specific league.
   */
  async recalculateLeaderboard(leagueId: string) {
    // 1. Call the updated RPC get_leaderboard
    const { data: newLeaderboard, error: rpcError } = await this.supabase
      .rpc('get_leaderboard', { p_league_id: leagueId });

    if (rpcError || !newLeaderboard) throw new Error('Error calculating leaderboard');

    // 2. Fetch last snapshots to compare for rank_delta
    const { data: lastSnapshots } = await this.supabase
      .from('leaderboard_snapshots')
      .select('*')
      .eq('league_id', leagueId)
      .order('snapshot_at', { ascending: false })
      .limit(100); // Rough limit for league size

    // 3. Prepare new snapshots
    const snapshots = newLeaderboard.map((entry: any) => {
      const prev = lastSnapshots?.find((s: any) => s.user_id === entry.user_id);
      const delta = prev ? prev.rank - entry.rank : 0;

      return {
        league_id: leagueId,
        user_id: entry.user_id,
        rank: entry.rank,
        total_points: entry.total_points,
        exact_matches: entry.exact_matches,
        bonus_points: entry.bonus_points,
        rank_delta: delta,
        snapshot_at: new Date().toISOString(),
      };
    });

    // 4. Insert new snapshots
    await this.supabase
      .from('leaderboard_snapshots')
      .insert(snapshots);
  }
}
