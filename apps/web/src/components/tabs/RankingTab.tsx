import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/lib/supabase/client";
import type { LeaderboardEntry, Session } from "@/lib/supabase/types";

interface RankingTabProps {
  session: Session;
}

const MovementIndicator = ({ movement }: { movement: number }) => {
  if (movement > 0) return <span className="text-[8px] text-pixel-green">▲{movement}</span>;
  if (movement < 0) return <span className="text-[8px] text-pixel-red">▼{Math.abs(movement)}</span>;
  return <span className="text-[8px] text-muted-foreground">–</span>;
};

const RankingTab = ({ session }: RankingTabProps) => {
  const queryClient = useQueryClient();
  const { data: leaderboard = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", session.leagueId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_leaderboard", {
        p_league_id: session.leagueId,
      });
      if (error) throw error;
      return (data ?? []).sort((a, b) => a.rank - b.rank);
    },
  });

  // Realtime leaderboard (D-06): subscribe to INSERT/UPDATE events on
  // leaderboard_snapshots filtered to this league, and invalidate the
  // get_leaderboard query when anything changes. The channel name is
  // namespaced per league to avoid cross-league bleed when multiple
  // RankingTabs would otherwise share a channel.
  useEffect(() => {
    // Scoring feedback (D-15/D-16, SOCIAL-04): when a match is scored the
    // scoring engine inserts a fresh snapshot row per league member. For the
    // current user's row, surface a Sonner toast with the points earned this
    // round and the new rank. pts_earned is derived by diffing the new total
    // against the cached leaderboard (the realtime payload carries totals, not
    // per-match deltas). The diff baseline updates after the invalidate refetch.
    const maybeToastScored = (payload: { new?: Record<string, unknown> }) => {
      const row = payload.new;
      if (!row || row.user_id !== session.userId) return;

      const cached = queryClient.getQueryData<LeaderboardEntry[]>([
        "leaderboard",
        session.leagueId,
      ]);
      // No baseline yet (toast would be meaningless) — skip, just let the
      // invalidate below refresh the table.
      if (!cached) return;

      const prev = cached.find((e) => e.user_id === session.userId);
      if (!prev) return;

      const newTotal = Number(row.total_points ?? 0);
      const ptsEarned = newTotal - prev.total_points;
      // Nothing changed for this user (e.g. they had no prediction and rank held)
      // — don't fire a noisy zero toast.
      if (ptsEarned <= 0 && Number(row.rank_delta ?? 0) === 0) return;

      const rank = Number(row.rank ?? prev.rank);
      const rankDelta = Number(row.rank_delta ?? 0);
      const movement =
        rankDelta > 0 ? ` ↑${rankDelta}` : rankDelta < 0 ? ` ↓${Math.abs(rankDelta)}` : "";

      toast.success(
        `Match scored — you earned ${ptsEarned} pt${ptsEarned === 1 ? "" : "s"} (#${rank}${movement})`
      );
    };

    const channel = supabase.channel(`leaderboard-${session.leagueId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leaderboard_snapshots",
          filter: `league_id=eq.${session.leagueId}`,
        },
        (payload) => {
          maybeToastScored(payload);
          queryClient.invalidateQueries({ queryKey: ["leaderboard", session.leagueId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leaderboard_snapshots",
          filter: `league_id=eq.${session.leagueId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["leaderboard", session.leagueId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.leagueId, session.userId, queryClient]);

  return (
    <div className="py-5 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-foreground text-lg">🏆 Leaderboard</h1>
        <span className="text-[7px] text-muted-foreground">{session.leagueName}</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="pixel-border bg-card p-6 text-center">
          <p className="text-[8px] text-muted-foreground">No scores yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((m) => {
            const isMe = m.user_id === session.userId;
            const initials = m.nickname.slice(0, 2).toUpperCase();
            return (
              <div
                key={m.user_id}
                className={`pixel-border-sm p-3 flex items-center gap-3 ${
                  isMe ? "bg-pixel-gold/20 border-pixel-gold" : "bg-card"
                }`}
              >
                <span className="w-5 text-[8px] text-muted-foreground text-center">
                  {m.rank === 1 ? "👑" : m.rank}
                </span>

                <div className="h-7 w-7 bg-foreground flex items-center justify-center shrink-0">
                  <span className="text-[6px] text-primary-foreground">{initials}</span>
                </div>

                <span className="text-foreground flex-1 truncate text-xs">{m.nickname}</span>

                <MovementIndicator movement={m.rank_delta} />

                <span className="text-[8px] text-foreground tabular-nums min-w-[45px] text-right">
                  {m.total_points} pts
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RankingTab;
