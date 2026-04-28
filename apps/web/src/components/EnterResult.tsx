import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface EnterResultProps {
  open: boolean;
  onClose: () => void;
  home: string;
  away: string;
  memberCount: number;
  onConfirm: (homeScore: number, awayScore: number) => void;
}

const ScoreInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) => (
  <div className="flex flex-col items-center gap-2">
    <span className="text-[7px] text-muted-foreground">{label}</span>
    <span className="text-[24px] text-foreground tabular-nums">{value}</span>
    <div className="flex gap-2">
      <button
        className="w-8 h-8 pixel-border-sm bg-card text-[10px] text-foreground active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
        onClick={() => onChange(Math.max(0, value - 1))}
      >
        −
      </button>
      <button
        className="w-8 h-8 pixel-border-sm bg-card text-[10px] text-foreground active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
        onClick={() => onChange(Math.min(99, value + 1))}
      >
        +
      </button>
    </div>
  </div>
);

const EnterResult = ({
  open,
  onClose,
  home,
  away,
  memberCount,
  onConfirm,
}: EnterResultProps) => {
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  const handleConfirm = () => {
    onConfirm(homeScore, awayScore);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-none border-t-3 border-foreground px-6 pb-8 pt-6 max-w-[430px] mx-auto bg-background">
        <SheetHeader className="space-y-0 pb-1">
          <SheetTitle className="sr-only">Enter result</SheetTitle>
        </SheetHeader>

        <div className="flex items-center justify-between text-center">
          <span className="text-[8px] text-foreground flex-1">{home}</span>
          <div className="flex flex-col items-center px-3">
            <span className="text-[6px] text-muted-foreground">Jun 12 · 18:00</span>
          </div>
          <span className="text-[8px] text-foreground flex-1 text-right">{away}</span>
        </div>

        <p className="text-center text-[7px] text-pixel-blue mt-1 mb-6">
          Enter final result
        </p>

        <div className="flex items-center justify-center gap-10 mb-8">
          <ScoreInput label={home} value={homeScore} onChange={setHomeScore} />
          <span className="text-[10px] text-muted-foreground mt-4">–</span>
          <ScoreInput label={away} value={awayScore} onChange={setAwayScore} />
        </div>

        <button
          className="w-full py-3 pixel-border bg-foreground text-primary-foreground text-[7px] uppercase tracking-wider active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          onClick={handleConfirm}
        >
          Confirm · score {memberCount} players
        </button>

        <button
          className="w-full py-2 mt-2 text-[7px] text-muted-foreground"
          onClick={onClose}
        >
          Cancel
        </button>

        <p className="text-center text-[6px] text-muted-foreground mt-4">
          Leaderboard updates instantly
        </p>
      </SheetContent>
    </Sheet>
  );
};

export default EnterResult;
