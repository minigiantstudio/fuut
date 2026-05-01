import { ReactNode } from "react";
import TopBar from "./TopBar";
import BottomNav, { TabId } from "./BottomNav";

interface AppLayoutProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onLogout?: () => void;
  leagueName?: string;
  nickname?: string;
  children: ReactNode;
}

const AppLayout = ({ activeTab, onTabChange, onLogout, leagueName, nickname, children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[430px] relative">
        <TopBar onLogout={onLogout} leagueName={leagueName} nickname={nickname} />
        <main className="pt-[var(--topbar-height)] pb-[var(--nav-height)] px-4">
          {children}
        </main>
        <BottomNav active={activeTab} onChange={onTabChange} />
      </div>
    </div>
  );
};

export default AppLayout;
