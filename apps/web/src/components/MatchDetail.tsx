import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTranslation } from "@/lib/i18n";

interface MatchDetailProps {
  open: boolean;
  onClose: () => void;
  home: string;
  away: string;
  initialHome?: number;
  initialAway?: number;
  kickoffAt: string;
  onSave: (homeScore: number, awayScore: number) => void;
}

const ScoreSelector = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) => (
  <div className="flex flex-col items-center gap-2">
    <span className="text-muted-foreground text-base">{label}</span>
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

const MatchDetail = ({
  open,
  onClose,
  home,
  away,
  initialHome = 0,
  initialAway = 0,
  kickoffAt,
  onSave,
}: MatchDetailProps) => {
  const { t } = useTranslation();
  const [homeScore, setHomeScore] = useState(initialHome);
  const [awayScore, setAwayScore] = useState(initialAway);

  const date = new Date(kickoffAt);
  const formattedDate = `${date.toLocaleString("en-US", { month: "short" })} ${date.getDate()} · ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  
  const remainingMs = date.getTime() - Date.now();
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const days = Math.floor(hours / 24);

  const countdown = hours > 23
    ? `${days} ${t("lock.days")}`
    : `${hours}h ${minutes}m`;

  const handleSave = () => {
    onSave(homeScore, awayScore);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-none border-t-3 border-foreground px-6 pb-8 pt-6 max-w-[430px] mx-auto bg-background">
        <SheetHeader className="space-y-0 pb-1">
          <SheetTitle className="sr-only">{t("match_detail.title")}</SheetTitle>
        </SheetHeader>

        <div className=" text-center items-center justify-between text-center">
          <div className=" flex-col items-center px-3">
            <span className="text-[6px] text-muted-foreground">{formattedDate}</span>
          </div>
        </div>

        <p className="text-center text-[7px] text-muted-foreground mt-1 mb-6">
          ⏱ {t("lock.locks_in")} {countdown}
        </p>

        <div className="flex items-center justify-center gap-10 mb-8">
          <ScoreSelector label={home} value={homeScore} onChange={setHomeScore} />
          <span className="text-[10px] text-muted-foreground mt-4">–</span>
          <ScoreSelector label={away} value={awayScore} onChange={setAwayScore} />
        </div>

        <button
          className="w-full py-3 pixel-border text-primary-foreground text-[8px] uppercase tracking-wider active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all bg-lime-600"
          onClick={handleSave}
        >
          {t("match_detail.save")}
        </button>
      </SheetContent>
    </Sheet>
  );
};

export default MatchDetail;
