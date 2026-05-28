import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n";

interface EnterResultProps {
  open: boolean;
  onClose: () => void;
  matchId: string;
  leagueId: string;
  home: string;
  away: string;
  memberCount?: number;
  onConfirm?: (homeScore: number, awayScore: number) => void;
  onDone?: () => void;
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

const EnterResult = ({ open, onClose, matchId, leagueId, home, away, onDone }: EnterResultProps) => {
  const { t } = useTranslation();
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      // Update match with final score
      const { error: matchErr } = await supabase
        .from("matches")
        .update({ home_score: homeScore, away_score: awayScore, is_final: true })
        .eq("id", matchId);
      if (matchErr) throw matchErr;

      // Trigger scoring Edge Function
      await supabase.functions.invoke("score-match", {
        body: { matchId },
      });

      onDone?.();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save result");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-none border-t-3 border-foreground px-6 pb-8 pt-6 max-w-[430px] mx-auto bg-background">
        <SheetHeader className="space-y-0 pb-1">
          <SheetTitle className="sr-only">{t("enter_result.title")}</SheetTitle>
        </SheetHeader>

        <div className="flex items-center justify-between text-center">
          <span className="text-[8px] text-foreground flex-1">{home}</span>
          <div className="flex flex-col items-center px-3">
            <span className="text-[6px] text-muted-foreground">{t("enter_result.final_score")}</span>
          </div>
          <span className="text-[8px] text-foreground flex-1 text-right">{away}</span>
        </div>

        <p className="text-center text-[7px] text-pixel-blue mt-1 mb-6">{t("enter_result.enter_final")}</p>

        <div className="flex items-center justify-center gap-10 mb-8">
          <ScoreInput label={home} value={homeScore} onChange={setHomeScore} />
          <span className="text-[10px] text-muted-foreground mt-4">–</span>
          <ScoreInput label={away} value={awayScore} onChange={setAwayScore} />
        </div>

        {error && <p className="text-[6px] text-pixel-red text-center mb-3">{error}</p>}

        <button
          className="w-full py-3 pixel-border bg-foreground text-primary-foreground text-[7px] uppercase tracking-wider active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50"
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? t("enter_result.saving") : t("enter_result.save")}
        </button>

        <button className="w-full py-2 mt-2 text-[7px] text-muted-foreground" onClick={onClose}>
          {t("enter_result.cancel")}
        </button>

        <p className="text-center text-[6px] text-muted-foreground mt-4">
          {t("enter_result.leaderboard_note")}
        </p>
      </SheetContent>
    </Sheet>
  );
};

export default EnterResult;
