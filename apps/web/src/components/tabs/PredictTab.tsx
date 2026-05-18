import { useState, useRef, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import MatchDetail from "@/components/MatchDetail";
import EnterResult from "@/components/EnterResult";
import StageNav from "@/components/StageNav";
import GroupFilter from "@/components/GroupFilter";
import BonusPrediction from "@/components/BonusPrediction";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { DbMatch, DbPrediction, Session } from "@/lib/supabase/types";
import LockCountdown from "@/components/LockCountdown";

type MatchStatus = "open" | "saved" | "locked" | "needs_result";

interface MatchWithStatus extends DbMatch {
  uiStatus: MatchStatus;
  prediction: DbPrediction | null;
}

interface PredictTabProps {
  isAdmin?: boolean;
  session: Session;
}

const statusConfig: Record<MatchStatus, { label: string; className: string }> = {
  open: { label: "OPEN", className: "bg-pixel-gold text-foreground" },
  saved: { label: "SAVED", className: "bg-pixel-green text-primary-foreground" },
  locked: { label: "LOCKED", className: "bg-muted text-muted-foreground" },
  needs_result: { label: "RESULT?", className: "bg-pixel-gold text-foreground" },
};

const PredictTab = ({ isAdmin = false, session }: PredictTabProps) => {
  const queryClient = useQueryClient();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [resultMatchId, setResultMatchId] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState("Matchday 1");
  const [activeGroup, setActiveGroup] = useState("All");
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tick every 60 s to re-evaluate match statuses (open → needs_result at kickoff).
  // LockCountdown has its own independent 30 s timer for the countdown display.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const { data: rawMatches = [] } = useQuery<DbMatch[]>({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .order("kickoff_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: predictions = [] } = useQuery<DbPrediction[]>({
    queryKey: ["predictions", session.userId, session.leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("*")
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

  const matches: MatchWithStatus[] = useMemo(() => {
    const now = new Date();
    return rawMatches.map((m) => {
      const pred = predictionMap.get(m.id) ?? null;
      let uiStatus: MatchStatus;
      if (m.is_final) {
        uiStatus = "locked";
      } else if (new Date(m.kickoff_at) <= now) {
        uiStatus = "needs_result";
      } else if (pred && pred.home_score !== null && pred.away_score !== null) {
        uiStatus = "saved";
      } else {
        uiStatus = "open";
      }
      return { ...m, uiStatus, prediction: pred };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawMatches, predictionMap, tick]);

  const stages = useMemo(() => [...new Set(matches.map((m) => m.stage))], [matches]);
  const groups = useMemo(() => {
    const gs = matches.filter((m) => m.group_name).map((m) => m.group_name as string);
    return ["All", ...new Set(gs)];
  }, [matches]);

  const isGroupFiltered = activeGroup !== "All";

  const filteredMatches = useMemo(() => {
    if (isGroupFiltered) return matches.filter((m) => m.group_name === activeGroup);
    return matches.filter((m) => m.stage === activeStage);
  }, [matches, activeStage, activeGroup, isGroupFiltered]);

  const subtitle = useMemo(() => {
    if (isGroupFiltered) return `Showing all ${activeGroup} matches`;
    const first = filteredMatches[0];
    return first
      ? new Date(first.kickoff_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "";
  }, [filteredMatches, isGroupFiltered, activeGroup]);

  const handleScoreChange = async (
    matchId: string,
    field: "home_score" | "away_score",
    value: string
  ) => {
    const numVal = value === "" ? null : parseInt(value, 10);
    const existing = predictionMap.get(matchId);
    const updatedHome = field === "home_score" ? numVal : existing?.home_score ?? null;
    const updatedAway = field === "away_score" ? numVal : existing?.away_score ?? null;

    await supabase.from("predictions").upsert(
      {
        user_id: session.userId,
        league_id: session.leagueId,
        match_id: matchId,
        home_score: updatedHome,
        away_score: updatedAway,
        // Preserve any existing bonus answer; the upsert overwrites the row.
        bonus_answer: existing?.bonus_answer ?? null,
      },
      { onConflict: "user_id,league_id,match_id" }
    );
    queryClient.invalidateQueries({ queryKey: ["predictions", session.userId, session.leagueId] });
  };

  // Save just the bonus_answer for a match. Requires existing home/away scores
  // because predictions.home_score / away_score are NOT NULL in the DB; the
  // BonusPrediction button is disabled until those are set.
  const handleBonusSave = async (matchId: string, answer: boolean) => {
    const existing = predictionMap.get(matchId);
    if (existing?.home_score == null || existing?.away_score == null) {
      // Defensive guard — UI should disable this path, but never silently
      // attempt an upsert that would violate the NOT NULL constraint.
      console.warn(
        "Refused bonus upsert: scores not yet set for match",
        matchId
      );
      return;
    }
    await supabase.from("predictions").upsert(
      {
        user_id: session.userId,
        league_id: session.leagueId,
        match_id: matchId,
        home_score: existing.home_score,
        away_score: existing.away_score,
        bonus_answer: answer,
      },
      { onConflict: "user_id,league_id,match_id" }
    );
    queryClient.invalidateQueries({ queryKey: ["predictions", session.userId, session.leagueId] });
  };

  const selectedMatch = selectedMatchId ? matches.find((m) => m.id === selectedMatchId) ?? null : null;
  const resultMatch = resultMatchId ? matches.find((m) => m.id === resultMatchId) ?? null : null;

  return (
    <div className="py-5 space-y-4">
      <StageNav
        stages={stages}
        active={activeStage}
        onChange={(s) => { setActiveStage(s); setActiveGroup("All"); }}
      />

      <div className="space-y-1">
        <h1 className="text-foreground text-lg">⚽ {isGroupFiltered ? activeGroup : activeStage}</h1>
        <p className="text-[7px] text-muted-foreground">{subtitle}</p>
      </div>

      <GroupFilter groups={groups} active={activeGroup} onChange={setActiveGroup} />

      {isGroupFiltered && (
        <button
          onClick={() => setActiveGroup("All")}
          className="flex items-center gap-1 text-[6px] text-pixel-red border border-pixel-red px-2 py-1"
        >
          <X size={10} /> Clear filter
        </button>
      )}

      {filteredMatches.length === 0 ? (
        <div className="pixel-border bg-card p-6 text-center">
          <p className="text-[8px] text-muted-foreground">No matches found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMatches.map((match) => {
            const { label, className } = statusConfig[match.uiStatus];
            const isLocked = match.uiStatus === "locked" || match.uiStatus === "needs_result";
            const homeVal = match.prediction?.home_score?.toString() ?? "";
            const awayVal = match.prediction?.away_score?.toString() ?? "";

            return (
              <div key={match.id}>
                <div
                  className={`pixel-border bg-card p-3 space-y-2 ${isLocked ? "opacity-50" : "cursor-pointer"}`}
                  onClick={() => { if (!isLocked) setSelectedMatchId(match.id); }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-foreground text-xs flex-1 truncate">{match.home_team}</span>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={homeVal}
                        disabled={true}
                        placeholder="–"
                        onChange={(e) => handleScoreChange(match.id, "home_score", e.target.value)}
                        onBlur={() => { blurTimeout.current = setTimeout(() => {}, 100); }}
                        className="w-8 h-8 pixel-inset bg-background text-center text-sm text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-40"
                      />
                      <span className="text-[7px] text-muted-foreground">:</span>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={awayVal}
                        disabled={true}
                        placeholder="–"
                        onChange={(e) => handleScoreChange(match.id, "away_score", e.target.value)}
                        className="w-8 h-8 pixel-inset bg-background text-center text-sm text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-40"
                      />
                    </div>

                    <span className="text-foreground text-xs flex-1 truncate text-right">{match.away_team}</span>

                    <span className={`text-[6px] px-1.5 py-0.5 border border-foreground ${className}`}>
                      {label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[6px] text-muted-foreground font-mono">
                      {new Date(match.kickoff_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} ·{" "}
                      {new Date(match.kickoff_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {isAdmin && match.uiStatus === "needs_result" && (
                      <button
                        className="text-[6px] text-pixel-blue border border-pixel-blue px-2 py-0.5"
                        onClick={(e) => { e.stopPropagation(); setResultMatchId(match.id); }}
                      >
                        ✎ Enter result
                      </button>
                    )}
                  </div>

                  {(match.uiStatus === "open" || match.uiStatus === "saved") && (
                    <LockCountdown kickoffAt={match.kickoff_at} />
                  )}
                </div>
                <BonusPrediction
                  matchId={match.id}
                  bonusQuestion={match.bonus_question}
                  initialAnswer={match.prediction?.bonus_answer ?? null}
                  // Lock at kickoff AND when no score prediction exists yet
                  // (predictions.home_score / away_score are NOT NULL in DB).
                  disabled={
                    isLocked ||
                    match.prediction?.home_score == null ||
                    match.prediction?.away_score == null
                  }
                  onSave={(answer) => handleBonusSave(match.id, answer)}
                />
              </div>
            );
          })}
        </div>
      )}

      {selectedMatch && (
        <MatchDetail
          open={!!selectedMatch}
          onClose={() => setSelectedMatchId(null)}
          home={selectedMatch.home_team}
          away={selectedMatch.away_team}
          initialHome={selectedMatch.prediction?.home_score ?? 0}
          initialAway={selectedMatch.prediction?.away_score ?? 0}
          onSave={async (homeScore, awayScore) => {
            await supabase.from("predictions").upsert(
              {
                user_id: session.userId,
                league_id: session.leagueId,
                match_id: selectedMatch.id,
                home_score: homeScore,
                away_score: awayScore,
                // Preserve any existing bonus answer through this upsert.
                bonus_answer: selectedMatch.prediction?.bonus_answer ?? null,
              },
              { onConflict: "user_id,league_id,match_id" }
            );
            queryClient.invalidateQueries({ queryKey: ["predictions", session.userId, session.leagueId] });
            setSelectedMatchId(null);
          }}
        />
      )}

      {resultMatch && (
        <EnterResult
          open={!!resultMatch}
          onClose={() => setResultMatchId(null)}
          matchId={resultMatch.id}
          leagueId={session.leagueId}
          home={resultMatch.home_team}
          away={resultMatch.away_team}
          memberCount={0}
          onConfirm={() => {}}
          onDone={() => {
            setResultMatchId(null);
            queryClient.invalidateQueries({ queryKey: ["matches"] });
            queryClient.invalidateQueries({ queryKey: ["predictions", session.userId, session.leagueId] });
          }}
        />
      )}
    </div>
  );
};

export default PredictTab;
