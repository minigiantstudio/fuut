import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/lib/supabase/client";

interface Match {
  id: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  stage: string;
  home_score: number | null;
  away_score: number | null;
  is_final: boolean;
  is_manual_override: boolean;
  bonus_question: string | null;
  bonus_result: boolean | null;
}

interface MatchFormState {
  homeScore: string;
  awayScore: string;
  bonusResult: boolean;
  loading: boolean;
  error: string | null;
  success: boolean;
}

const AdminPage = () => {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [formStates, setFormStates] = useState<Record<string, MatchFormState>>({});

  // Guard: redirect non-admins to /
  useEffect(() => {
    if (!loading) {
      if (!session || !session.isGlobalAdmin) {
        navigate("/");
      }
    }
  }, [loading, session, navigate]);

  // Load matches
  useEffect(() => {
    if (!session?.isGlobalAdmin) return;

    setMatchesLoading(true);
    supabase
      .from("matches")
      .select("id, home_team, away_team, kickoff_at, stage, home_score, away_score, is_final, is_manual_override, bonus_question, bonus_result")
      .order("kickoff_at", { ascending: true })
      .then(({ data, error }) => {
        setMatchesLoading(false);
        if (error) {
          setMatchesError(error.message);
          return;
        }
        setMatches((data as Match[]) ?? []);

        // Pre-populate form states from existing data
        const initialStates: Record<string, MatchFormState> = {};
        for (const m of (data as Match[]) ?? []) {
          initialStates[m.id] = {
            homeScore: m.home_score !== null ? String(m.home_score) : "",
            awayScore: m.away_score !== null ? String(m.away_score) : "",
            bonusResult: m.bonus_result ?? false,
            loading: false,
            error: null,
            success: false,
          };
        }
        setFormStates(initialStates);
      });
  }, [session]);

  const updateFormState = (matchId: string, patch: Partial<MatchFormState>) => {
    setFormStates((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], ...patch },
    }));
  };

  const handleFinalize = async (matchId: string) => {
    const form = formStates[matchId];
    if (!form) return;

    const homeScore = parseInt(form.homeScore, 10);
    const awayScore = parseInt(form.awayScore, 10);

    if (isNaN(homeScore) || homeScore < 0) {
      updateFormState(matchId, { error: "Home score must be a non-negative integer" });
      return;
    }
    if (isNaN(awayScore) || awayScore < 0) {
      updateFormState(matchId, { error: "Away score must be a non-negative integer" });
      return;
    }

    updateFormState(matchId, { loading: true, error: null, success: false });

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;
      if (!token) throw new Error("Not authenticated");

      const apiUrl = import.meta.env.VITE_API_URL as string;
      const response = await fetch(`${apiUrl}/api/admin/match-result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          matchId,
          homeScore,
          awayScore,
          bonusResult: form.bonusResult,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(body.message ?? `HTTP ${response.status}`);
      }

      updateFormState(matchId, { loading: false, success: true });

      // Refresh match list to reflect finalized state
      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId
            ? {
                ...m,
                home_score: homeScore,
                away_score: awayScore,
                bonus_result: form.bonusResult,
                is_final: true,
                is_manual_override: true,
              }
            : m
        )
      );
    } catch (err) {
      updateFormState(matchId, {
        loading: false,
        error: err instanceof Error ? err.message : "Unexpected error",
      });
    }
  };

  if (loading || matchesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.isGlobalAdmin) {
    return null; // redirect effect handles navigation
  }

  const nonFinalMatches = matches.filter((m) => !m.is_final);
  const finalMatches = matches.filter((m) => m.is_final);

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-[600px] mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="space-y-2 text-center">
          <p className="text-2xl">🔧</p>
          <h1 className="text-foreground text-sm uppercase tracking-widest">Admin Panel</h1>
          <p className="text-muted-foreground text-[8px] uppercase tracking-wider">
            Manual match result override
          </p>
        </div>

        {matchesError && (
          <p className="text-[8px] text-pixel-red text-center">{matchesError}</p>
        )}

        {/* Pending matches */}
        <div className="space-y-4">
          <h2 className="text-foreground text-[8px] uppercase tracking-widest border-b border-border pb-2">
            Pending Matches ({nonFinalMatches.length})
          </h2>

          {nonFinalMatches.length === 0 && (
            <p className="text-muted-foreground text-[7px] text-center py-4">
              All matches finalized.
            </p>
          )}

          {nonFinalMatches.map((match) => {
            const form = formStates[match.id] ?? {
              homeScore: "",
              awayScore: "",
              bonusResult: false,
              loading: false,
              error: null,
              success: false,
            };
            const kickoff = new Date(match.kickoff_at);
            return (
              <div
                key={match.id}
                className="pixel-border p-4 space-y-4 bg-background"
              >
                {/* Match header */}
                <div className="text-center space-y-1">
                  <p className="text-foreground text-[9px] uppercase tracking-wider">
                    {match.home_team} <span className="text-muted-foreground">vs</span> {match.away_team}
                  </p>
                  <p className="text-muted-foreground text-[7px]">
                    {match.stage} · {kickoff.toLocaleDateString()} {kickoff.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                {/* Score inputs */}
                <div className="flex items-center gap-3 justify-center">
                  <div className="flex flex-col items-center gap-1">
                    <label className="text-[6px] text-muted-foreground uppercase tracking-widest">
                      {match.home_team}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.homeScore}
                      onChange={(e) => updateFormState(match.id, { homeScore: e.target.value, success: false, error: null })}
                      className="w-14 h-10 text-center text-[10px] bg-background border-2 border-border text-foreground pixel-border focus:outline-none focus:border-primary"
                    />
                  </div>

                  <span className="text-muted-foreground text-[10px] pb-1">—</span>

                  <div className="flex flex-col items-center gap-1">
                    <label className="text-[6px] text-muted-foreground uppercase tracking-widest">
                      {match.away_team}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.awayScore}
                      onChange={(e) => updateFormState(match.id, { awayScore: e.target.value, success: false, error: null })}
                      className="w-14 h-10 text-center text-[10px] bg-background border-2 border-border text-foreground pixel-border focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Bonus result toggle */}
                {match.bonus_question && (
                  <div className="space-y-2">
                    <p className="text-[7px] text-muted-foreground text-center">{match.bonus_question}</p>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => updateFormState(match.id, { bonusResult: true, success: false })}
                        className={`px-4 py-2 text-[7px] uppercase tracking-wider pixel-border transition-all ${
                          form.bonusResult
                            ? "bg-pixel-green text-primary-foreground"
                            : "bg-background text-muted-foreground"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => updateFormState(match.id, { bonusResult: false, success: false })}
                        className={`px-4 py-2 text-[7px] uppercase tracking-wider pixel-border transition-all ${
                          !form.bonusResult
                            ? "bg-pixel-red text-primary-foreground"
                            : "bg-background text-muted-foreground"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>
                )}

                {/* No bonus question — show simple toggle anyway */}
                {!match.bonus_question && (
                  <div className="space-y-1">
                    <p className="text-[7px] text-muted-foreground text-center">Bonus Result</p>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => updateFormState(match.id, { bonusResult: true, success: false })}
                        className={`px-4 py-2 text-[7px] uppercase tracking-wider pixel-border transition-all ${
                          form.bonusResult
                            ? "bg-pixel-green text-primary-foreground"
                            : "bg-background text-muted-foreground"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => updateFormState(match.id, { bonusResult: false, success: false })}
                        className={`px-4 py-2 text-[7px] uppercase tracking-wider pixel-border transition-all ${
                          !form.bonusResult
                            ? "bg-foreground text-background"
                            : "bg-background text-muted-foreground"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>
                )}

                {/* Error / success feedback */}
                {form.error && (
                  <p className="text-[7px] text-pixel-red text-center">{form.error}</p>
                )}
                {form.success && (
                  <p className="text-[7px] text-pixel-green text-center">Result finalized!</p>
                )}

                {/* Finalize button */}
                <button
                  onClick={() => handleFinalize(match.id)}
                  disabled={form.loading || form.homeScore === "" || form.awayScore === ""}
                  className="w-full h-10 pixel-border text-primary-foreground text-[7px] uppercase tracking-widest bg-foreground active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-40"
                >
                  {form.loading ? "Saving..." : "Finalize Result"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Finalized matches summary */}
        {finalMatches.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-foreground text-[8px] uppercase tracking-widest border-b border-border pb-2">
              Finalized Matches ({finalMatches.length})
            </h2>
            {finalMatches.map((match) => (
              <div
                key={match.id}
                className="pixel-border p-3 space-y-1 opacity-60"
              >
                <div className="flex justify-between items-center">
                  <p className="text-foreground text-[8px] uppercase tracking-wider">
                    {match.home_team} {match.home_score} — {match.away_score} {match.away_team}
                  </p>
                  <div className="flex gap-1">
                    {match.is_manual_override && (
                      <span className="text-[6px] text-muted-foreground uppercase border border-border px-1 py-0.5">
                        Manual
                      </span>
                    )}
                    <span className="text-[6px] text-pixel-green uppercase border border-pixel-green px-1 py-0.5">
                      Final
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back link */}
        <div className="text-center pt-4">
          <button
            onClick={() => navigate("/")}
            className="text-[7px] text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            Back to App
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
