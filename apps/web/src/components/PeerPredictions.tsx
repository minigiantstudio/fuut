import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n";

interface PeerPrediction {
  user_id: string;
  nickname: string;
  role: string;
  home_score: number | null;
  away_score: number | null;
  bonus_answer: boolean | null;
  points: number | null;
}

interface PeerPredictionsProps {
  leagueId: string;
  matchId: string;
  currentUserId: string;
}

/**
 * Peer visibility (D-09/D-10, SOCIAL-02). Lists every league member's prediction
 * for a SCORED match. The get_match_predictions RPC is SECURITY DEFINER and
 * returns an empty set until the match is_final, so this never leaks live picks.
 * Sort order: current user first, then admin, then alphabetical by nickname.
 */
const PeerPredictions = ({ leagueId, matchId, currentUserId }: PeerPredictionsProps) => {
  const { t } = useTranslation();

  const { data: rows = [], isLoading, isError } = useQuery<PeerPrediction[]>({
    queryKey: ["match-predictions", leagueId, matchId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_match_predictions", {
        p_league_id: leagueId,
        p_match_id: matchId,
      });
      if (error) throw error;
      return (data ?? []) as PeerPrediction[];
    },
    retry: 0,
  });

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (a.user_id === currentUserId) return -1;
      if (b.user_id === currentUserId) return 1;
      if (a.role === "admin" && b.role !== "admin") return -1;
      if (b.role === "admin" && a.role !== "admin") return 1;
      return a.nickname.localeCompare(b.nickname);
    });
  }, [rows, currentUserId]);

  return (
    <div className="mt-1 p-2 border-2 border-foreground bg-background space-y-1.5">
      <p className="text-[6px] uppercase tracking-wider text-muted-foreground">{t("predict.peer_title")}</p>
      {isLoading ? (
        <p className="text-[6px] text-muted-foreground">{t("predict.peer_loading")}</p>
      ) : isError ? (
        <p className="text-[6px] text-muted-foreground">{t("predict.peer_loading")}</p>
      ) : sorted.length === 0 ? (
        <p className="text-[6px] text-muted-foreground">—</p>
      ) : (
        sorted.map((p) => {
          const isMe = p.user_id === currentUserId;
          const hasPrediction = p.home_score !== null && p.away_score !== null;
          return (
            <div
              key={p.user_id}
              className={`flex items-center justify-between gap-2 px-1.5 py-1 ${isMe ? "bg-pixel-gold/20" : ""}`}
            >
              <span className="text-[7px] text-foreground flex-1 truncate">
                {p.nickname}
                {p.role === "admin" && <span className="text-pixel-blue"> ★</span>}
              </span>
              <span className="text-[7px] text-foreground tabular-nums">
                {hasPrediction ? `${p.home_score}–${p.away_score}` : t("predict.peer_none")}
              </span>
              <span className="text-[6px] text-pixel-green tabular-nums min-w-[28px] text-right">
                {hasPrediction ? `+${p.points ?? 0}` : ""}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
};

export default PeerPredictions;
