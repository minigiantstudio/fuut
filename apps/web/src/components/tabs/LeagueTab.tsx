import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Session } from "@/lib/supabase/types";

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
          </div>
        </div>
      )}
    </div>
  );
};

export default LeagueTab;
