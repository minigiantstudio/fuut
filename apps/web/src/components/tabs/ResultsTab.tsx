import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Session } from "@/lib/supabase/types";

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
  const { data: scored = [], isLoading } = useQuery<ScoredPrediction[]>({
    queryKey: ["scored-predictions", session.userId, session.leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("*, matches(*)")
        .eq("user_id", session.userId)
        .eq("league_id", session.leagueId)
        .eq("is_scored", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ScoredPrediction[];
    },
  });

  const totalPoints = scored.reduce((sum, p) => sum + (p.points ?? 0), 0);

  return (
    <div className="py-5 space-y-4">
      <div>
        <h1 className="text-foreground text-lg">📋 Results</h1>
        <p className="text-[7px] text-muted-foreground mt-1">Your scored predictions</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : scored.length === 0 ? (
        <div className="pixel-border bg-card p-6 text-center">
          <p className="text-[8px] text-muted-foreground">No results yet</p>
          <p className="text-[6px] text-muted-foreground mt-2">Predictions are scored after the match ends</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scored.map((p) => (
            <div key={p.id} className="pixel-border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-foreground text-xs">
                  {p.matches.home_team} {p.matches.home_score} – {p.matches.away_score} {p.matches.away_team}
                </span>
                <span className="text-[6px] px-2 py-0.5 bg-pixel-green text-primary-foreground border-2 border-foreground">
                  FT
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[7px] text-muted-foreground">
                  Pred: {p.home_score}–{p.away_score}
                </span>
                <PointsBadge points={p.points ?? 0} />
              </div>
            </div>
          ))}

          <div className="pixel-border-sm bg-muted p-3 flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Total points</span>
            <span className="text-[8px] text-pixel-green">+{totalPoints} pts</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsTab;
