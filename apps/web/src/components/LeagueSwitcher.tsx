import { useSession } from "@/contexts/SessionContext";

interface LeagueSwitcherProps {
  open: boolean;
  onClose: () => void;
}

const LeagueSwitcher = ({ open, onClose }: LeagueSwitcherProps) => {
  const { session, leagues, setActiveLeague } = useSession();

  if (!open) return null;

  const handleSelect = (leagueId: string) => {
    setActiveLeague(leagueId);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      {/* Dropdown panel anchored below TopBar */}
      <div className="fixed top-[var(--topbar-height)] left-1/2 -translate-x-1/2 z-50 w-full max-w-[430px] px-4">
        <div className="pixel-border bg-card divide-y-2 divide-foreground">
          {leagues.map((league) => {
            const isActive = league.leagueId === session?.leagueId;
            return (
              <button
                key={league.leagueId}
                onClick={() => handleSelect(league.leagueId)}
                className="flex items-center justify-between px-4 py-3 w-full text-left hover:bg-muted transition-colors"
              >
                <span className={`text-xs ${isActive ? "text-pixel-green font-bold" : "text-foreground"}`}>
                  {league.leagueName}
                </span>
                <span className="text-[6px] text-muted-foreground uppercase">
                  {league.role === "admin" ? "ADMIN" : "MEMBER"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default LeagueSwitcher;
