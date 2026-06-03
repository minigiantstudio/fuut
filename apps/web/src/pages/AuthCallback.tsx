import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";

type OtpType = "magiclink" | "signup" | "recovery" | "email_change" | "invite" | "email";

const VALID_TYPES: ReadonlySet<OtpType> = new Set([
  "magiclink", "signup", "recovery", "email_change", "invite", "email",
]);

function safeNextPath(raw: string | null): string {
  if (!raw) return "/";
  if (raw.startsWith("/")) return raw;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return "/";
    return url.pathname + url.search + url.hash;
  } catch { return "/"; }
}

const AuthCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ranRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const next = safeNextPath(params.get("next"));

    // ── Path 1: PKCE flow — token_hash arrives as a query param ──────────────
    // This is the newer flow. Manually verify the OTP token.
    const tokenHash = params.get("token_hash");
    const rawType   = params.get("type");

    if (tokenHash && rawType && VALID_TYPES.has(rawType as OtpType)) {
      supabase.auth
        .verifyOtp({ token_hash: tokenHash, type: rawType as OtpType })
        .then(({ error: verifyError }) => {
          if (verifyError) { setError(verifyError.message); return; }
          navigate(rawType === "recovery" ? "/reset-password" : next, { replace: true });
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Verification failed."));
      return;
    }

    // ── Path 2: Implicit flow — Supabase client auto-consumed the hash ────────
    // detectSessionInUrl:true already called setSession() from the #access_token
    // hash before this component mounted. Listen for the resulting auth event,
    // or check if a session is already active right now.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        subscription.unsubscribe();
        clearTimeout(timeout);
        navigate("/reset-password", { replace: true });
        return;
      }
      // Supabase v2 fires INITIAL_SESSION (not SIGNED_IN) when it restores
      // a session from detectSessionInUrl processing the hash on init.
      // Also handle SIGNED_IN for cases where verifyOtp triggers it.
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        subscription.unsubscribe();
        clearTimeout(timeout);
        navigate(next, { replace: true });
      }
    });

    // Timeout — if nothing fires after 8 seconds, show error
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      setError("Invalid or expired link.");
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [params, navigate]);

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
