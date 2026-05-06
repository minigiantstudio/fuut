import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Session } from "@/lib/supabase/types";
import ConnectivityCheck from "@/components/ConnectivityCheck";

interface MemberWithNickname {
  id: string;
  league_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  nickname: string;
}

interface LeagueTabProps {
  isAdmin: boolean;
  session: Session;
}

const StatusBadge = ({ role, isCurrentUser }: { role: string; isCurrentUser: boolean }) => {
  if (role === "admin") {
    return <span className="text-[6px] px-2 py-0.5 bg-pixel-blue text-primary-foreground border-2 border-foreground">ADMIN</span>;
  }
  if (isCurrentUser) {
    return <span className="text-[6px] px-2 py-0.5 bg-pixel-green text-primary-foreground border-2 border-foreground">YOU</span>;
  }
  return <span className="text-[6px] px-2 py-0.5 bg-muted text-muted-foreground border-2 border-foreground">ACTIVE</span>;
};

const LeagueTab = ({ isAdmin, session }: LeagueTabProps) => {
  const queryClient = useQueryClient();
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [regenerateLoading, setRegenerateLoading] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  const { data: members = [], isLoading } = useQuery<MemberWithNickname[]>({
    queryKey: ["league-members", session.leagueId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_league_members_with_nicknames", {
        p_league_id: session.leagueId,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: league } = useQuery({
    queryKey: ["league", session.leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leagues")
        .select("invite_code, name")
        .eq("id", session.leagueId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const handleShare = async () => {
    const url = `${window.location.origin}/join/${league?.invite_code}`;
    if (navigator.share) {
      await navigator.share({ title: session.leagueName, text: `Join ${session.leagueName}!`, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  const handleRegenerate = async () => {
    setRegenerateLoading(true);
    setRegenerateError(null);
    const { error } = await supabase.rpc("regenerate_invite_code", {
      p_league_id: session.leagueId,
    });
    setRegenerateLoading(false);
    if (error) {
      setRegenerateError(error.message);
      return;
    }
    setShowRegenerateConfirm(false);
    queryClient.invalidateQueries({ queryKey: ["league", session.leagueId] });
  };

  return (
    <div className="py-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg text-foreground">👥 {session.leagueName}</h1>
          <p className="text-[7px] text-muted-foreground mt-1">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Invite code */}
      {league && (
        <div className="pixel-border bg-card p-4 space-y-3">
          <p className="text-[7px] text-muted-foreground uppercase">Invite code</p>
          <div className="pixel-inset bg-background py-3 px-4 text-center">
            <span className="text-[14px] tracking-[0.3em] text-foreground">{league.invite_code}</span>
          </div>
          <button onClick={handleShare} className="flex items-center gap-1.5 mx-auto text-xs text-lime-700">
            📤 Share invite link
          </button>
        </div>
      )}

      {/* Members list */}
      <div className="space-y-2">
        <h2 className="text-[8px] text-foreground">Members</h2>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="pixel-border bg-card divide-y-2 divide-foreground">
            {members.map((m) => {
              const initials = m.nickname.slice(0, 2).toUpperCase();
              const isMe = m.user_id === session.userId;
              return (
                <div key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="h-7 w-7 bg-foreground flex items-center justify-center shrink-0">
                    <span className="text-[6px] text-primary-foreground">{initials}</span>
                  </div>
                  <span className="text-xs text-foreground flex-1">{m.nickname}</span>
                  <StatusBadge role={m.role} isCurrentUser={isMe} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Admin section */}
      {isAdmin && (
        <div className="space-y-2">
          <h2 className="text-[8px] text-foreground">⚙ Manage</h2>
          <div className="pixel-border bg-card divide-y-2 divide-foreground">
            <button className="flex items-center gap-3 px-3 py-2.5 w-full text-left">
              <span className="text-foreground text-xs">✎ Rename league</span>
            </button>
            <button
              onClick={() => setShowRegenerateConfirm(true)}
              className="flex items-center gap-3 px-3 py-2.5 w-full text-left"
            >
              <span className="text-foreground text-xs">🔄 Regenerate invite code</span>
            </button>
          </div>

          {/* Confirmation dialog */}
          {showRegenerateConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="w-full max-w-[320px] mx-4 pixel-border bg-card p-5 space-y-4">
                <h3 className="text-[10px] text-foreground">Regenerate invite code?</h3>
                <p className="text-[7px] text-muted-foreground">
                  The current code <span className="text-foreground font-mono">{league?.invite_code}</span> will stop working immediately. Friends with the old link will need the new code.
                </p>
                {regenerateError && (
                  <p className="text-[6px] text-pixel-red">{regenerateError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerateLoading}
                    className="flex-1 h-10 pixel-border text-primary-foreground text-[7px] uppercase tracking-wider bg-pixel-red disabled:opacity-40"
                  >
                    {regenerateLoading ? "Regenerating..." : "Yes, regenerate"}
                  </button>
                  <button
                    onClick={() => { setShowRegenerateConfirm(false); setRegenerateError(null); }}
                    className="flex-1 h-10 pixel-border text-primary-foreground text-[7px] uppercase tracking-wider bg-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Backend connectivity */}
      <div className="space-y-2">
        <h2 className="text-[8px] text-foreground">🔌 Backend</h2>
        <ConnectivityCheck />
      </div>
    </div>
  );
};

export default LeagueTab;
