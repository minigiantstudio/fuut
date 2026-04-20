import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { TabId } from "@/components/BottomNav";
import PredictTab from "@/components/tabs/PredictTab";
import RankingTab from "@/components/tabs/RankingTab";
import ResultsTab from "@/components/tabs/ResultsTab";
import LeagueTab from "@/components/tabs/LeagueTab";
import Onboarding from "@/components/Onboarding";

const SESSION_KEY = "fuut2026_session";

interface Session {
  nickname: string;
  email?: string;
  joinedAt: string;
}

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabId>("predict");
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        setSession(JSON.parse(stored));
      }
    } catch {
      // Corrupted data — clear it
      localStorage.removeItem(SESSION_KEY);
    }
    setLoading(false);
  }, []);

  const handleOnboardingComplete = (nickname: string, email?: string) => {
    const newSession: Session = {
      nickname,
      email,
      joinedAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    setSession(newSession);
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const tabContent: Record<TabId, React.ReactNode> = {
    predict: <PredictTab isAdmin={isAdmin} />,
    ranking: <RankingTab />,
    results: <ResultsTab />,
    league: <LeagueTab isAdmin={isAdmin} onAdminChange={setIsAdmin} />,
  };

  return (
    <AppLayout activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout}>
      <div key={activeTab} className="pixel-screen-enter">
        {tabContent[activeTab]}
      </div>
    </AppLayout>
  );
};

export default Index;
