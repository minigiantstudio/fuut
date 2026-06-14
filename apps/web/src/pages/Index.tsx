import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

  // Prefetch background tabs as soon as session is ready so the user never
  // sees a spinner when switching to Ranking or Results.
  useEffect(() => {
    if (!session?.leagueId || !session?.userId) return;
    const { leagueId, userId } = session;

    queryClient.prefetchQuery({
      queryKey: ["leaderboard", leagueId],
      queryFn: async () => {
        const { data, error } = await supabase.rpc("get_leaderboard", { p_league_id: leagueId });
        if (error) throw error;
        return (data ?? []).sort((a: { rank: number }, b: { rank: number }) => a.rank - b.rank);
      },
      staleTime: 30_000,
    });

    queryClient.prefetchQuery({
      queryKey: ["matches-finished"],
      queryFn: async () => {
        const { data, error } = await supabase.rpc("get_matches_with_bonus");
        if (error) throw error;
        return (data ?? []).filter((m: { is_final: boolean }) => m.is_final)
          .sort((a: { kickoff_at: string }, b: { kickoff_at: string }) =>
            new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime());
      },
      staleTime: 30_000,
    });

    queryClient.prefetchQuery({
      queryKey: ["predictions-scored", userId, leagueId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("predictions")
          .select("id, match_id, home_score, away_score, points, points_match, points_bonus, bonus_answer")
          .eq("user_id", userId)
          .eq("league_id", leagueId);
        if (error) throw error;
        return data ?? [];
      },
      staleTime: 30_000,
    });
  }, [session?.leagueId, session?.userId, queryClient]);

  // One-time cleanup: older builds stored `onboardingInProgress` in localStorage,
  // where it could get stuck across tabs (e.g. a magic-link tab) and wrongly force
  // the Onboarding screen. It's now tab-scoped in sessionStorage, so purge any
  // stale localStorage copy on mount.
  useEffect(() => {
    localStorage.removeItem("onboardingInProgress");
  }, []);

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

  if (!session || !session.leagueId || sessionStorage.getItem("onboardingInProgress") === "true") {
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
