import { useTranslation, type TranslationKey } from "@/lib/i18n";

const TAB_IDS = ["predict", "ranking", "results", "league"] as const;

export type TabId = (typeof TAB_IDS)[number];

const TAB_META: Record<TabId, { icon: string; labelKey: TranslationKey }> = {
  predict:  { icon: "⚽", labelKey: "nav.predict" },
  ranking:  { icon: "🏆", labelKey: "nav.rank" },
  results:  { icon: "📋", labelKey: "nav.results" },
  league:   { icon: "👥", labelKey: "nav.league" },
};

interface BottomNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const BottomNav = ({ active, onChange }: BottomNavProps) => {
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-[var(--nav-height)] bg-card border-t-3 border-foreground flex items-center justify-center">
      <div className="w-full max-w-[430px] flex items-center justify-around">
        {TAB_IDS.map((id) => {
          const isActive = active === id;
          const { icon, labelKey } = TAB_META[id];
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex flex-col items-center gap-1 py-2 px-3 transition-colors ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <span className="text-lg">{icon}</span>
              <span className={`text-xs font-mono font-bold uppercase tracking-wider ${isActive ? "text-foreground" : ""}`}>
                {t(labelKey)}
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
