export type MatchStatus = "scheduled" | "live" | "finished" | "cancelled";

export interface Profile {
  id: string;
  nickname: string;
  avatar_url?: string;
  locale: string;
}

export interface Match {
  id: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  status: MatchStatus;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  points?: number;
}
