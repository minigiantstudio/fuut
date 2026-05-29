import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { DbMatchWithBonus, DbPrediction, Session } from "@/lib/supabase/types";
import { useTranslation } from "@/lib/i18n";

interface ScoredPrediction {
  id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  points: number;
  matches: {
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
    kickoff_at: string;
    stage: string;
  };
}

interface ResultsTabProps {
  session: Session;
}

const PointsBadge = ({ points }: { points: number }) => {
  if (points >= 3) return <span className="text-[7px] text-pixel-green">+{points} pts ★</span>;
  if (points === 1) return <span className="text-[7px] text-pixel-green">+1 pt</span>;
  return <span className="text-[7px] text-muted-foreground">0 pts</span>;
};

const ResultsTab = ({ session }: ResultsTabProps) => {
  const { t } = useTranslation();
  const { data: rawMatches = [], isLoading: isLoadingMatches } = useQuery<DbMatchWithBonus[]>({
    queryKey: ["matches-finished"],
    queryFn: async () => {
      // matches.bonus_question is REVOKEd from direct SELECT (04-03), so finished
      // results must read it through the redaction RPC. Finished matches are
      // always past kickoff, so bonus_question is unredacted for all of them.
      const { data, error } = await supabase.rpc("get_matches_with_bonus");
      if (error) throw error;
      return ((data ?? []) as DbMatchWithBonus[])
        .filter((m) => m.is_final)
        .sort((a, b) => new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime());
    },
  });

  const { data: predictions = [], isLoading: isLoadingPredictions } = useQuery<DbPrediction[]>({
    queryKey: ["predictions-scored", session.userId, session.leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("id, match_id, home_score, away_score, points, points_match, points_bonus, bonus_answer")
        .eq("user_id", session.userId)
        .eq("league_id", session.leagueId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const predictionMap = useMemo(() => {
    const map = new Map<string, DbPrediction>();
    predictions.forEach((p) => map.set(p.match_id, p));
    return map;
  }, [predictions]);

  const finishedMatches = useMemo(() => {
    return rawMatches.map((m) => ({
      ...m,
      prediction: predictionMap.get(m.id) || null,
    }));
  }, [rawMatches, predictionMap]);

  const totalPoints = predictions.reduce((sum, p) => sum + (p.points ?? 0), 0);

  const isLoading = isLoadingMatches || isLoadingPredictions;

  return (
    <div className="py-5 space-y-4">
      <div>
        <h1 className="text-foreground text-lg">{t("results.title")}</h1>
        <p className="text-[7px] text-muted-foreground mt-1">All finished matches</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : finishedMatches.length === 0 ? (
        <div className="pixel-border bg-card p-6 text-center">
          <p className="text-[8px] text-muted-foreground">{t("results.no_results")}</p>
          <p className="text-[6px] text-muted-foreground mt-2">Finished matches will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {finishedMatches.map((m) => {
            const pred = m.prediction;
            return (
              <div key={m.id} className="pixel-border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-foreground text-xs">
                    {m.home_team} {m.home_score} – {m.away_score} {m.away_team}
                  </span>
                  <span className="text-[6px] px-2 py-0.5 bg-pixel-green text-primary-foreground border-2 border-foreground">
                    FT
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[7px] text-muted-foreground">
                    Pred: {pred ? `${pred.home_score}–${pred.away_score}` : "–"}
                    {m.bonus_question && (
                      <span className="block mt-1">
                        Bonus: {pred?.bonus_answer ? "Yes" : "No"}
                      </span>
                    )}
                  </span>
                  <div className="flex flex-col items-end">
                    <PointsBadge points={pred?.points ?? 0} />
                    {m.bonus_question && (
                      <span className="text-[6px] text-muted-foreground">
                        Bonus: {pred?.points_bonus ?? 0} pts
                      </span>
                    )}
                  </div>
                </div>
                {m.bonus_question && (
                  <div className="pt-2 border-t border-dashed border-border mt-2">
                    <p className="text-[7px] text-foreground">{m.bonus_question}</p>
                    <p className="text-[6px] text-muted-foreground mt-1">
                      Result: {m.bonus_result ? "Yes" : "No"}
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          <div className="pixel-border-sm bg-muted p-3 flex items-center justify-between">
            <span className="text-muted-foreground text-xs">{t("results.total_points")}</span>
            <span className="text-[8px] text-pixel-green">+{totalPoints} {t("results.points")}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsTab;
