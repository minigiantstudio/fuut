import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Session } from "@/lib/supabase/types";
import ConnectivityCheck from "@/components/ConnectivityCheck";
import { useTranslation } from "@/lib/i18n";

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

const StatusBadge = ({ role, isCurrentUser, labels }: { role: string; isCurrentUser: boolean; labels: { admin: string; you: string; active: string } }) => {
  if (role === "admin") {
    return <span className="text-[6px] px-2 py-0.5 bg-pixel-blue text-primary-foreground border-2 border-foreground">{labels.admin}</span>;
  }
  if (isCurrentUser) {
    return <span className="text-[6px] px-2 py-0.5 bg-pixel-green text-primary-foreground border-2 border-foreground">{labels.you}</span>;
  }
  return <span className="text-[6px] px-2 py-0.5 bg-muted text-muted-foreground border-2 border-foreground">{labels.active}</span>;
};

const LeagueTab = ({ isAdmin, session }: LeagueTabProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [regenerateLoading, setRegenerateLoading] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  // Rename (D-19): pencil next to the league name opens an inline input.
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // Remove member (D-19/D-20): trash on a non-admin row opens a confirm dialog.
  const [removeTarget, setRemoveTarget] = useState<MemberWithNickname | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

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
        .select("invite_code, name, tier")
        .eq("id", session.leagueId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Global tunables (D-21/D-22): free-tier cap + premium-request contact email.
  // app_config has public SELECT; values are non-sensitive.
  const { data: appConfig } = useQuery<Record<string, unknown>>({
    queryKey: ["app-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_config").select("key, value");
      if (error) throw error;
      const map: Record<string, unknown> = {};
      for (const row of data ?? []) map[row.key] = row.value;
      return map;
    },
  });

  const leagueName = league?.name ?? session.leagueName;
  const freeMax = Number(appConfig?.["LEAGUE_FREE_MAX_MEMBERS"] ?? 10);
  const adminEmail = String(appConfig?.["ADMIN_CONTACT_EMAIL"] ?? "");
  // D-22: a free league at (or over) the cap shows the upgrade affordance.
  const isFull = league?.tier === "free" && members.length >= freeMax;

  const premiumMailto = (() => {
    const subject = `Premium upgrade — ${league?.invite_code ?? ""} (${leagueName})`;
    const body =
      `League: ${leagueName}\n` +
      `Invite code: ${league?.invite_code ?? ""}\n` +
      `Members: ${members.length}/${freeMax}\n\n` +
      `Please upgrade this league to premium for unlimited members.`;
    return `mailto:${adminEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  })();

  const handleShare = async () => {
    const url = `${window.location.origin}/join/${league?.invite_code}`;
    if (navigator.share) {
      await navigator.share({ title: leagueName, text: `Join ${leagueName}!`, url });
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

  const startRename = () => {
    setRenameValue(leagueName);
    setRenameError(null);
    setIsRenaming(true);
  };

  const handleRename = async () => {
    const next = renameValue.trim();
    if (!next || next === leagueName) {
      setIsRenaming(false);
      return;
    }
    setRenameLoading(true);
    setRenameError(null);
    const { error } = await supabase.rpc("rename_league", {
      p_league_id: session.leagueId,
      p_new_name: next,
    });
    setRenameLoading(false);
    if (error) {
      setRenameError(error.message);
      return;
    }
    setIsRenaming(false);
    queryClient.invalidateQueries({ queryKey: ["league", session.leagueId] });
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setRemoveLoading(true);
    setRemoveError(null);
    const { error } = await supabase.rpc("remove_member", {
      p_league_id: session.leagueId,
      p_user_id: removeTarget.user_id,
    });
    setRemoveLoading(false);
    if (error) {
      setRemoveError(error.message);
      return;
    }
    setRemoveTarget(null);
    queryClient.invalidateQueries({ queryKey: ["league-members", session.leagueId] });
  };

  return (
    <div className="py-5 space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={renameValue}
                  maxLength={50}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setIsRenaming(false); }}
                  placeholder={t("league.rename_placeholder")}
                  className="flex-1 min-w-0 pixel-inset bg-background px-2 py-1.5 text-sm text-foreground"
                />
                <button
                  onClick={handleRename}
                  disabled={renameLoading}
                  aria-label={t("league.rename_save")}
                  className="h-8 w-8 flex items-center justify-center pixel-border bg-pixel-green text-primary-foreground disabled:opacity-40"
                >
                  <Check size={12} />
                </button>
                <button
                  onClick={() => { setIsRenaming(false); setRenameError(null); }}
                  aria-label={t("league.cancel")}
                  className="h-8 w-8 flex items-center justify-center pixel-border bg-foreground text-primary-foreground"
                >
                  <X size={12} />
                </button>
              </div>
              {renameError && <p className="text-[6px] text-pixel-red">{renameError}</p>}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-lg text-foreground truncate">👥 {leagueName}</h1>
              {isAdmin && (
                <button onClick={startRename} aria-label={t("league.rename_placeholder")} className="shrink-0 text-muted-foreground hover:text-foreground">
                  <Pencil size={12} />
                </button>
              )}
            </div>
          )}
          <p className="text-[7px] text-muted-foreground mt-1">
            {members.length} {members.length !== 1 ? t("league.member_other") : t("league.member_one")}
            {league?.tier === "free" ? ` / ${freeMax}` : ""}
          </p>
        </div>
      </div>

      {/* Request premium (D-22) — only when a free league is at the cap */}
      {isFull && adminEmail && (
        <a
          href={premiumMailto}
          className="block w-full text-center pixel-border bg-pixel-gold text-foreground text-[8px] uppercase tracking-wider py-2.5"
        >
          ⭐ {t("league.request_premium")}
        </a>
      )}

      {/* Invite code */}
      {league && (
        <div className="pixel-border bg-card p-4 space-y-3">
          <p className="text-[7px] text-muted-foreground uppercase">{t("league.invite_code_label")}</p>
          <div className="pixel-inset bg-background py-3 px-4 text-center">
            <span className="text-[14px] tracking-[0.3em] text-foreground">{league.invite_code}</span>
          </div>
          <button onClick={handleShare} className="flex items-center gap-1.5 mx-auto text-xs text-lime-700">
            📤 {t("league.share")}
          </button>
        </div>
      )}

      {/* Members list */}
      <div className="space-y-2">
        <h2 className="text-[8px] text-foreground">{t("league.members_heading")}</h2>
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
                  <StatusBadge role={m.role} isCurrentUser={isMe} labels={{ admin: t("league.badge_admin"), you: t("league.badge_you"), active: t("league.badge_active") }} />
                  {/* Trash only for admins, only on non-admin rows (D-19) */}
                  {isAdmin && m.role !== "admin" && (
                    <button
                      onClick={() => { setRemoveTarget(m); setRemoveError(null); }}
                      aria-label={t("league.remove_title")}
                      className="shrink-0 text-pixel-red hover:opacity-70"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Admin section */}
      {isAdmin && (
        <div className="space-y-2">
          <h2 className="text-[8px] text-foreground">⚙ {t("league.manage_heading")}</h2>
          <div className="pixel-border bg-card divide-y-2 divide-foreground">
            <button
              onClick={() => setShowRegenerateConfirm(true)}
              className="flex items-center gap-3 px-3 py-2.5 w-full text-left"
            >
              <span className="text-foreground text-xs">🔄 {t("league.regenerate")}</span>
            </button>
          </div>

          {/* Regenerate confirmation dialog */}
          {showRegenerateConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="w-full max-w-[320px] mx-4 pixel-border bg-card p-5 space-y-4">
                <h3 className="text-[10px] text-foreground">{t("league.regen_confirm_title")}</h3>
                <p className="text-[7px] text-muted-foreground">
                  <span className="text-foreground font-mono">{league?.invite_code}</span> — {t("league.regen_confirm_body")}
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
                    {regenerateLoading ? t("league.regenerating") : t("league.confirm_regenerate")}
                  </button>
                  <button
                    onClick={() => { setShowRegenerateConfirm(false); setRegenerateError(null); }}
                    className="flex-1 h-10 pixel-border text-primary-foreground text-[7px] uppercase tracking-wider bg-foreground"
                  >
                    {t("league.cancel")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Remove member confirmation dialog */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-[320px] mx-4 pixel-border bg-card p-5 space-y-4">
            <h3 className="text-[10px] text-foreground">{t("league.remove_title")}</h3>
            <p className="text-[7px] text-muted-foreground">
              <span className="text-foreground">{removeTarget.nickname}</span> — {t("league.remove_body")}
            </p>
            {removeError && <p className="text-[6px] text-pixel-red">{removeError}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleRemove}
                disabled={removeLoading}
                className="flex-1 h-10 pixel-border text-primary-foreground text-[7px] uppercase tracking-wider bg-pixel-red disabled:opacity-40"
              >
                {t("league.confirm_remove")}
              </button>
              <button
                onClick={() => { setRemoveTarget(null); setRemoveError(null); }}
                className="flex-1 h-10 pixel-border text-primary-foreground text-[7px] uppercase tracking-wider bg-foreground"
              >
                {t("league.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backend connectivity — dev-only, hidden unless ?debug=1 in URL */}
      {new URLSearchParams(window.location.search).get("debug") === "1" && (
        <div className="space-y-2">
          <h2 className="text-[8px] text-foreground">🔌 Backend</h2>
          <ConnectivityCheck />
        </div>
      )}
    </div>
  );
};

export default LeagueTab;
