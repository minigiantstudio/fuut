import { useQuery } from "@tanstack/react-query";
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
  const { data: leaderboard = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", session.leagueId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_leaderboard", {
        p_league_id: session.leagueId,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

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
