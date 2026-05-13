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

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

function clearStaleSupabaseTokens() {
  if (typeof window === "undefined") return;
  // Supabase stores auth tokens under keys like `sb-<projectRef>-auth-token`.
  // A token signed by a *different* Supabase instance (e.g. a stale remote token
  // when we've switched to local) can deadlock the auth client on init.
  Object.keys(window.localStorage)
    .filter((k) => k.startsWith("sb-") && k.endsWith("-auth-token"))
    .forEach((k) => window.localStorage.removeItem(k));
}

async function loadSession(attempt = 0): Promise<{ session: Session | null; leagues: LeagueSummary[] }> {
  // getSession() reads from storage (fast); getUser() triggers a network roundtrip
  // that can hang on stale refresh tokens. The Supabase queries below will fail
  // with RLS if the token is actually invalid, so we don't need server verification.
  let authSession: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] = null;
  try {
    const result = await withTimeout(
      supabase.auth.getSession(),
      5000,
      "supabase.auth.getSession",
    );
    authSession = result.data.session;
  } catch (err) {
    // SDK deadlocked on a stale refresh token. Once the auth client's internal
    // mutex is stuck, no future auth call will resolve — only a fresh page load
    // recreates the client. Clear tokens and reload, with a sessionStorage guard
    // to avoid an infinite reload loop if the issue persists.
    console.warn("[loadSession] getSession timed out", err);
    if (typeof window !== "undefined") {
      const recoveryFlag = "supabase-auth-recovery-attempted";
      if (!window.sessionStorage.getItem(recoveryFlag)) {
        window.sessionStorage.setItem(recoveryFlag, "1");
        clearStaleSupabaseTokens();
        window.location.reload();
        // Halt this run while reload is pending.
        return new Promise(() => {});
      }
    }
    return { session: null, leagues: [] };
  }
  // Recovery succeeded — clear the guard so future timeouts can recover too.
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem("supabase-auth-recovery-attempted");
  }
  const user = authSession?.user;
  console.debug("[loadSession] authSession user:", user?.id ?? null, "attempt:", attempt);
  if (!user) return { session: null, leagues: [] };

  // maybeSingle() returns { data: null } cleanly when 0 rows; single() would log
  // a PGRST116 error to the console during the retry window between sign-in and
  // the users-row insert.
  const { data: dbUser, error: dbUserErr } = await supabase
    .from("users")
    .select("id, nickname, is_global_admin")
    .eq("id", user.id)
    .maybeSingle();
  console.debug("[loadSession] users row:", dbUser, "err:", dbUserErr);

  if (!dbUser) {
    // Race condition: auth row exists but DB row not yet inserted → retry
    if (attempt < 5) {
      await new Promise((r) => setTimeout(r, 500));
      return loadSession(attempt + 1);
    }
    return { session: null, leagues: [] };
  }

  const { data: memberships, error: membershipErr } = await supabase
    .from("league_members")
    .select("id, role, joined_at, leagues(id, name)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true });
  console.debug("[loadSession] memberships:", memberships, "err:", membershipErr);

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
    isGlobalAdmin: dbUser.is_global_admin ?? false,
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
    loadSession()
      .then(applySessionResult)
      .catch((err) => {
        console.error("Failed to load session:", err);
        applySessionResult({ session: null, leagues: [] });
      })
      .finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        setSession(null);
        setLeagues([]);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        try {
          const result = await loadSession();
          applySessionResult(result);
        } catch (err) {
          console.error("Failed to reload session after auth event:", err);
        }
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
