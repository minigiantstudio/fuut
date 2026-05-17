import { useState, useMemo, useEffect } from "react";
import { Star } from "lucide-react";

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

interface BonusPredictionProps {
  matchId: string;
  /** From matches.bonus_question. Null → use the hardcoded fallback list. */
  bonusQuestion: string | null;
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
  initialAnswer,
  onSave,
  disabled = false,
}: BonusPredictionProps) => {
  const [expanded, setExpanded] = useState(false);
  // Optimistic local copy so the UI reflects clicks immediately even while the
  // upsert is in-flight. Synced from initialAnswer (parent prop) on each render
  // by using it as the seed and updating on click.
  const [optimisticAnswer, setOptimisticAnswer] = useState<boolean | null>(initialAnswer);

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
          Bonus +2pts
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
              Yes
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
              No
            </button>
          </div>
          {optimisticAnswer !== null && (
            <p className="text-[6px] text-pixel-green text-center">✓ Bonus saved!</p>
          )}
        </div>
      )}
    </div>
  );
};

export default BonusPrediction;
