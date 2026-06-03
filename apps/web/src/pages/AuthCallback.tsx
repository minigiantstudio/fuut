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

// Parse params from the URL hash fragment (#access_token=...&type=...)
// Supabase implicit-flow emails land here instead of query params.
function getHashParams(): URLSearchParams {
  const hash = window.location.hash.slice(1); // strip leading #
  return new URLSearchParams(hash);
}

const AuthCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ranRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    // --- PKCE flow: token arrives as ?token_hash=...&type=... ---
    const tokenHash = params.get("token_hash");
    const rawType   = params.get("type");
    const next      = safeNextPath(params.get("next"));

    if (tokenHash && rawType && VALID_TYPES.has(rawType as OtpType)) {
      supabase.auth
        .verifyOtp({ token_hash: tokenHash, type: rawType as OtpType })
        .then(({ error: verifyError }) => {
          if (verifyError) { setError(verifyError.message); return; }
          // Recovery links should land on reset-password, not home
          if (rawType === "recovery") {
            navigate("/reset-password", { replace: true });
          } else {
            navigate(next, { replace: true });
          }
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Verification failed."));
      return;
    }

    // --- Implicit flow: token arrives in the URL hash #access_token=...&type=... ---
    const hashParams   = getHashParams();
    const accessToken  = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const hashType     = hashParams.get("type");

    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: sessionError }) => {
          if (sessionError) { setError(sessionError.message); return; }
          if (hashType === "recovery") {
            navigate("/reset-password", { replace: true });
          } else {
            navigate("/", { replace: true });
          }
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Verification failed."));
      return;
    }

    // Nothing matched
    setError("Invalid or expired link.");
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
