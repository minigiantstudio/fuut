import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSession } from "@/contexts/SessionContext";
import Onboarding from "@/components/Onboarding";
import { supabase } from "@/lib/supabase/client";

const JoinPage = () => {
  const { code } = useParams<{ code: string }>();
  const { session, loading, refreshSession } = useSession();
  const navigate = useNavigate();
  const [leagueName, setLeagueName] = useState<string | null>(null);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  // For authenticated users: look up the league from the code
  useEffect(() => {
    if (!loading && session && code) {
      setLookupLoading(true);
      supabase.rpc("lookup_league_by_invite_code", { p_code: code.toUpperCase() }).then(({ data, error }) => {
        setLookupLoading(false);
        const league = Array.isArray(data) ? data[0] : data;
        if (error || !league?.id) {
          setCodeError("Invalid invite code.");
          return;
        }
        setLeagueId(league.id);
        setLeagueName(league.name);
      });
    }
  }, [loading, session, code]);

  if (loading || lookupLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Unauthenticated: existing onboarding flow, code pre-filled
  if (!session) {
    return <Onboarding prefilledCode={code} />;
  }

  // Authenticated + code error
  if (codeError) {
    return (
      <div className="min-h-screen bg-background flex justify-center">
        <div className="w-full max-w-[430px] flex flex-col items-center justify-center px-6 py-12 space-y-6">
          <p className="text-[8px] text-pixel-red text-center">{codeError}</p>
          <button
            onClick={() => navigate("/")}
            className="w-full h-12 pixel-border text-primary-foreground text-[8px] uppercase tracking-wider bg-foreground"
          >
            Back to app
          </button>
        </div>
      </div>
    );
  }

  // Authenticated + valid league: show "Add league?" confirmation
  const handleJoin = async () => {
    if (!leagueId) return;
    setJoinLoading(true);
    setJoinError(null);
    const { error } = await supabase.rpc("join_league_by_code", {
      p_code: code!.toUpperCase(),
    });
    if (error) {
      setJoinError(error.message);
      setJoinLoading(false);
      return;
    }
    await refreshSession();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[430px] flex flex-col items-center justify-center px-6 py-12 space-y-8">
        <div className="space-y-2 text-center">
          <p className="text-2xl">⚽</p>
          <h1 className="text-foreground text-sm">Add this league?</h1>
          <p className="text-muted-foreground text-xs">
            Join <span className="text-foreground">{leagueName ?? code}</span> as a member.
          </p>
        </div>
        <div className="w-full space-y-3">
          <button
            onClick={handleJoin}
            disabled={joinLoading || !leagueId}
            className="w-full h-12 pixel-border text-primary-foreground text-[8px] uppercase tracking-wider active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all bg-pixel-green disabled:opacity-40"
          >
            {joinLoading ? "Joining..." : "Join league"}
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full h-10 text-[7px] text-muted-foreground"
          >
            Cancel
          </button>
        </div>
        {joinError && <p className="text-[6px] text-pixel-red text-center">{joinError}</p>}
      </div>
    </div>
  );
};

export default JoinPage;
