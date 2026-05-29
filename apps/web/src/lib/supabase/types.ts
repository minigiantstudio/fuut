// DB row types matching the existing Supabase schema

export interface DbUser {
  id: string;
  nickname: string;
  email: string | null;
  created_at: string;
}

export interface DbLeague {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

export interface DbLeagueMember {
  id: string;
  league_id: string;
  user_id: string;
  role: string; // "admin" | "member"
  joined_at: string;
}

export interface DbMatch {
  id: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  stage: string;
  group_name: string | null;
  home_score: number | null;
  away_score: number | null;
  is_final: boolean;
  bonus_question: string | null;
  bonus_result: boolean | null;
}

// Shape returned by the get_matches_with_bonus() RPC. Same columns as DbMatch
// plus the server-computed reveal fields. bonus_question is NULL here until
// now() >= reveal_at — the column is REVOKEd from direct table SELECT, so this
// RPC is the only client-facing source of it.
export interface DbMatchWithBonus extends DbMatch {
  reveal_at: string;
  is_bonus_revealed: boolean;
}

export interface DbPrediction {
  id: string;
  user_id: string;
  league_id: string;
  match_id: string;
  home_score: number | null;
  away_score: number | null;
  points: number | null;
  points_match: number | null;
  points_bonus: number | null;
  is_scored: boolean;
  is_bonus_scored: boolean;
  created_at: string;
  updated_at: string;
  bonus_answer: boolean | null;
}

export interface LeaderboardEntry {
  user_id: string;
  nickname: string;
  total_points: number;
  rank: number;
  rank_delta: number;
}

// App-level session (what we keep in context after login)
export interface Session {
  userId: string;
  nickname: string;
  leagueId: string;
  leagueName: string;
  role: string;
}
