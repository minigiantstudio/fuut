const tabs = [
  { id: "predict", label: "Predict", icon: "⚽" },
  { id: "ranking", label: "Rank", icon: "🏆" },
  { id: "results", label: "Results", icon: "📋" },
  { id: "league", label: "League", icon: "👥" },
] as const;

export type TabId = (typeof tabs)[number]["id"];

interface BottomNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const BottomNav = ({ active, onChange }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-[var(--nav-height)] bg-card border-t-3 border-foreground flex items-center justify-center">
      <div className="w-full max-w-[430px] flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex flex-col items-center gap-1 py-2 px-3 transition-colors ${
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className={`text-xs font-mono font-bold uppercase tracking-wider ${isActive ? "text-foreground" : ""}`}>
                {tab.label}
              </span>
              {isActive && <div className="w-full h-[2px] bg-foreground mt-0.5" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
