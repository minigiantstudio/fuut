import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";

type OtpType = "magiclink" | "signup" | "recovery" | "email_change" | "invite" | "email";

const VALID_TYPES: ReadonlySet<OtpType> = new Set([
  "magiclink", "signup", "recovery", "email_change", "invite", "email",
]);

// After auth succeeds we do a hard redirect (not React Router navigate) so that
// SessionContext initialises fresh with the session already in storage, avoiding
// the race where navigate("/") renders Index before the league has loaded.
function hardRedirect(path: string) {
  try {
    // Completing an auth callback means onboarding is definitively over.
    localStorage.removeItem("onboardingInProgress");
    sessionStorage.removeItem("onboardingInProgress");
  } catch {
    /* ignore storage errors */
  }
  window.location.replace(path);
}

type Phase = "loading" | "confirm" | "verifying";

const AuthCallback = () => {
  const [params] = useSearchParams();
  const ranRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");

  const tokenHash = params.get("token_hash");
  const rawType = params.get("type");
  const isPkce = !!(tokenHash && rawType && VALID_TYPES.has(rawType as OtpType));
  const isRecovery = rawType === "recovery";

  // Verify the one-time token. Triggered by an explicit user click (not on load)
  // so that email scanners / link prefetchers — which GET the link to inspect it —
  // don't silently consume the single-use token before the human arrives.
  const runVerify = useCallback(async () => {
    if (!tokenHash || !rawType) return;
    setPhase("verifying");
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: rawType as OtpType,
    });
    if (verifyError) {
      setError(verifyError.message);
      setPhase("confirm"); // let them retry / re-request
      return;
    }
    hardRedirect(isRecovery ? "/reset-password" : "/");
  }, [tokenHash, rawType, isRecovery]);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    // ── PKCE flow (?token_hash=…): gate behind a click to defeat prefetch ──
    if (isPkce) {
      setPhase("confirm");
      return;
    }

    // ── Implicit flow (#access_token=… in the hash) ──
    // The Supabase client has detectSessionInUrl:true, so by the time this effect
    // runs it has ALREADY consumed the hash and will emit an auth event. We can't
    // read window.location.hash here (it's gone) — we listen for the event instead.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        cleanup();
        hardRedirect("/reset-password");
        return;
      }
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        cleanup();
        hardRedirect("/");
      }
    });

    const timeout = setTimeout(() => {
      cleanup();
      setError("Invalid or expired link.");
    }, 8000);

    function cleanup() {
      subscription.unsubscribe();
      clearTimeout(timeout);
    }

    return cleanup;
  }, [isPkce]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center space-y-4 max-w-[320px]">
        {error ? (
          <>
            <p className="text-2xl">⚠️</p>
            <p className="text-pixel-red text-sm">{error}</p>
            <p className="text-[7px] text-muted-foreground">
              Links can only be used once and expire after a while. Request a new one from the login screen.
            </p>
            <a href="/" className="inline-block text-[8px] uppercase tracking-wider text-muted-foreground underline">
              ← Home
            </a>
          </>
        ) : phase === "confirm" ? (
          <>
            <p className="text-2xl">{isRecovery ? "🔑" : "⚽"}</p>
            <h1 className="text-[12px] text-foreground">
              {isRecovery ? "Reset your password" : "Confirm sign in"}
            </h1>
            <p className="text-[7px] text-muted-foreground">
              {isRecovery
                ? "Tap below to set a new password for your account."
                : "Tap below to finish signing in."}
            </p>
            <button
              onClick={runVerify}
              className="w-full h-12 pixel-border bg-foreground text-primary-foreground text-[8px] uppercase tracking-wider active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            >
              {isRecovery ? "Reset password" : "Continue"}
            </button>
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
