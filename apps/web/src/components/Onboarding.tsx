import { useState } from "react";
import trophyIcon from "@/assets/trophy.png";
import type { Profile } from "@fuut/types";

const members = [
  { initials: "CD", color: "bg-foreground" },
  { initials: "AL", color: "bg-pixel-green" },
  { initials: "MR", color: "bg-pixel-gold" },
  { initials: "JB", color: "bg-pixel-red" },
  { initials: "SK", color: "bg-pixel-blue" },
  { initials: "LP", color: "bg-foreground" },
  { initials: "TH", color: "bg-pixel-gold" },
  { initials: "NW", color: "bg-pixel-green" },
];

interface OnboardingProps {
  onComplete: (profile: Profile) => void;
}

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | "recovery">(1);
  const [inviteCode, setInviteCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);

  const validateCode = () => {
    if (inviteCode.trim().length >= 3) {
      setCodeError(false);
      setStep(2);
    } else {
      setCodeError(true);
    }
  };

  const handleComplete = () => {
    const profile: Profile = {
      id: crypto.randomUUID(),
      nickname,
      locale: "en",
    };
    onComplete(profile);
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
              {members.map((m) => (
                <div
                  key={m.initials}
                  className={`w-8 h-8 ${m.color} flex items-center justify-center text-[6px] text-primary-foreground border-2 border-background`}
                >
                  {m.initials}
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
                    setCodeError(false);
                  }}
                  placeholder="CODE"
                  className="w-full h-12 pixel-inset bg-card px-4 text-center text-[12px] tracking-[0.3em] text-foreground placeholder:text-muted-foreground placeholder:tracking-normal placeholder:text-[8px] focus:outline-none"
                  autoFocus
                />
                {codeError && (
                  <p className="text-[6px] text-pixel-red text-center">
                    Invalid code. Ask your admin.
                  </p>
                )}
              </div>

              <button
                onClick={validateCode}
                disabled={!inviteCode.trim()}
                className="w-full h-12 pixel-border text-primary-foreground text-[8px] uppercase tracking-wider disabled:cursor-not-allowed active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all bg-green-800 opacity-100"
              >
                Join league
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
              <p className="text-[7px] text-muted-foreground">
                Enter your email for a magic link.
              </p>
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
                  onClick={() => setRecoverySent(true)}
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
                <p className="text-[6px] text-muted-foreground">
                  If linked, you'll get a magic link.
                </p>
              </div>
            )}

            <div className="pixel-border-sm bg-muted p-4 space-y-2">
              <p className="text-[6px] text-muted-foreground uppercase tracking-wide">No email?</p>
              <p className="text-[6px] text-muted-foreground">
                Ask your admin to reassign your spot.
              </p>
            </div>

            <button
              onClick={() => {
                setRecoverySent(false);
                setRecoveryEmail("");
                setStep(1);
              }}
              className="w-full h-10 text-[7px] text-muted-foreground"
            >
              ← Back
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
              <p className="text-[7px] text-muted-foreground">How others see you</p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Nickname..."
                className="w-full h-12 pixel-inset bg-card px-4 text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
                autoFocus
              />
              <p className="text-[6px] text-muted-foreground">
                No password · remembered on this device
              </p>
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
              <p className="text-[7px] text-muted-foreground">
                Optional — recover your account later.
              </p>
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
              onClick={handleComplete}
              className="w-full h-12 pixel-border bg-foreground text-primary-foreground text-[8px] uppercase tracking-wider active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            >
              Save & continue
            </button>

            <button
              onClick={() => setStep(3)}
              className="w-full h-10 text-[7px] text-muted-foreground"
            >
              Skip for now
            </button>
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
              Welcome to <span className="text-foreground">Chez Dupont</span>, {nickname}
            </p>
          </div>

          <div className="pixel-border bg-card p-4 space-y-4">
            <p className="text-muted-foreground uppercase tracking-wide text-xs">First match</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-secondary flex items-center justify-center text-[10px]">🇺🇸</div>
                <span className="text-foreground text-xs">USA</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  defaultValue=""
                  placeholder="–"
                  className="w-8 h-8 pixel-inset bg-background text-center text-sm text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-[7px] text-muted-foreground">:</span>
                <input
                  type="number"
                  min={0}
                  defaultValue=""
                  placeholder="–"
                  className="w-8 h-8 pixel-inset bg-background text-center text-sm text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-foreground text-xs">MEX</span>
                <div className="w-8 h-8 bg-secondary flex items-center justify-center text-[10px]">🇲🇽</div>
              </div>
            </div>
            <p className="text-muted-foreground text-center text-xs font-mono font-bold">June 11, 2026 · 21:00</p>
          </div>

          <button
            onClick={handleComplete}
            className="w-full h-12 pixel-border text-primary-foreground text-[8px] uppercase tracking-wider active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all bg-pixel-green"
          >
            Start predicting
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
