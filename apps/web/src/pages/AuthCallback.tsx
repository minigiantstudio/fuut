import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";

type OtpType = "magiclink" | "signup" | "recovery" | "email_change" | "invite" | "email";

const VALID_TYPES: ReadonlySet<OtpType> = new Set([
  "magiclink",
  "signup",
  "recovery",
  "email_change",
  "invite",
  "email",
]);

// GoTrue's `{{ .RedirectTo }}` may render as an absolute URL (the configured site_url)
// when no emailRedirectTo is passed. react-router's navigate() expects a path, so
// strip same-origin absolute URLs to their pathname and refuse cross-origin ones.
function safeNextPath(raw: string | null): string {
  if (!raw) return "/";
  if (raw.startsWith("/")) return raw;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}

const AuthCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ranRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // StrictMode runs effects twice in dev; verifyOtp is single-use, so guard it.
    if (ranRef.current) return;
    ranRef.current = true;

    const tokenHash = params.get("token_hash");
    const rawType = params.get("type");
    const next = safeNextPath(params.get("next"));

    if (!tokenHash || !rawType || !VALID_TYPES.has(rawType as OtpType)) {
      setError("Invalid or expired link.");
      return;
    }

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: rawType as OtpType })
      .then(({ error: verifyError }) => {
        if (verifyError) {
          setError(verifyError.message);
          return;
        }
        navigate(next, { replace: true });
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Verification failed.");
      });
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
          <p className="text-muted-foreground text-sm">Signing you in…</p>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
