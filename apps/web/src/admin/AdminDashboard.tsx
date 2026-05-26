import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import {
  adminFinalizeMatch,
  adminLogout,
  getAdminToken,
  getAppConfig,
  updateAppConfigKey,
  listLeagues,
  setLeagueTier,
  type AdminLeague,
  type AppConfig,
} from "./adminClient";

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

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [formStates, setFormStates] = useState<Record<string, MatchFormState>>({});

  // Plan 04-02: app_config editor (currently just bonus_reveal_lead_minutes).
  const [appConfig, setAppConfig] = useState<AppConfig>({});
  const [leadInput, setLeadInput] = useState("");
  const [leadSaving, setLeadSaving] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadSuccess, setLeadSuccess] = useState(false);

  // Plan 04-02: leagues list with tier toggle.
  const [leagues, setLeagues] = useState<AdminLeague[]>([]);
  const [leaguesLoading, setLeaguesLoading] = useState(false);
  const [leaguesError, setLeaguesError] = useState<string | null>(null);
  const [tierPendingId, setTierPendingId] = useState<string | null>(null);

  // Guard: any time this view mounts (or remounts after a token expiry),
  // bounce to the admin login if there's no live token.
  useEffect(() => {
    if (!getAdminToken()) {
      navigate("/admin/login", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!getAdminToken()) return;
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
        const initial: Record<string, MatchFormState> = {};
        for (const m of (data as Match[]) ?? []) {
          initial[m.id] = {
            homeScore: m.home_score !== null ? String(m.home_score) : "",
            awayScore: m.away_score !== null ? String(m.away_score) : "",
            bonusResult: m.bonus_result ?? false,
            loading: false,
            error: null,
            success: false,
          };
        }
        setFormStates(initial);
      });
  }, []);

  // Plan 04-02: load app_config and leagues for the new admin sections.
  useEffect(() => {
    if (!getAdminToken()) return;
    getAppConfig()
      .then((c) => {
        setAppConfig(c);
        const lead = typeof c.bonus_reveal_lead_minutes === "number"
          ? c.bonus_reveal_lead_minutes
          : Number(c.bonus_reveal_lead_minutes ?? 60);
        setLeadInput(String(lead || 60));
      })
      .catch((err) =>
        setLeadError(err instanceof Error ? err.message : "Failed to load app config")
      );
    setLeaguesLoading(true);
    listLeagues()
      .then((rows) => setLeagues(rows))
      .catch((err) =>
        setLeaguesError(err instanceof Error ? err.message : "Failed to load leagues")
      )
      .finally(() => setLeaguesLoading(false));
  }, []);

  const handleSaveLeadTime = async () => {
    const v = Number(leadInput);
    if (!Number.isInteger(v) || v < 1) {
      setLeadError("Lead minutes must be a positive integer");
      return;
    }
    setLeadSaving(true);
    setLeadError(null);
    setLeadSuccess(false);
    try {
      await updateAppConfigKey("bonus_reveal_lead_minutes", v);
      setAppConfig((prev) => ({ ...prev, bonus_reveal_lead_minutes: v }));
      setLeadSuccess(true);
    } catch (err) {
      if (!getAdminToken()) {
        navigate("/admin/login", { replace: true });
        return;
      }
      setLeadError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLeadSaving(false);
    }
  };

  const handleFlipTier = async (id: string, currentTier: "free" | "premium") => {
    const next: "free" | "premium" = currentTier === "free" ? "premium" : "free";
    setTierPendingId(id);
    setLeaguesError(null);
    try {
      await setLeagueTier(id, next);
      setLeagues((prev) => prev.map((l) => (l.id === id ? { ...l, tier: next } : l)));
    } catch (err) {
      if (!getAdminToken()) {
        navigate("/admin/login", { replace: true });
        return;
      }
      setLeaguesError(err instanceof Error ? err.message : "Tier flip failed");
    } finally {
      setTierPendingId(null);
    }
  };

  const updateFormState = (matchId: string, patch: Partial<MatchFormState>) => {
    setFormStates((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], ...patch },
    }));
  };

  const handleFinalize = async (matchId: string) => {
    const form = formStates[matchId];
    if (!form) return;
    const homeScore = Number(form.homeScore);
    const awayScore = Number(form.awayScore);
    if (!Number.isFinite(homeScore) || homeScore < 0 || !Number.isFinite(awayScore) || awayScore < 0) {
      updateFormState(matchId, { error: "Scores must be non-negative integers", success: false });
      return;
    }

    updateFormState(matchId, { loading: true, error: null, success: false });

    try {
      await adminFinalizeMatch({ matchId, homeScore, awayScore, bonusResult: form.bonusResult });
      updateFormState(matchId, { loading: false, success: true });
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
      const message = err instanceof Error ? err.message : "Unexpected error";
      // adminFetch clears the token on 401 — if that happened, send the admin
      // back to the login screen so they don't keep posting with a dead token.
      if (!getAdminToken()) {
        navigate("/admin/login", { replace: true });
        return;
      }
      updateFormState(matchId, { loading: false, error: message });
    }
  };

  const handleLogout = () => {
    adminLogout();
    navigate("/admin/login", { replace: true });
  };

  if (matchesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const nonFinalMatches = matches.filter((m) => !m.is_final);
  const finalMatches = matches.filter((m) => m.is_final);

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-[600px] mx-auto px-4 py-8 space-y-8">
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

        {/* Plan 04-02: Global settings (bonus reveal lead time). */}
        <div className="space-y-3">
          <h2 className="text-foreground text-[8px] uppercase tracking-widest border-b border-border pb-2">
            Global Settings
          </h2>
          <div className="pixel-border p-4 space-y-3 bg-background">
            <div className="space-y-1">
              <label className="text-[7px] text-foreground uppercase tracking-widest">
                Bonus reveal lead minutes
              </label>
              <p className="text-[6px] text-muted-foreground">
                How long before kickoff the bonus question text becomes visible to predictors.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={leadInput}
                onChange={(e) => {
                  setLeadInput(e.target.value);
                  setLeadSuccess(false);
                  setLeadError(null);
                }}
                className="w-20 h-10 text-center text-[10px] bg-background border-2 border-border text-foreground pixel-border focus:outline-none focus:border-primary"
              />
              <button
                onClick={handleSaveLeadTime}
                disabled={leadSaving}
                className="h-10 px-4 pixel-border text-primary-foreground text-[7px] uppercase tracking-widest bg-foreground active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-40"
              >
                {leadSaving ? "Saving..." : "Save"}
              </button>
            </div>
            {leadError && <p className="text-[7px] text-pixel-red">{leadError}</p>}
            {leadSuccess && <p className="text-[7px] text-pixel-green">Saved.</p>}
          </div>
        </div>

        {/* Plan 04-02: Leagues list with tier flip + free-cap warning. */}
        <div className="space-y-3">
          <h2 className="text-foreground text-[8px] uppercase tracking-widest border-b border-border pb-2">
            Leagues ({leagues.length})
          </h2>
          {leaguesError && (
            <p className="text-[7px] text-pixel-red text-center">{leaguesError}</p>
          )}
          {leaguesLoading && (
            <p className="text-muted-foreground text-[7px] text-center py-2">Loading…</p>
          )}
          {!leaguesLoading && leagues.length === 0 && (
            <p className="text-muted-foreground text-[7px] text-center py-4">No leagues yet.</p>
          )}
          {leagues.map((l) => {
            const rawMax = appConfig.LEAGUE_FREE_MAX_MEMBERS;
            const max = typeof rawMax === "number" ? rawMax : Number(rawMax ?? 10);
            const atCap = l.tier === "free" && l.member_count >= max;
            return (
              <div
                key={l.id}
                className="pixel-border p-3 flex items-center justify-between gap-3 bg-background"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-[9px] uppercase tracking-wider truncate">
                    {l.name}
                  </p>
                  <p className="text-[6px] text-muted-foreground">
                    {l.invite_code} · {l.member_count} member
                    {l.member_count === 1 ? "" : "s"}
                    {l.tier === "free" && ` / ${max}`}
                    {atCap && " (full)"}
                  </p>
                </div>
                <span
                  className={`text-[6px] uppercase border px-1 py-0.5 ${
                    l.tier === "premium"
                      ? "text-pixel-gold border-pixel-gold"
                      : "text-muted-foreground border-border"
                  }`}
                >
                  {l.tier}
                </span>
                <button
                  onClick={() => handleFlipTier(l.id, l.tier)}
                  disabled={tierPendingId === l.id}
                  className="h-8 px-3 pixel-border text-primary-foreground text-[6px] uppercase tracking-widest bg-foreground active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-40"
                >
                  {tierPendingId === l.id
                    ? "..."
                    : l.tier === "free"
                      ? "Flip to Premium"
                      : "Revert to Free"}
                </button>
              </div>
            );
          })}
        </div>

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
              <div key={match.id} className="pixel-border p-4 space-y-4 bg-background">
                <div className="text-center space-y-1">
                  <p className="text-foreground text-[9px] uppercase tracking-wider">
                    {match.home_team} <span className="text-muted-foreground">vs</span> {match.away_team}
                  </p>
                  <p className="text-muted-foreground text-[7px]">
                    {match.stage} · {kickoff.toLocaleDateString()} {kickoff.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

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

                <div className="space-y-2">
                  <p className="text-[7px] text-muted-foreground text-center">
                    {match.bonus_question ?? "Bonus Result"}
                  </p>
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

                {form.error && (
                  <p className="text-[7px] text-pixel-red text-center">{form.error}</p>
                )}
                {form.success && (
                  <p className="text-[7px] text-pixel-green text-center">Result finalized!</p>
                )}

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

        {finalMatches.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-foreground text-[8px] uppercase tracking-widest border-b border-border pb-2">
              Finalized Matches ({finalMatches.length})
            </h2>
            {finalMatches.map((match) => (
              <div key={match.id} className="pixel-border p-3 space-y-1 opacity-60">
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

        <div className="flex justify-between items-center pt-4 border-t border-border">
          <button
            onClick={() => navigate("/")}
            className="text-[7px] text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            ← Back to App
          </button>
          <button
            onClick={handleLogout}
            className="text-[7px] text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
