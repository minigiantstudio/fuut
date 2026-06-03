import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";

type OtpType = "magiclink" | "signup" | "recovery" | "email_change" | "invite" | "email";

const VALID_TYPES: ReadonlySet<OtpType> = new Set([
  "magiclink", "signup", "recovery", "email_change", "invite", "email",
]);

// After auth succeeds we do a hard redirect (not React Router navigate) so that
// SessionContext initialises fresh with the session already in localStorage.
// This avoids the race where navigate("/") renders Index before the context
// has loaded the user's league, briefly showing onboarding.
function hardRedirect(path: string) {
  // Completing an auth callback means onboarding is definitively over. Clear the
  // `onboardingInProgress` flag from BOTH stores: sessionStorage is the current
  // (tab-scoped) home, and localStorage is cleared defensively to purge any stale
  // value written by older builds. Otherwise Index could render Onboarding over
  // an already-authenticated session.
  try {
    localStorage.removeItem("onboardingInProgress");
    sessionStorage.removeItem("onboardingInProgress");
  } catch {
    /* ignore storage errors */
  }
  window.location.replace(path);
}

const AuthCallback = () => {
  const [params] = useSearchParams();
  const ranRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    // ── Path 1: PKCE flow — token_hash in query params ────────────────────────
    const tokenHash = params.get("token_hash");
    const rawType   = params.get("type");

    if (tokenHash && rawType && VALID_TYPES.has(rawType as OtpType)) {
      supabase.auth
        .verifyOtp({ token_hash: tokenHash, type: rawType as OtpType })
        .then(({ error: verifyError }) => {
          if (verifyError) { setError(verifyError.message); return; }
          hardRedirect(rawType === "recovery" ? "/reset-password" : "/");
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Verification failed."));
      return;
    }

    // ── Path 2: Implicit flow — detectSessionInUrl already consumed the hash ──
    // Listen for the INITIAL_SESSION / SIGNED_IN event fired by the client.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        subscription.unsubscribe();
        clearTimeout(timeout);
        hardRedirect("/reset-password");
        return;
      }
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        subscription.unsubscribe();
        clearTimeout(timeout);
        hardRedirect("/");
      }
    });

    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      setError("Invalid or expired link.");
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [params]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-3">
        {error ? (
          <>
            <p className="text-pixel-red text-sm">{error}</p>
            <a href="/" className="text-[8px] uppercase tracking-wider text-muted-foreground underline">
              ← Home
            </a>
          </>
        ) : (
          <>
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground text-sm">Signing you in…</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
