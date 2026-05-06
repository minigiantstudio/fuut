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
  const [step, setStep] = useState<1 | 2 | 3 | 4 | "recovery" | "create-name" | "create-nickname" | "create-email" | "create-confirm">(1);
  const [inviteCode, setInviteCode] = useState(prefilledCode ?? "");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
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
    setStep(2);
  };

  const handleComplete = async (withEmail: boolean) => {
    if (!leagueId) return;
    setJoinLoading(true);
    setJoinError(null);
    try {
      // 1. Sign in anonymously
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      if (authError || !authData.user) throw new Error(authError?.message ?? "Auth failed");
      const userId = authData.user.id;

      // 2. Insert user row
      const { error: userErr } = await supabase.from("users").insert({
        id: userId,
        nickname: nickname.trim(),
        email: withEmail && email.trim() ? email.trim() : null,
      });
      if (userErr) throw new Error(userErr.message);

      // 3. Insert league_members row
      const { error: memberErr } = await supabase.from("league_members").insert({
        user_id: userId,
        league_id: leagueId,
        role: "member",
      });
      if (memberErr) throw new Error(memberErr.message);

      // 4. Refresh session context
      await refreshSession();
    } catch (e: unknown) {
      setJoinError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newLeagueName.trim() || !nickname.trim() || !email.trim()) return;
    setCreateLoading(true);
    setCreateError(null);
    try {
      // 1. Sign in anonymously
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      if (authError || !authData.user) throw new Error(authError?.message ?? "Auth failed");
      const userId = authData.user.id;

      // 2. Insert user row (email is REQUIRED for creator — per D-02)
      const { error: userErr } = await supabase.from("users").insert({
        id: userId,
        nickname: nickname.trim(),
        email: email.trim(),
      });
      if (userErr) throw new Error(userErr.message);

      // 3. Call create_league RPC — generates code, inserts league + admin membership atomically
      // RPC reads auth.uid() internally; do not pass p_user_id (CR-02 fix)
      const { data, error: rpcErr } = await supabase.rpc("create_league", {
        p_name: newLeagueName.trim(),
      });
      if (rpcErr || !data?.[0]) throw new Error(rpcErr?.message ?? "Failed to create league");
      const { invite_code: inviteCode } = data[0];

      // 4. Store invite code for confirmation screen BEFORE refreshSession (avoids race — per Pitfall 3)
      setCreatedInviteCode(inviteCode);
      setStep("create-confirm");

      // 5. Load session in background (confirmation screen is already shown)
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
                onKeyDown={(e) => e.key === "Enter" && newLeagueName.trim() && setStep("create-nickname")}
                placeholder="League name..."
                className="w-full h-12 pixel-inset bg-card px-4 text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
                autoFocus
              />
            </div>
            <button
              onClick={() => setStep("create-nickname")}
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
              onKeyDown={(e) => e.key === "Enter" && nickname.trim() && setStep("create-email")}
              placeholder="Nickname..."
              className="w-full h-12 pixel-inset bg-card px-4 text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
              autoFocus
            />
            <button
              onClick={() => setStep("create-email")}
              disabled={!nickname.trim()}
              className="w-full h-12 pixel-border text-primary-foreground text-[8px] uppercase tracking-wider disabled:cursor-not-allowed active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all bg-pixel-blue opacity-95"
            >
              Next
            </button>
            <button onClick={() => setStep("create-name")} className="w-full h-10 text-[7px] text-muted-foreground">
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Create path — Email (required for creator)
  if (step === "create-email") {
    return (
      <div className="min-h-screen bg-background flex justify-center">
        <div className="w-full max-w-[430px] flex flex-col px-6 py-12">
          <div className="flex-1 flex flex-col justify-center w-full space-y-8">
            <div className="space-y-2">
              <h1 className="text-[12px] text-foreground">Your email</h1>
              <p className="text-[7px] text-muted-foreground">Required to recover your account as league admin.</p>
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && email.trim().includes("@") && handleCreate()}
              placeholder="name@example.com"
              className="w-full h-12 pixel-inset bg-card px-4 text-[8px] text-foreground placeholder:text-muted-foreground focus:outline-none"
              autoFocus
            />
            <button
              onClick={handleCreate}
              disabled={createLoading || !email.trim().includes("@")}
              className="w-full h-12 pixel-border text-primary-foreground text-[8px] uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all bg-pixel-green"
            >
              {createLoading ? "Creating..." : "Create league"}
            </button>
            {createError && <p className="text-[6px] text-pixel-red text-center">{createError}</p>}
            <button onClick={() => setStep("create-nickname")} className="w-full h-10 text-[7px] text-muted-foreground">
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
      // refreshSession() was already called in handleCreate (fire-and-forget).
      // Await it here to ensure session is loaded before navigating.
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
            {/* Invite code in the same style as LeagueTab */}
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

  // Step 2 — Nickname
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
              <p className="text-[6px] text-muted-foreground">No password · remembered on this device</p>
            </div>

            <button
              onClick={() => setStep(3)}
              disabled={!nickname.trim()}
              className="w-full h-12 pixel-border text-primary-foreground text-[8px] uppercase tracking-wider disabled:cursor-not-allowed active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all bg-pixel-blue opacity-95"
            >
              Let's go
            </button>

            <p className="text-center text-[6px] text-muted-foreground">
              <button onClick={() => setStep(4)} className="underline underline-offset-2">
                Add email for multi-device
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Step 4 — Email
  if (step === 4) {
    return (
      <div className="min-h-screen bg-background flex justify-center">
        <div className="w-full max-w-[430px] flex flex-col px-6 py-12">
          <div className="flex-1 flex flex-col justify-center w-full space-y-8">
            <div className="space-y-2">
              <h1 className="text-[12px] text-foreground">Add email</h1>
              <p className="text-[7px] text-muted-foreground">Optional — recover your account later.</p>
            </div>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full h-12 pixel-inset bg-card px-4 text-[8px] text-foreground placeholder:text-muted-foreground focus:outline-none"
              autoFocus
            />

            <button
              onClick={() => handleComplete(true)}
              disabled={joinLoading}
              className="w-full h-12 pixel-border bg-foreground text-primary-foreground text-[8px] uppercase tracking-wider active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            >
              {joinLoading ? "Joining..." : "Save & continue"}
            </button>

            <button onClick={() => handleComplete(false)} disabled={joinLoading} className="w-full h-10 text-[7px] text-muted-foreground">
              Skip for now
            </button>

            {joinError && <p className="text-[6px] text-pixel-red text-center">{joinError}</p>}
          </div>
        </div>
      </div>
    );
  }

  // Step 3 — You're in
  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[430px] flex flex-col px-6 py-12">
        <div className="flex-1 flex flex-col justify-center w-full space-y-8">
          <div className="space-y-2 text-center">
            <p className="text-2xl">⚽</p>
            <h1 className="text-foreground text-sm">You're in!</h1>
            <p className="text-muted-foreground text-xs">
              Welcome to <span className="text-foreground">{leagueName}</span>, {nickname}
            </p>
          </div>

          <button
            onClick={() => handleComplete(false)}
            disabled={joinLoading}
            className="w-full h-12 pixel-border text-primary-foreground text-[8px] uppercase tracking-wider active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all bg-pixel-green"
          >
            {joinLoading ? "Joining..." : "Start predicting"}
          </button>

          {joinError && <p className="text-[6px] text-pixel-red text-center">{joinError}</p>}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
