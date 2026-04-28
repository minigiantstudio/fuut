import { useState, useRef, useMemo } from "react";
import MatchDetail from "@/components/MatchDetail";
import EnterResult from "@/components/EnterResult";
import StageNav from "@/components/StageNav";
import GroupFilter from "@/components/GroupFilter";
import BonusPrediction from "@/components/BonusPrediction";
import { X } from "lucide-react";
import type { Match as SharedMatch } from "@fuut/types";

type MatchStatus = "open" | "saved" | "locked" | "needs_result";

interface Match extends SharedMatch {
  home: string;
  away: string;
  homeScore: string;
  awayScore: string;
  uiStatus: MatchStatus;
  stage: string;
  group?: string;
  date: string;
}

const allMatches: Match[] = [
  // Matchday 1
  { id: "1", home: "Morocco", away: "Croatia", homeScore: "", awayScore: "", uiStatus: "open", stage: "Matchday 1", group: "Group A", date: "Jun 11, 2026", home_team: "MAR", away_team: "CRO", kickoff_at: "2026-06-11T19:00:00Z", status: "scheduled" },
  { id: "2", home: "USA", away: "Mexico", homeScore: "", awayScore: "", uiStatus: "open", stage: "Matchday 1", group: "Group B", date: "Jun 11, 2026", home_team: "USA", away_team: "MEX", kickoff_at: "2026-06-11T21:00:00Z", status: "scheduled" },
  { id: "3", home: "France", away: "Australia", homeScore: "1", awayScore: "2", uiStatus: "saved", stage: "Matchday 1", group: "Group C", date: "Jun 12, 2026", home_team: "FRA", away_team: "AUS", kickoff_at: "2026-06-12T18:00:00Z", status: "scheduled" },
  { id: "4", home: "Brazil", away: "Serbia", homeScore: "3", awayScore: "1", uiStatus: "locked", stage: "Matchday 1", group: "Group D", date: "Jun 12, 2026", home_team: "BRA", away_team: "SRB", kickoff_at: "2026-06-12T21:00:00Z", status: "finished" },
  { id: "5", home: "Spain", away: "Japan", homeScore: "", awayScore: "", uiStatus: "needs_result", stage: "Matchday 1", group: "Group E", date: "Jun 12, 2026", home_team: "ESP", away_team: "JPN", kickoff_at: "2026-06-12T21:00:00Z", status: "live" },
  // Matchday 2
  { id: "6", home: "Croatia", away: "Canada", homeScore: "", awayScore: "", uiStatus: "open", stage: "Matchday 2", group: "Group A", date: "Jun 15, 2026", home_team: "CRO", away_team: "CAN", kickoff_at: "2026-06-15T19:00:00Z", status: "scheduled" },
  { id: "7", home: "Mexico", away: "Poland", homeScore: "", awayScore: "", uiStatus: "open", stage: "Matchday 2", group: "Group B", date: "Jun 15, 2026", home_team: "MEX", away_team: "POL", kickoff_at: "2026-06-15T21:00:00Z", status: "scheduled" },
  { id: "8", home: "Argentina", away: "Saudi Arabia", homeScore: "", awayScore: "", uiStatus: "open", stage: "Matchday 2", group: "Group C", date: "Jun 16, 2026", home_team: "ARG", away_team: "KSA", kickoff_at: "2026-06-16T18:00:00Z", status: "scheduled" },
  { id: "9", home: "Germany", away: "Japan", homeScore: "", awayScore: "", uiStatus: "open", stage: "Matchday 2", group: "Group D", date: "Jun 16, 2026", home_team: "GER", away_team: "JPN", kickoff_at: "2026-06-16T21:00:00Z", status: "scheduled" },
  // Matchday 3
  { id: "10", home: "Morocco", away: "Canada", homeScore: "", awayScore: "", uiStatus: "open", stage: "Matchday 3", group: "Group A", date: "Jun 19, 2026", home_team: "MAR", away_team: "CAN", kickoff_at: "2026-06-19T19:00:00Z", status: "scheduled" },
  { id: "11", home: "USA", away: "Poland", homeScore: "", awayScore: "", uiStatus: "open", stage: "Matchday 3", group: "Group B", date: "Jun 19, 2026", home_team: "USA", away_team: "POL", kickoff_at: "2026-06-19T21:00:00Z", status: "scheduled" },
  { id: "12", home: "France", away: "Argentina", homeScore: "", awayScore: "", uiStatus: "open", stage: "Matchday 3", group: "Group C", date: "Jun 20, 2026", home_team: "FRA", away_team: "ARG", kickoff_at: "2026-06-20T18:00:00Z", status: "scheduled" },
  // Round of 16
  { id: "13", home: "TBD", away: "TBD", homeScore: "", awayScore: "", uiStatus: "open", stage: "Round of 16", date: "Jun 23, 2026", home_team: "TBD", away_team: "TBD", kickoff_at: "2026-06-23T18:00:00Z", status: "scheduled" },
  { id: "14", home: "TBD", away: "TBD", homeScore: "", awayScore: "", uiStatus: "open", stage: "Round of 16", date: "Jun 23, 2026", home_team: "TBD", away_team: "TBD", kickoff_at: "2026-06-23T21:00:00Z", status: "scheduled" },
  // Quarter-finals
  { id: "15", home: "TBD", away: "TBD", homeScore: "", awayScore: "", uiStatus: "open", stage: "Quarter-finals", date: "Jun 27, 2026", home_team: "TBD", away_team: "TBD", kickoff_at: "2026-06-27T20:00:00Z", status: "scheduled" },
  // Semi-finals
  { id: "16", home: "TBD", away: "TBD", homeScore: "", awayScore: "", uiStatus: "open", stage: "Semi-finals", date: "Jun 30, 2026", home_team: "TBD", away_team: "TBD", kickoff_at: "2026-06-30T20:00:00Z", status: "scheduled" },
  // Final
  { id: "17", home: "TBD", away: "TBD", homeScore: "", awayScore: "", uiStatus: "open", stage: "Final", date: "Jul 3, 2026", home_team: "TBD", away_team: "TBD", kickoff_at: "2026-07-03T20:00:00Z", status: "scheduled" },
];

const statusConfig: Record<MatchStatus, { label: string; className: string }> = {
  open: { label: "OPEN", className: "bg-pixel-gold text-foreground" },
  saved: { label: "SAVED", className: "bg-pixel-green text-primary-foreground" },
  locked: { label: "LOCKED", className: "bg-muted text-muted-foreground" },
  needs_result: { label: "RESULT?", className: "bg-pixel-gold text-foreground" },
};

interface PredictTabProps {
  isAdmin?: boolean;
}

const PredictTab = ({ isAdmin = false }: PredictTabProps) => {
  const [matches, setMatches] = useState<Match[]>(allMatches);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [resultMatch, setResultMatch] = useState<Match | null>(null);
  const [activeStage, setActiveStage] = useState("Matchday 1");
  const [activeGroup, setActiveGroup] = useState("All");
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isGroupFiltered = activeGroup !== "All";

  const filteredMatches = useMemo(() => {
    if (isGroupFiltered) {
      return matches.filter((m) => m.group === activeGroup);
    }
    return matches.filter((m) => m.stage === activeStage);
  }, [matches, activeStage, activeGroup, isGroupFiltered]);

  const subtitle = useMemo(() => {
    if (isGroupFiltered) return `Showing all ${activeGroup} matches`;
    const first = filteredMatches[0];
    return first?.date ?? "";
  }, [filteredMatches, isGroupFiltered, activeGroup]);

  const handleClearFilters = () => setActiveGroup("All");

  const handleScoreChange = (id: string, field: "homeScore" | "awayScore", value: string) => {
    if (value !== "" && !/^\d{0,2}$/.test(value)) return;
    setMatches((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value, uiStatus: m.uiStatus === "locked" ? "locked" : "open" } : m))
    );
  };

  const handleBlur = (id: string) => {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    blurTimeout.current = setTimeout(() => {
      setMatches((prev) =>
        prev.map((m) => {
          if (m.id !== id || m.uiStatus === "locked") return m;
          return m.homeScore !== "" && m.awayScore !== "" ? { ...m, uiStatus: "saved" } : m;
        })
      );
    }, 100);
  };

  const handleRowTap = (match: Match) => {
    if (match.uiStatus === "locked" || match.uiStatus === "needs_result") return;
    setSelectedMatch(match);
  };

  const handleResultConfirm = (homeScore: number, awayScore: number) => {
    if (!resultMatch) return;
    setMatches((prev) =>
      prev.map((m) =>
        m.id === resultMatch.id
          ? { ...m, homeScore: String(homeScore), awayScore: String(awayScore), uiStatus: "locked" as MatchStatus }
          : m
      )
    );
  };

  const handleDetailSave = (homeScore: number, awayScore: number) => {
    if (!selectedMatch) return;
    setMatches((prev) =>
      prev.map((m) =>
        m.id === selectedMatch.id
          ? { ...m, homeScore: String(homeScore), awayScore: String(awayScore), uiStatus: "saved" }
          : m
      )
    );
  };

  return (
    <div className="py-5 space-y-4">
      <div>
        <h1 className="text-foreground text-lg">
          ▸ {isGroupFiltered ? activeGroup : activeStage}
        </h1>
        <p className="text-[7px] text-muted-foreground mt-1">{subtitle}</p>
      </div>

      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <StageNav active={activeStage} onSelect={(s) => { setActiveStage(s); setActiveGroup("All"); }} />
        </div>
        <GroupFilter active={activeGroup} onSelect={setActiveGroup} />
      </div>

      {isGroupFiltered && (
        <button
          onClick={handleClearFilters}
          className="flex items-center gap-1 px-3 py-1.5 text-[6px] uppercase tracking-wider border-2 border-foreground bg-pixel-red text-primary-foreground pixel-press"
        >
          <X size={8} />
          Clear filter
        </button>
      )}

      <div className="space-y-3">
        {filteredMatches.length === 0 && (
          <div className="pixel-border bg-card p-6 text-center">
            <p className="text-[8px] text-muted-foreground">No matches found</p>
          </div>
        )}

        {filteredMatches.map((match) => {
          const locked = match.uiStatus === "locked";
          const needsResult = match.uiStatus === "needs_result";
          const cfg = statusConfig[match.uiStatus];

          return (
            <div
              key={match.id}
              onClick={() => handleRowTap(match)}
              className={`pixel-border bg-card p-3 space-y-3 ${locked ? "opacity-50 cursor-default" : needsResult ? "cursor-default" : "cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"}`}
            >
              {isGroupFiltered && (
                <p className="text-[6px] text-muted-foreground uppercase tracking-wider">{match.stage} · {match.date}</p>
              )}

              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-foreground truncate text-right flex-1 text-xs">{match.home}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      disabled={locked || needsResult}
                      value={match.homeScore}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleScoreChange(match.id, "homeScore", e.target.value)}
                      onBlur={() => handleBlur(match.id)}
                      className="w-8 h-8 pixel-inset bg-background text-center text-[10px] text-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <span className="text-[8px] text-muted-foreground">:</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      disabled={locked || needsResult}
                      value={match.awayScore}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleScoreChange(match.id, "awayScore", e.target.value)}
                      onBlur={() => handleBlur(match.id)}
                      className="w-8 h-8 pixel-inset bg-background text-center text-[10px] text-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <span className="text-foreground truncate text-left flex-1 text-xs">{match.away}</span>
                  </div>
                </div>
                <span className={`shrink-0 text-[6px] px-2 py-1 border-2 border-foreground ${cfg.className}`}>{cfg.label}</span>
              </div>

              <BonusPrediction matchId={match.id} disabled={locked} />

              {isAdmin && needsResult && (
                <button
                  className="w-full py-2 pixel-border-sm bg-pixel-gold text-foreground text-[7px] uppercase tracking-wider active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                  onClick={(e) => { e.stopPropagation(); setResultMatch(match); }}
                >
                  ✎ Enter result
                </button>
              )}

              {resultMatch && (
                <EnterResult
                  open={!!resultMatch}
                  onClose={() => setResultMatch(null)}
                  home={resultMatch.home}
                  away={resultMatch.away}
                  memberCount={6}
                  onConfirm={handleResultConfirm}
                />
              )}
            </div>
          );
        })}
      </div>

      {selectedMatch && (
        <MatchDetail
          open={!!selectedMatch}
          onClose={() => setSelectedMatch(null)}
          home={selectedMatch.home}
          away={selectedMatch.away}
          initialHome={selectedMatch.homeScore ? parseInt(selectedMatch.homeScore) : 0}
          initialAway={selectedMatch.awayScore ? parseInt(selectedMatch.awayScore) : 0}
          onSave={handleDetailSave}
        />
      )}
    </div>
  );
};

export default PredictTab;
