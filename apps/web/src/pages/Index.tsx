import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  // Detect password recovery links — Supabase lands on / with #access_token&type=recovery.
  // Redirect immediately to the reset-password page so the user sees the form.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        navigate("/reset-password", { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

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

  if (!session || !session.leagueId || localStorage.getItem("onboardingInProgress") === "true") {
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
