import { useState } from "react";
import LeagueSwitcher from "./LeagueSwitcher";
import { useSession } from "@/contexts/SessionContext";

interface TopBarProps {
  onLogout?: () => void;
  leagueName?: string;
  nickname?: string;
}

const TopBar = ({ onLogout, leagueName = "Fuut 2026", nickname }: TopBarProps) => {
  const { leagues } = useSession();
  const initials = nickname ? nickname.slice(0, 2).toUpperCase() : "??";
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const hasMultipleLeagues = leagues.length > 1;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-[var(--topbar-height)] border-b-3 border-foreground flex items-center justify-center bg-green-800">
        <div className="w-full max-w-[430px] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasMultipleLeagues ? (
              <button
                onClick={() => setSwitcherOpen(true)}
                className="flex items-center gap-1 text-[10px] font-bold text-accent"
              >
                ⚽ {leagueName} <span className="text-[7px]">▾</span>
              </button>
            ) : (
              <span className="text-[10px] font-bold text-accent">⚽ {leagueName}</span>
            )}
            <span className="text-foreground">·</span>
            <span className="text-[8px] text-primary-foreground">Group stage</span>
          </div>
          <div className="flex items-center gap-2">
            {onLogout && (
              <button
                onClick={onLogout}
                className="text-[8px] text-primary-foreground px-2 py-1 border-2 border-primary-foreground hover:bg-primary-foreground hover:text-foreground transition-colors pixel-press"
              >
                Logout
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
