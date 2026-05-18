import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { TabId } from "@/components/BottomNav";
import PredictTab from "@/components/tabs/PredictTab";
import RankingTab from "@/components/tabs/RankingTab";
import ResultsTab from "@/components/tabs/ResultsTab";
import LeagueTab from "@/components/tabs/LeagueTab";
import Onboarding from "@/components/Onboarding";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/lib/supabase/client";

const Index = () => {
  const { session, loading } = useSession();
  const [activeTab, setActiveTab] = useState<TabId>("predict");

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (e) {
      console.warn("[logout] global signOut failed, falling back to local", e);
      await supabase.auth.signOut({ scope: "local" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Onboarding />;
  }

  const isAdmin = session.role === "admin";

  const tabContent: Record<TabId, React.ReactNode> = {
    predict: <PredictTab isAdmin={isAdmin} session={session} />,
    ranking: <RankingTab session={session} />,
    results: <ResultsTab session={session} />,
    league: <LeagueTab isAdmin={isAdmin} session={session} />,
  };

  return (
    <AppLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={handleLogout}
      leagueName={session.leagueName}
      nickname={session.nickname}
    >
      <div key={activeTab} className="pixel-screen-enter">
        {tabContent[activeTab]}
      </div>
    </AppLayout>
  );
};

export default Index;
