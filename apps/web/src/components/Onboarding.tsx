import { useState } from "react";
import { useNavigate } from "react-router-dom";
import trophyIcon from "@/assets/trophy.png";
import { supabase } from "@/lib/supabase/client";
import { useSession } from "@/contexts/SessionContext";

const avatarColors = [
  "bg-foreground", "bg-pixel-green", "bg-pixel-gold",
  "bg-pixel-red", "bg-pixel-blue", "bg-foreground",
  "bg-pixel-gold", "bg-pixel-green",
];
const placeholderInitials = ["CD", "AL", "MR", "JB", "SK", "LP", "TH", "NW"];

interface OnboardingProps {
  prefilledCode?: string;
}

const Onboarding = ({ prefilledCode }: OnboardingProps) => {
  const { refreshSession } = useSession();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | "recovery" | "create-name" | "create-nickname" | "create-email" | "create-confirm" | "auth-email" | "auth-password" | "auth-signup">(1);
  const [inviteCode, setInviteCode] = useState(prefilledCode ?? "");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);

  // Resolved from invite code lookup
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [leagueName, setLeagueName] = useState<string>("");

  // Create flow state
  const [newLeagueName, setNewLeagueName] = useState("");
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const checkEmail = async (nextStep: "create-nickname" | 2) => {
    if (!email.trim().includes("@")) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      // 1. Check if user already has an active session
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Already logged in, move to next step
        setStep(nextStep);
        return;
      }

      // 2. Check if email exists
      const { data, error } = await supabase.rpc("check_email_exists", { p_email: email.trim() });
      if (error) throw error;

      setIsRegistered(!!data);
      setStep(!!data ? "auth-password" : "auth-signup");
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Error checking email");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuth = async (isSignup: boolean, nextStep: "create-nickname" | 2) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { error } = isSignup 
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;
      setStep(nextStep);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const validateCode = async () => {
    setCodeLoading(true);
    setCodeError(null);
    const { data, error } = await supabase.rpc("lookup_league_by_invite_code", {
      p_code: inviteCode.trim().toUpperCase(),
    });
    setCodeLoading(false);
    // RPC returns an array (SETOF). Empty array means no match.
    const league = Array.isArray(data) ? data[0] : data;
    if (error || !league?.id) {
      setCodeError("Invalid code. Ask your admin.");
      return;
    }
    setLeagueId(league.id);
    setLeagueName(league.name);
    setStep("auth-email");
  };

  const handleComplete = async () => {
    if (!leagueId) return;
    setJoinLoading(true);
    setJoinError(null);
    try {
      // 1. Get current user (should be authenticated by now)
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error(authError?.message ?? "Not authenticated");
      const userId = user.id;

      // 2. Upsert user row (ensure nickname is set)
      const { error: userErr } = await supabase.from("users").upsert({
        id: userId,
        nickname: nickname.trim(),
        email: user.email ?? (email.trim() || null),
      });
      if (userErr) throw new Error(userErr.message);

      // 3. Insert league_members row
      const { error: memberErr } = await supabase.from("league_members").insert({
        user_id: userId,
        league_id: leagueId,
        role: "member",
      });
      if (memberErr) {
        if (memberErr.message.includes("Nickname already taken")) {
          throw new Error("Nickname taken in this league. Pick another.");
        }
        throw new Error(memberErr.message);
      }

      // 4. Refresh session context
      await refreshSession();
    } catch (e: unknown) {
      setJoinError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newLeagueName.trim() || !nickname.trim()) return;
    setCreateLoading(true);
    setCreateError(null);
    try {
      // 1. Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error(authError?.message ?? "Not authenticated");
      const userId = user.id;

      // 2. Upsert user row
      const { error: userErr } = await supabase.from("users").upsert({
        id: userId,
        nickname: nickname.trim(),
        email: user.email ?? (email.trim() || null),
      });
      if (userErr) throw new Error(userErr.message);

      // 3. Call create_league RPC — generates code, inserts league + admin membership atomically
      const { data, error: rpcErr } = await supabase.rpc("create_league", {
        p_name: newLeagueName.trim(),
      });
      if (rpcErr) throw new Error(rpcErr.message);
      
      const league = Array.isArray(data) ? data[0] : data;
      if (!league?.invite_code) throw new Error("Failed to create league");
      const { invite_code: inviteCode } = league;

      // 4. Store invite code for confirmation screen BEFORE refreshSession
      setCreatedInviteCode(inviteCode);
      setStep("create-confirm");

      // 5. Load session in background
      refreshSession();
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSendRecovery = async () => {
    await supabase.auth.signInWithOtp({ email: recoveryEmail });
    setRecoverySent(true);
  };

  // Step 1 — Enter invite code
  if (step === 1) {
    return (
      <div className="min-h-screen bg-background flex justify-center">
        <div className="w-full max-w-[430px] flex flex-col items-center justify-center px-6 py-12">
          <div className="flex-1 flex flex-col items-center justify-center w-full space-y-8">
            <div className="space-y-2 text-center">
              <img src={trophyIcon} alt="Fuut 2026 Trophy" className="w-16 h-auto mx-auto" style={{ imageRendering: "pixelated" }} />
              <h1 className="tracking-tight text-3xl text-pixel-green">Fuut 2026</h1>
              <p className="text-muted-foreground font-mono text-base">World Cup 2026 · Prediction league</p>
            </div>

            <div className="flex items-center -space-x-1">
              {placeholderInitials.map((init, i) => (
                <div
                  key={init}
                  className={`w-8 h-8 ${avatarColors[i]} flex items-center justify-center text-[6px] text-primary-foreground border-2 border-background`}
                >
                  {init}
                </div>
              ))}
            </div>

            <div className="w-full space-y-3">
              <div className="space-y-2">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value.toUpperCase());
                    setCodeError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && validateCode()}
                  placeholder="CODE"
                  className="w-full h-12 pixel-inset bg-card px-4 text-center text-[12px] tracking-[0.3em] text-foreground placeholder:text-muted-foreground placeholder:tracking-normal placeholder:text-[8px] focus:outline-none"
                  autoFocus
                />
                {codeError && (
                  <p className="text-[6px] text-pixel-red text-center">{codeError}</p>
                )}
              </div>

              <button
                onClick={validateCode}
                disabled={!inviteCode.trim() || codeLoading}
                className="w-full h-12 pixel-border text-primary-foreground text-[8px] uppercase tracking-wider disabled:cursor-not-allowed active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all bg-green-800 opacity-100"
              >
                {codeLoading ? "Checking..." : "Join league"}
              </button>

              <button
                onClick={() => setStep("create-name")}
                className="w-full h-12 pixel-border text-primary-foreground text-[8px] uppercase tracking-wider active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all bg-pixel-blue opacity-95"
              >
                Create a league
              </button>

              <button
                onClick={() => setStep("recovery")}
                className="w-full h-10 text-[7px] text-muted-foreground"
              >
                I played before
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Recovery
  if (step === "recovery") {
    return (
      <div className="min-h-screen bg-background flex justify-center">
        <div className="w-full max-w-[430px] flex flex-col px-6 py-12">
          <div className="flex-1 flex flex-col justify-center w-full space-y-8">
            <div className="space-y-2">
              <h1 className="text-[12px] text-foreground">Welcome back</h1>
              <p className="text-[7px] text-muted-foreground">Enter your email for a magic link.</p>
            </div>

            {!recoverySent ? (
              <div className="space-y-3">
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full h-12 pixel-inset bg-card px-4 text-[8px] text-foreground placeholder:text-muted-foreground focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSendRecovery}
                  disabled={!recoveryEmail.trim() || !recoveryEmail.includes("@")}
                  className="w-full h-12 pixel-border bg-foreground text-primary-foreground text-[8px] uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                >
                  Send magic link
                </button>
              </div>
            ) : (
              <div className="pixel-border bg-card p-5 space-y-3 text-center">
                <p className="text-[16px]">✉️</p>
                <p className="text-[8px] text-foreground">Check your inbox</p>
                <p className="text-[6px] text-muted-foreground">If linked, you'll get a magic link.</p>
              </div>
            )}

            <button
              onClick={() => { setRecoverySent(false); setRecoveryEmail(""); setStep(1); }}
              className="w-full h-10 text-[7px] text-muted-foreground"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Create path — Name league
  if (step === "create-name") {
    return (
      <div className="min-h-screen bg-background flex justify-center">
        <div className="w-full max-w-[430px] flex flex-col px-6 py-12">
          <div className="flex-1 flex flex-col justify-center w-full space-y-8">
            <div className="space-y-2">
              <h1 className="text-[12px] text-foreground">Name your league</h1>
              <p className="text-[7px] text-muted-foreground">This is what your friends will see.</p>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={newLeagueName}
                onChange={(e) => setNewLeagueName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && newLeagueName.trim() && setStep("create-email")}
                placeholder="League name..."
                className="w-full h-12 pixel-inset bg-card px-4 text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
                autoFocus
              />
            </div>
            <button
              onClick={() => setStep("create-email")}
              disabled={!newLeagueName.trim()}
              className="w-full h-12 pixel-border text-primary-foreground text-[8px] uppercase tracking-wider disabled:cursor-not-allowed active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all bg-pixel-blue opacity-95"
            >
              Next
            </button>
            <button onClick={() => { setNewLeagueName(""); setStep(1); }} className="w-full h-10 text-[7px] text-muted-foreground">
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Create path — Email (Required for creator)
  if (step === "create-email") {
    return (
      <div className="min-h-screen bg-background flex justify-center">
        <div className="w-full max-w-[430px] flex flex-col px-6 py-12">
          <div className="flex-1 flex flex-col justify-center w-full space-y-8">
            <div className="space-y-2">
              <h1 className="text-[12px] text-foreground">Your email</h1>
              <p className="text-[7px] text-muted-foreground">Identity verification required.</p>
            </div>
            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && checkEmail("create-nickname")}
                placeholder="name@example.com"
                className="w-full h-12 pixel-inset bg-card px-4 text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
                autoFocus
              />
            </div>
            <button
              onClick={() => checkEmail("create-nickname")}
              disabled={authLoading || !email.trim().includes("@")}
              className="w-full h-12 pixel-border text-primary-foreground text-[8px] uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all bg-pixel-blue"
            >
              {authLoading ? "Checking..." : "Next"}
            </button>
            {authError && <p className="text-[6px] text-pixel-red text-center">{authError}</p>}
            <button onClick={() => setStep("create-name")} className="w-full h-10 text-[7px] text-muted-foreground">
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Auth steps: Password (Login)
  if (step === "auth-password") {
    const isJoining = !!leagueId;
    const nextStep = isJoining ? 2 : "create-nickname";
    return (
      <div className="min-h-screen bg-background flex justify-center">
        <div className="w-full max-w-[430px] flex flex-col px-6 py-12">
          <div className="flex-1 flex flex-col justify-center w-full space-y-8">
            <div className="space-y-2">
              <h1 className="text-[12px] text-foreground">Welcome back</h1>
              <p className="text-[7px] text-muted-foreground">Enter your password for <span className="text-foreground">{email}</span></p>
            </div>
            <div className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAuth(false, nextStep)}
                placeholder="Password"
                className="w-full h-12 pixel-inset bg-card px-4 text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
                autoFocus
              />
            </div>
            <button
              onClick={() => handleAuth(false, nextStep)}
              disabled={authLoading || !password.trim()}
              className="w-full h-12 pixel-border text-primary-foreground text-[8px] uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all bg-pixel-green"
            >
              {authLoading ? "Verifying..." : "Login"}
            </button>
            {authError && <p className="text-[6px] text-pixel-red text-center">{authError}</p>}
            <button onClick={() => setStep(isJoining ? "auth-email" : "create-email")} className="w-full h-10 text-[7px] text-muted-foreground">
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Auth steps: Signup
  if (step === "auth-signup") {
    const isJoining = !!leagueId;
    const nextStep = isJoining ? 2 : "create-nickname";
    return (
      <div className="min-h-screen bg-background flex justify-center">
        <div className="w-full max-w-[430px] flex flex-col px-6 py-12">
          <div className="flex-1 flex flex-col justify-center w-full space-y-8">
            <div className="space-y-2">
              <h1 className="text-[12px] text-foreground">Create account</h1>
              <p className="text-[7px] text-muted-foreground">Set a password for <span className="text-foreground">{email}</span></p>
            </div>
            <div className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && password.trim().length >= 6 && handleAuth(true, nextStep)}
                placeholder="At least 6 characters"
                className="w-full h-12 pixel-inset bg-card px-4 text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
                autoFocus
              />
            </div>
            <button
              onClick={() => handleAuth(true, nextStep)}
              disabled={authLoading || password.trim().length < 6}
              className="w-full h-12 pixel-border text-primary-foreground text-[8px] uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all bg-pixel-green"
            >
              {authLoading ? "Creating..." : "Sign up"}
            </button>
            {authError && <p className="text-[6px] text-pixel-red text-center">{authError}</p>}
            <button onClick={() => setStep(isJoining ? "auth-email" : "create-email")} className="w-full h-10 text-[7px] text-muted-foreground">
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Create path — Nickname
  if (step === "create-nickname") {
    return (
      <div className="min-h-screen bg-background flex justify-center">
        <div className="w-full max-w-[430px] flex flex-col px-6 py-12">
          <div className="flex-1 flex flex-col justify-center w-full space-y-8">
            <div className="space-y-2">
              <h1 className="text-[12px] text-foreground">Your nickname</h1>
              <p className="text-[7px] text-muted-foreground">How others see you in <span className="text-foreground">{newLeagueName}</span></p>
            </div>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && nickname.trim() && handleCreate()}
              placeholder="Nickname..."
              className="w-full h-12 pixel-inset bg-card px-4 text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
              autoFocus
            />
            <button
              onClick={handleCreate}
              disabled={createLoading || !nickname.trim()}
              className="w-full h-12 pixel-border text-primary-foreground text-[8px] uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all bg-pixel-green"
            >
              {createLoading ? "Creating..." : "Create league"}
            </button>
            {createError && <p className="text-[6px] text-pixel-red text-center">{createError}</p>}
            <button onClick={() => setStep("auth-password")} className="w-full h-10 text-[7px] text-muted-foreground">
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Create path — Confirmation screen
  if (step === "create-confirm") {
    const handleConfirmShare = async () => {
      const url = `${window.location.origin}/join/${createdInviteCode}`;
      if (navigator.share) {
        await navigator.share({ title: newLeagueName, text: `Join ${newLeagueName}!`, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    };

    const handleStartPredicting = async () => {
      setConfirmLoading(true);
      await refreshSession();
      navigate("/");
    };

    return (
      <div className="min-h-screen bg-background flex justify-center">
        <div className="w-full max-w-[430px] flex flex-col px-6 py-12">
          <div className="flex-1 flex flex-col justify-center w-full space-y-8">
            <div className="space-y-2 text-center">
              <p className="text-2xl">🏆</p>
              <h1 className="text-foreground text-sm">League created!</h1>
              <p className="text-muted-foreground text-xs">{newLeagueName} is ready. Share this code.</p>
            </div>
            <div className="pixel-border bg-card p-4 space-y-3 text-center">
              <p className="text-[7px] text-muted-foreground uppercase">Invite code</p>
              <div className="pixel-inset bg-background py-3 px-4 text-center">
                <span className="text-[14px] tracking-[0.3em] text-foreground">{createdInviteCode}</span>
              </div>
              <button onClick={handleConfirmShare} className="flex items-center gap-1.5 mx-auto text-xs text-lime-700">
                📤 Share invite link
              </button>
            </div>
            <button
              onClick={handleStartPredicting}
              disabled={confirmLoading}
              className="w-full h-12 pixel-border text-primary-foreground text-[8px] uppercase tracking-wider active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all bg-pixel-green disabled:opacity-60"
            >
              {confirmLoading ? "Loading..." : "Start predicting"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Join path — Email
  if (step === "auth-email") {
    return (
      <div className="min-h-screen bg-background flex justify-center">
        <div className="w-full max-w-[430px] flex flex-col px-6 py-12">
          <div className="flex-1 flex flex-col justify-center w-full space-y-8">
            <div className="space-y-2">
              <h1 className="text-[12px] text-foreground">Your email</h1>
              <p className="text-[7px] text-muted-foreground">Identity verification required to join <span className="text-foreground">{leagueName}</span>.</p>
            </div>
            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && checkEmail(2)}
                placeholder="name@example.com"
                className="w-full h-12 pixel-inset bg-card px-4 text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
                autoFocus
              />
            </div>
            <button
              onClick={() => checkEmail(2)}
              disabled={authLoading || !email.trim().includes("@")}
              className="w-full h-12 pixel-border text-primary-foreground text-[8px] uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all bg-pixel-blue"
            >
              {authLoading ? "Checking..." : "Next"}
            </button>
            {authError && <p className="text-[6px] text-pixel-red text-center">{authError}</p>}
            <button onClick={() => setStep(1)} className="w-full h-10 text-[7px] text-muted-foreground">
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Join path — Step 2 (Nickname)
  if (step === 2) {
    return (
      <div className="min-h-screen bg-background flex justify-center">
        <div className="w-full max-w-[430px] flex flex-col px-6 py-12">
          <div className="flex-1 flex flex-col justify-center w-full space-y-8">
            <div className="space-y-2">
              <h1 className="text-[12px] text-foreground">Your nickname</h1>
              <p className="text-[7px] text-muted-foreground">
                How others see you in <span className="text-foreground">{leagueName}</span>
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && nickname.trim() && setStep(3)}
                placeholder="Nickname..."
                className="w-full h-12 pixel-inset bg-card px-4 text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
                autoFocus
              />
            </div>

            <button
              onClick={() => setStep(3)}
              disabled={!nickname.trim()}
              className="w-full h-12 pixel-border text-primary-foreground text-[8px] uppercase tracking-wider disabled:cursor-not-allowed active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all bg-pixel-blue opacity-95"
            >
              Next
            </button>

            <button onClick={() => setStep("auth-password")} className="w-full h-10 text-[7px] text-muted-foreground">
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3 — Almost there
  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[430px] flex flex-col px-6 py-12">
        <div className="flex-1 flex flex-col justify-center w-full space-y-8">
          <div className="space-y-2 text-center">
            <p className="text-2xl">⚽</p>
            <h1 className="text-foreground text-sm">Almost there!</h1>
            <p className="text-muted-foreground text-xs">
              Ready to join <span className="text-foreground">{leagueName}</span> as <span className="text-foreground">{nickname}</span>?
            </p>
          </div>

          <button
            onClick={handleComplete}
            disabled={joinLoading}
            className="w-full h-12 pixel-border text-primary-foreground text-[8px] uppercase tracking-wider active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all bg-pixel-green"
          >
            {joinLoading ? "Joining..." : "Start predicting"}
          </button>

          {joinError && <p className="text-[6px] text-pixel-red text-center">{joinError}</p>}
          <button onClick={() => setStep(2)} className="w-full h-10 text-[7px] text-muted-foreground">
            ← Change nickname
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
