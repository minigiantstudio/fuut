import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import LeagueSwitcher from "./LeagueSwitcher";
import LanguageToggle from "./LanguageToggle";
import { useSession } from "@/contexts/SessionContext";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import type { DbMatchWithBonus } from "@/lib/supabase/types";

interface TopBarProps {
  onLogout?: () => void;
  leagueName?: string;
  nickname?: string;
}

const TopBar = ({ onLogout, leagueName = "Fuut 2026", nickname }: TopBarProps) => {
  const { leagues } = useSession();
  const { t } = useTranslation();
  const initials = nickname ? nickname.slice(0, 2).toUpperCase() : "??";
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const hasMultipleLeagues = leagues.length > 1;

  const { data: rawMatches = [] } = useQuery<DbMatchWithBonus[]>({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_matches_with_bonus");
      if (error) throw error;
      return (data ?? []) as DbMatchWithBonus[];
    },
  });

  const currentStage = useMemo(() => {
    if (rawMatches.length === 0) return t("app.group_stage");
    const now = new Date();
    const nextMatch = rawMatches.find((m) => !m.is_final && new Date(m.kickoff_at) > now);
    if (!nextMatch) return t("app.group_stage");

    const knockoutMap: Record<string, string> = {
      group: t("app.group_stage"),
      r16: "Round of 16",
      qf: "Quarter-finals",
      sf: "Semi-finals",
      final: "Final",
    };
    return knockoutMap[nextMatch.stage] || nextMatch.stage;
  }, [rawMatches, t]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-[var(--topbar-height)] border-b-3 border-foreground flex items-center justify-center bg-green-800">
        <div className="w-full max-w-[430px] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasMultipleLeagues ? (
              <button
                onClick={() => setSwitcherOpen(true)}
                className="flex items-center gap-2 text-[10px] font-bold text-accent"
              >
                <span className="inline-block text-[14px] leading-none -translate-y-[2px]">⚽</span>
                {leagueName}
                <ChevronDown className="w-4 h-4" strokeWidth={3} />
              </button>
            ) : (
              <span className="flex items-center gap-2 text-[10px] font-bold text-accent">
                <span className="inline-block text-[14px] leading-none -translate-y-[2px]">⚽</span>
                {leagueName}
              </span>
            )}
            <span className="text-foreground">·</span>
            <span className="text-[8px] text-primary-foreground">{currentStage}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            {onLogout && (
              <button
                onClick={onLogout}
                className="text-[8px] text-primary-foreground px-2 py-1 border-2 border-primary-foreground hover:bg-primary-foreground hover:text-foreground transition-colors pixel-press"
              >
                {t("topbar.logout")}
              </button>
            )}
            <div className="w-8 h-8 bg-foreground flex items-center justify-center">
              <span className="text-[8px] font-bold text-primary-foreground">{initials}</span>
            </div>
          </div>
        </div>
      </header>
      <LeagueSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </>
  );
};

export default TopBar;
