import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Session } from "@/lib/supabase/types";

export interface LeagueSummary {
  leagueId: string;
  leagueName: string;
  role: string;
}

interface SessionContextValue {
  session: Session | null;
  leagues: LeagueSummary[];
  loading: boolean;
  refreshSession: () => Promise<void>;
  setActiveLeague: (leagueId: string) => void;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  leagues: [],
  loading: true,
  refreshSession: async () => {},
  setActiveLeague: () => {},
});

export const useSession = () => useContext(SessionContext);

async function loadSession(attempt = 0): Promise<{ session: Session | null; leagues: LeagueSummary[] }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { session: null, leagues: [] };

  // maybeSingle() returns { data: null } cleanly when 0 rows; single() would log
  // a PGRST116 error to the console during the retry window between sign-in and
  // the users-row insert.
  const { data: dbUser } = await supabase
    .from("users")
    .select("id, nickname")
    .eq("id", user.id)
    .maybeSingle();

  if (!dbUser) {
    // Race condition: auth row exists but DB row not yet inserted → retry
    if (attempt < 5) {
      await new Promise((r) => setTimeout(r, 500));
      return loadSession(attempt + 1);
    }
    return { session: null, leagues: [] };
  }

  const { data: memberships } = await supabase
    .from("league_members")
    .select("id, role, joined_at, leagues(id, name)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true });

  const leagues: LeagueSummary[] = (memberships ?? [])
    .filter((m) => m.leagues)
    .map((m) => ({
      leagueId: (m.leagues as { id: string; name: string }).id,
      leagueName: (m.leagues as { id: string; name: string }).name,
      role: m.role,
    }));

  if (leagues.length === 0) return { session: null, leagues: [] };

  // Restore active league from localStorage if valid; else use first
  const stored = typeof window !== "undefined" ? localStorage.getItem("activeLeagueId") : null;
  const active = stored && leagues.find((l) => l.leagueId === stored)
    ? leagues.find((l) => l.leagueId === stored)!
    : leagues[0];

  const session: Session = {
    userId: user.id,
    nickname: dbUser.nickname,
    leagueId: active.leagueId,
    leagueName: active.leagueName,
    role: active.role,
  };

  return { session, leagues };
}

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const applySessionResult = useCallback((result: { session: Session | null; leagues: LeagueSummary[] }) => {
    setSession(result.session);
    setLeagues(result.leagues);
  }, []);

  const refreshSession = useCallback(async () => {
    const result = await loadSession();
    applySessionResult(result);
  }, [applySessionResult]);

  const setActiveLeague = useCallback((leagueId: string) => {
    const target = leagues.find((l) => l.leagueId === leagueId);
    if (!target) return;
    localStorage.setItem("activeLeagueId", leagueId);
    setSession((prev) =>
      prev ? { ...prev, leagueId: target.leagueId, leagueName: target.leagueName, role: target.role } : prev
    );
  }, [leagues]);

  useEffect(() => {
    loadSession().then((result) => {
      applySessionResult(result);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        setSession(null);
        setLeagues([]);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const result = await loadSession();
        applySessionResult(result);
      }
    });

    return () => subscription.unsubscribe();
  }, [applySessionResult]);

  return (
    <SessionContext.Provider value={{ session, leagues, loading, refreshSession, setActiveLeague }}>
      {children}
    </SessionContext.Provider>
  );
};
