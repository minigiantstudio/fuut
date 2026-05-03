// ── Generated Supabase DB types ──────────────────────────────────────────────
// Run `bun run gen` (or `npm run gen`) inside packages/types to regenerate
// after any schema change.
export type { Database, Json } from "./database.types";

// ── Convenience row-level helpers ─────────────────────────────────────────────
import type { Database } from "./database.types";

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];

// Concrete row aliases — import these instead of raw DB types
export type DbUser              = Tables<"users">;
export type DbLeague            = Tables<"leagues">;
export type DbLeagueMember      = Tables<"league_members">;
export type DbMatch             = Tables<"matches">;
export type DbPrediction        = Tables<"predictions">;
export type DbLeaderboardSnapshot = Tables<"leaderboard_snapshots">;

// ── Legacy hand-written types (kept for backward compat) ─────────────────────
// These pre-dated generated types. Prefer the Db* aliases above for new code.

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
