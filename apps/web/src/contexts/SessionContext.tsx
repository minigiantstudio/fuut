import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Session } from "@/lib/supabase/types";

interface SessionContextValue {
  session: Session | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  loading: true,
  refreshSession: async () => {},
});

export const useSession = () => useContext(SessionContext);

async function loadSession(attempt = 0): Promise<Session | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: dbUser } = await supabase
    .from("users")
    .select("id, nickname")
    .eq("id", user.id)
    .single();

  if (!dbUser) {
    // Race condition: auth row exists but DB row not yet inserted → retry
    if (attempt < 5) {
      await new Promise((r) => setTimeout(r, 500));
      return loadSession(attempt + 1);
    }
    return null;
  }

  const { data: membership } = await supabase
    .from("league_members")
    .select("*, leagues(id, name)")
    .eq("user_id", user.id)
    .single();

  if (!membership || !membership.leagues) return null;

  return {
    userId: user.id,
    nickname: dbUser.nickname,
    leagueId: (membership.leagues as { id: string; name: string }).id,
    leagueName: (membership.leagues as { id: string; name: string }).name,
    role: membership.role,
  };
}

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const s = await loadSession();
    setSession(s);
  }, []);

  useEffect(() => {
    // Initial load
    loadSession().then((s) => {
      setSession(s);
      setLoading(false);
    });

    // Listen for auth changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        setSession(null);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const s = await loadSession();
        setSession(s);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={{ session, loading, refreshSession }}>
      {children}
    </SessionContext.Provider>
  );
};
