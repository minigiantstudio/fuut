import { useState, useEffect } from "react";

interface LockCountdownProps {
  kickoffAt: string;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

function getRemainingMs(kickoffAt: string): number {
  return new Date(kickoffAt).getTime() - Date.now();
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const LockCountdown = ({ kickoffAt }: LockCountdownProps) => {
  const [remainingMs, setRemainingMs] = useState(() => getRemainingMs(kickoffAt));

  useEffect(() => {
    const update = () => setRemainingMs(getRemainingMs(kickoffAt));
    // Tick every 30 seconds — no flickering, battery-friendly
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [kickoffAt]);

  // Only show when within the last 24 hours before kickoff and not yet past it
  if (remainingMs <= 0 || remainingMs > TWENTY_FOUR_HOURS_MS) return null;

  const pct = Math.min(100, (remainingMs / TWENTY_FOUR_HOURS_MS) * 100);
  const isCritical = remainingMs < ONE_HOUR_MS;

  return (
    <div className="mt-1 space-y-0.5">
      {/* Label */}
      <div className="flex items-center gap-1">
        <span
          className={`text-[5px] font-mono ${isCritical ? "text-pixel-red" : "text-pixel-gold"}`}
        >
          ⏱ Locks in {formatCountdown(remainingMs)}
        </span>
      </div>

      {/* Progress bar — shrinks toward 0% as kickoff approaches */}
      <div className="h-[2px] w-full bg-muted rounded-full overflow-hidden">
        <div
          role="progressbar"
          aria-label={`Locks in ${formatCountdown(remainingMs)}`}
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          className={`h-full rounded-full ${isCritical ? "bg-pixel-red" : "bg-pixel-gold"}`}
          style={{ width: `${pct}%`, transition: "width 30s linear" }}
        />
      </div>
    </div>
  );
};

export default LockCountdown;
