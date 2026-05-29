import { useState, useMemo, useEffect } from "react";
import { Star } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

// Fallback list used when matches.bonus_question is null in the DB.
const BONUS_QUESTIONS = [
  "Will there be a pitch invader?",
  "Will the coach get a yellow card?",
  "Will a goal be overturned by VAR?",
  "Will there be a red card?",
  "Will there be a goal in stoppage time?",
  "Will a goalkeeper score?",
  "Will there be an own goal?",
  "Will the first goal be a header?",
  "Will there be a penalty?",
  "Will a substitute score?",
];

/**
 * Deterministic positive index from a matchId string.
 * Matches use UUIDs, so the original `parseInt(matchId)` produced NaN and the
 * fallback question was always `undefined`. Sum the char codes instead so any
 * stable id (UUID, numeric string, etc.) maps to a stable slot.
 */
const fallbackQuestionIndex = (matchId: string, modulus: number) => {
  if (modulus <= 0) return 0;
  let acc = 0;
  for (let i = 0; i < matchId.length; i++) {
    acc = (acc + matchId.charCodeAt(i)) % modulus;
  }
  return acc;
};

// "Xh Ym" / "Ym" — mirrors LockCountdown.formatCountdown so the reveal
// countdown reads identically to the existing lock vocabulary (D-08 / Phase 2 D-09).
const formatReveal = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

interface BonusPredictionProps {
  matchId: string;
  /** From the get_matches_with_bonus RPC. NULL while the bonus is unrevealed. */
  bonusQuestion: string | null;
  /** Server-computed: true once now() >= reveal_at. Gates the answerable UI. */
  isRevealed: boolean;
  /** Server-computed reveal_at timestamp (kickoff - lead time) for the countdown. */
  revealAt: string | null;
  /** Current persisted answer (or null if the user hasn't answered yet). */
  initialAnswer: boolean | null;
  /** Persist the answer. Parent is responsible for DB write + cache invalidation. */
  onSave: (answer: boolean) => void | Promise<void>;
  /** Disabled at kickoff (lock) and when there's no score prediction yet (FK constraint). */
  disabled?: boolean;
}

const BonusPrediction = ({
  matchId,
  bonusQuestion,
  isRevealed,
  revealAt,
  initialAnswer,
  onSave,
  disabled = false,
}: BonusPredictionProps) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  // Optimistic local copy so the UI reflects clicks immediately even while the
  // upsert is in-flight. Synced from initialAnswer (parent prop) on each render
  // by using it as the seed and updating on click.
  const [optimisticAnswer, setOptimisticAnswer] = useState<boolean | null>(initialAnswer);

  // Re-evaluate the reveal countdown on a 30s tick (matches LockCountdown's
  // cadence). The server flag is_revealed is authoritative; this only drives the
  // placeholder's "reveals in Xh Ym" label between data refetches.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (isRevealed) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [isRevealed]);

  // Re-seed the optimistic copy when the persisted value changes from elsewhere
  // (e.g. after queryClient invalidation following another tab's edit).
  useEffect(() => {
    setOptimisticAnswer(initialAnswer);
  }, [initialAnswer]);

  const question = useMemo(() => {
    if (bonusQuestion) return bonusQuestion;
    return BONUS_QUESTIONS[fallbackQuestionIndex(matchId, BONUS_QUESTIONS.length)];
  }, [bonusQuestion, matchId]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) setExpanded((v) => !v);
  };

  const handleAnswer = async (e: React.MouseEvent, val: boolean) => {
    e.stopPropagation();
    if (disabled) return;
    setOptimisticAnswer(val);
    try {
      await onSave(val);
    } catch (err) {
      // Roll back on failure so the UI matches reality.
      setOptimisticAnswer(initialAnswer);
      // Surface for debugging; parent owns user-facing error UI if it wants any.
      console.error("BonusPrediction onSave failed", err);
    }
  };

  // Pre-reveal (D-08): the server has redacted bonus_question, so render a
  // locked placeholder with a countdown instead of the answerable card. The
  // copy mirrors the Phase 2 D-09 lock vocabulary verbatim.
  if (!isRevealed) {
    const remainingMs = revealAt ? new Date(revealAt).getTime() - now : 0;
    return (
      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
        <div className="w-full flex items-center gap-1 px-2 py-1.5 text-[6px] uppercase tracking-[0.3em] border-2 border-foreground bg-muted text-muted-foreground">
          <span>🔒 {t("bonus.reveals_in")} {formatReveal(remainingMs)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-2 py-1.5 text-[6px] uppercase tracking-wider border-2 border-foreground transition-all pixel-press ${
          optimisticAnswer !== null
            ? "bg-pixel-green text-primary-foreground"
            : "bg-accent text-accent-foreground"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span className="flex items-center gap-1">
          <Star size={8} className="shrink-0" />
          {t("bonus.header")}
        </span>
        <span>{expanded ? "▴" : "▾"}</span>
      </button>

      {expanded && (
        <div className="mt-1 p-2 border-2 border-foreground bg-background space-y-2">
          <p className="text-[7px] text-foreground leading-relaxed">{question}</p>
          <div className="flex gap-2">
            <button
              onClick={(e) => handleAnswer(e, true)}
              disabled={disabled}
              className={`flex-1 py-1.5 text-[7px] uppercase tracking-wider border-2 border-foreground pixel-press transition-all ${
                optimisticAnswer === true
                  ? "bg-pixel-green text-primary-foreground"
                  : "bg-card text-foreground"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {t("bonus.yes")}
            </button>
            <button
              onClick={(e) => handleAnswer(e, false)}
              disabled={disabled}
              className={`flex-1 py-1.5 text-[7px] uppercase tracking-wider border-2 border-foreground pixel-press transition-all ${
                optimisticAnswer === false
                  ? "bg-pixel-red text-primary-foreground"
                  : "bg-card text-foreground"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {t("bonus.no")}
            </button>
          </div>
          {optimisticAnswer !== null && (
            <p className="text-[6px] text-pixel-green text-center">{t("bonus.saved")}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default BonusPrediction;
