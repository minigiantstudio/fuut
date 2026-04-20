import { useState, useMemo } from "react";
import { Star } from "lucide-react";

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

interface BonusPredictionProps {
  matchId: number;
  disabled?: boolean;
}

const BonusPrediction = ({ matchId, disabled = false }: BonusPredictionProps) => {
  const [expanded, setExpanded] = useState(false);
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);

  const question = useMemo(
    () => BONUS_QUESTIONS[matchId % BONUS_QUESTIONS.length],
    [matchId]
  );

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) setExpanded((v) => !v);
  };

  const handleAnswer = (e: React.MouseEvent, val: "yes" | "no") => {
    e.stopPropagation();
    if (!disabled) setAnswer(val);
  };

  return (
    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-2 py-1.5 text-[6px] uppercase tracking-wider border-2 border-foreground transition-all pixel-press ${
          answer
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
              onClick={(e) => handleAnswer(e, "yes")}
              className={`flex-1 py-1.5 text-[7px] uppercase tracking-wider border-2 border-foreground pixel-press transition-all ${
                answer === "yes"
                  ? "bg-pixel-green text-primary-foreground"
                  : "bg-card text-foreground"
              }`}
            >
              Yes
            </button>
            <button
              onClick={(e) => handleAnswer(e, "no")}
              className={`flex-1 py-1.5 text-[7px] uppercase tracking-wider border-2 border-foreground pixel-press transition-all ${
                answer === "no"
                  ? "bg-pixel-red text-primary-foreground"
                  : "bg-card text-foreground"
              }`}
            >
              No
            </button>
          </div>
          {answer && (
            <p className="text-[6px] text-pixel-green text-center">✓ Bonus saved!</p>
          )}
        </div>
      )}
    </div>
  );
};

export default BonusPrediction;
