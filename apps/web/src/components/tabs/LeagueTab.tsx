import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2, Check, X, ShieldCheck, ShieldOff } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Session } from "@/lib/supabase/types";
import ConnectivityCheck from "@/components/ConnectivityCheck";
import { useSession } from "@/contexts/SessionContext";
import { useTranslation } from "@/lib/i18n";
import MobileSheet from "@/components/MobileSheet";

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

const StatusBadge = ({ role, isCurrentUser, labels }: {
  role: string;
  isCurrentUser: boolean;
  labels: { admin: string; you: string; active: string };
}) => {
  if (role === "admin") return <span className="text-[6px] px-2 py-0.5 bg-pixel-blue text-primary-foreground border-2 border-foreground">{labels.admin}</span>;
  if (isCurrentUser) return <span className="text-[6px] px-2 py-0.5 bg-pixel-green text-primary-foreground border-2 border-foreground">{labels.you}</span>;
  return <span className="text-[6px] px-2 py-0.5 bg-muted text-muted-foreground border-2 border-foreground">{labels.active}</span>;
};

type DialogType = "remove" | "promote" | "demote" | "delete" | null;

const LeagueTab = ({ isAdmin, session }: LeagueTabProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setActiveLeague, refreshSession } = useSession();

  // Scoring rules expand/collapse
  const [showScoringRules, setShowScoringRules] = useState(false);

  // Rename
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // Regenerate invite code
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [regenerateLoading, setRegenerateLoading] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  // Member action dialogs (remove / promote / demote)
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [dialogTarget, setDialogTarget] = useState<MemberWithNickname | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Create new league
  const [showCreateLeague, setShowCreateLeague] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateLeague = async () => {
    if (!newLeagueName.trim()) return;
    setCreateLoading(true);
    setCreateError(null);
    try {
      const { data, error } = await supabase.rpc("create_league", { p_name: newLeagueName.trim() });
      if (error) throw new Error(error.message);
      const league = Array.isArray(data) ? data[0] : data;
      if (!league?.id) throw new Error("Failed to create league");
      setNewLeagueName("");
      setShowCreateLeague(false);
      // Reload leagues so the new one is in context, then switch to it
      await refreshSession();
      setActiveLeague(league.id);
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setCreateLoading(false);
    }
  };

  // Delete league
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: members = [], isLoading } = useQuery<MemberWithNickname[]>({
    queryKey: ["league-members", session.leagueId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_league_members_with_nicknames", { p_league_id: session.leagueId });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: league } = useQuery({
    queryKey: ["league", session.leagueId],
    queryFn: async () => {
      const { data, error } = await supabase.from("leagues").select("invite_code, name, tier").eq("id", session.leagueId).single();
      if (error) throw error;
      return data;
    },
  });

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
  const isFull = league?.tier === "free" && members.length >= freeMax;
  const adminCount = members.filter((m) => m.role === "admin").length;

  const premiumMailto = (() => {
    const subject = `Premium upgrade — ${league?.invite_code ?? ""} (${leagueName})`;
    const body = `League: ${leagueName}\nInvite code: ${league?.invite_code ?? ""}\nMembers: ${members.length}/${freeMax}\n\nPlease upgrade this league to premium.`;
    return `mailto:${adminEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  })();

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleShare = async () => {
    const url = `${window.location.origin}/join/${league?.invite_code}`;
    if (navigator.share) await navigator.share({ title: leagueName, text: `Join ${leagueName}!`, url });
    else await navigator.clipboard.writeText(url);
  };

  const handleRegenerate = async () => {
    setRegenerateLoading(true); setRegenerateError(null);
    const { error } = await supabase.rpc("regenerate_invite_code", { p_league_id: session.leagueId });
    setRegenerateLoading(false);
    if (error) { setRegenerateError(error.message); return; }
    setShowRegenerateConfirm(false);
    queryClient.invalidateQueries({ queryKey: ["league", session.leagueId] });
  };

  const startRename = () => { setRenameValue(leagueName); setRenameError(null); setIsRenaming(true); };
  const handleRename = async () => {
    const next = renameValue.trim();
    if (!next || next === leagueName) { setIsRenaming(false); return; }
    setRenameLoading(true); setRenameError(null);
    const { error } = await supabase.rpc("rename_league", { p_league_id: session.leagueId, p_new_name: next });
    setRenameLoading(false);
    if (error) { setRenameError(error.message); return; }
    setIsRenaming(false);
    queryClient.invalidateQueries({ queryKey: ["league", session.leagueId] });
  };

  const openDialog = (type: DialogType, member: MemberWithNickname) => {
    setDialogType(type); setDialogTarget(member); setDialogError(null);
  };
  const closeDialog = () => { setDialogType(null); setDialogTarget(null); setDialogError(null); };

  const handleDialogConfirm = async () => {
    if (!dialogTarget || !dialogType) return;
    setDialogLoading(true); setDialogError(null);
    try {
      if (dialogType === "remove") {
        const { error } = await supabase.rpc("remove_member", { p_league_id: session.leagueId, p_user_id: dialogTarget.user_id });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["league-members", session.leagueId] });
      } else if (dialogType === "promote" || dialogType === "demote") {
        const newRole = dialogType === "promote" ? "admin" : "member";
        const { error } = await supabase.rpc("set_member_role", { p_league_id: session.leagueId, p_user_id: dialogTarget.user_id, p_new_role: newRole });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["league-members", session.leagueId] });
      }
      closeDialog();
    } catch (e: unknown) {
      setDialogError(e instanceof Error ? e.message : "Error");
    } finally {
      setDialogLoading(false);
    }
  };

  const handleDeleteLeague = async () => {
    setDeleteLoading(true); setDeleteError(null);
    const { error } = await supabase.rpc("delete_league", { p_league_id: session.leagueId });
    setDeleteLoading(false);
    if (error) { setDeleteError(error.message); return; }
    // League deleted — sign out and go to home (onboarding)
    await supabase.auth.signOut({ scope: "local" });
    navigate("/", { replace: true });
  };

  // ── Dialog config ─────────────────────────────────────────────────────────
  const dialogConfig = dialogTarget && dialogType ? {
    remove:  { title: t("league.remove_title"),  body: `${dialogTarget.nickname} — ${t("league.remove_body")}`,  cta: t("league.confirm_remove") },
    promote: { title: t("league.promote_title"), body: `${dialogTarget.nickname} ${t("league.promote_body")}`,   cta: t("league.confirm_promote") },
    demote:  { title: t("league.demote_title"),  body: `${dialogTarget.nickname} ${t("league.demote_body")}`,    cta: t("league.confirm_demote") },
    delete:  { title: "", body: "", cta: "" }, // unused path
  }[dialogType] : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="py-5 space-y-5">

      {/* League name + rename */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <input
                  autoFocus value={renameValue} maxLength={50}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setIsRenaming(false); }}
                  placeholder={t("league.rename_placeholder")}
                  className="flex-1 min-w-0 pixel-inset bg-background px-2 py-1.5 text-sm text-foreground"
                />
                <button onClick={handleRename} disabled={renameLoading} aria-label={t("league.rename_save")}
                  className="h-8 w-8 flex items-center justify-center pixel-border bg-pixel-green text-primary-foreground disabled:opacity-40">
                  <Check size={12} />
                </button>
                <button onClick={() => { setIsRenaming(false); setRenameError(null); }} aria-label={t("league.cancel")}
                  className="h-8 w-8 flex items-center justify-center pixel-border bg-foreground text-primary-foreground">
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
            {league?.tier === "premium" && <span className="ml-1 text-pixel-gold">★ Premium</span>}
          </p>
        </div>
      </div>

      {/* Premium upgrade CTA */}
      {isFull && adminEmail && (
        <a href={premiumMailto} className="block w-full text-center pixel-border bg-pixel-gold text-foreground text-[8px] uppercase tracking-wider py-2.5">
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

      {/* Scoring Rules */}
      <div className="space-y-2">
        <button
          onClick={() => setShowScoringRules(!showScoringRules)}
          className="w-full text-left pixel-border bg-card px-4 py-3 flex items-center justify-between hover:opacity-80 transition-opacity"
        >
          <span className="text-foreground text-xs font-bold">{t("league.scoring_rules_title")}</span>
          <span className="text-muted-foreground text-lg">{showScoringRules ? "−" : "+"}</span>
        </button>
        {showScoringRules && (
          <div className="pixel-border bg-card p-4 space-y-3 text-[7px]">
            <div className="space-y-2">
              <div className="space-y-1">
                <p className="text-foreground font-bold">{t("league.scoring_rules_match")}</p>
                <div className="ml-2 space-y-1.5">
                  <div className="text-muted-foreground">
                    <p className="font-mono text-[6px]">{t("league.scoring_rules_exact")}</p>
                    <p className="text-[6px] italic">{t("league.scoring_rules_exact_example")}</p>
                  </div>
                  <div className="text-muted-foreground">
                    <p className="font-mono text-[6px]">{t("league.scoring_rules_outcome")}</p>
                    <p className="text-[6px] italic">{t("league.scoring_rules_outcome_example")}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1 border-t-2 border-foreground pt-2">
                <p className="text-foreground font-bold">{t("league.scoring_rules_bonus")}</p>
                <div className="ml-2 space-y-1.5">
                  <div className="text-muted-foreground">
                    <p className="font-mono text-[6px]">{t("league.scoring_rules_bonus_correct")}</p>
                    <p className="text-[6px] italic">{t("league.scoring_rules_bonus_example")}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t-2 border-foreground pt-2 text-muted-foreground">
              <p className="text-[6px]">{t("league.scoring_rules_max")}</p>
            </div>
          </div>
        )}
      </div>

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
              const isMe = m.user_id === session.userId;
              const canPromote = isAdmin && !isMe && m.role === "member";
              const canDemote  = isAdmin && !isMe && m.role === "admin" && adminCount > 1;
              const canRemove  = isAdmin && !isMe && m.role !== "admin";
              return (
                <div key={m.id} className="flex items-center gap-2 px-3 py-2.5">
                  <div className="h-7 w-7 bg-foreground flex items-center justify-center shrink-0">
                    <span className="text-[6px] text-primary-foreground">{m.nickname.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <span className="text-xs text-foreground flex-1 truncate">{m.nickname}</span>
                  <StatusBadge role={m.role} isCurrentUser={isMe} labels={{ admin: t("league.badge_admin"), you: t("league.badge_you"), active: t("league.badge_active") }} />
                  {/* Promote to admin */}
                  {canPromote && (
                    <button onClick={() => openDialog("promote", m)} aria-label={t("league.promote_title")}
                      className="shrink-0 text-pixel-blue hover:opacity-70">
                      <ShieldCheck size={12} />
                    </button>
                  )}
                  {/* Demote from admin */}
                  {canDemote && (
                    <button onClick={() => openDialog("demote", m)} aria-label={t("league.demote_title")}
                      className="shrink-0 text-muted-foreground hover:opacity-70">
                      <ShieldOff size={12} />
                    </button>
                  )}
                  {/* Remove member */}
                  {canRemove && (
                    <button onClick={() => openDialog("remove", m)} aria-label={t("league.remove_title")}
                      className="shrink-0 text-pixel-red hover:opacity-70">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Admin manage section */}
      {isAdmin && (
        <div className="space-y-2">
          <h2 className="text-[8px] text-foreground">⚙ {t("league.manage_heading")}</h2>
          <div className="pixel-border bg-card divide-y-2 divide-foreground">
            <button onClick={() => setShowRegenerateConfirm(true)} className="flex items-center gap-3 px-3 py-2.5 w-full text-left">
              <span className="text-foreground text-xs">🔄 {t("league.regenerate")}</span>
            </button>
          </div>
        </div>
      )}

      {/* Create new league */}
      <div className="space-y-2">
        <button
          onClick={() => setShowCreateLeague(true)}
          className="w-full text-center pixel-border bg-card text-foreground text-[8px] uppercase tracking-wider py-3"
        >
          + Create new league
        </button>
      </div>

      <MobileSheet
        open={showCreateLeague}
        onClose={() => { setShowCreateLeague(false); setNewLeagueName(""); setCreateError(null); }}
        title={t("league.create_title")}
      >
        <div className="space-y-3">
          <input
            autoFocus
            value={newLeagueName}
            onChange={(e) => setNewLeagueName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && newLeagueName.trim()) handleCreateLeague(); }}
            maxLength={50}
            placeholder="League name"
            className="w-full pixel-inset bg-background px-3 py-3 text-sm text-foreground"
          />
          {createError && <p className="text-xs text-pixel-red">{createError}</p>}
          <button
            onClick={handleCreateLeague}
            disabled={createLoading || !newLeagueName.trim()}
            className="w-full h-12 pixel-border bg-pixel-green text-primary-foreground text-xs uppercase tracking-wider disabled:opacity-40"
          >
            {createLoading ? "Creating…" : "Create"}
          </button>
          <button
            onClick={() => { setShowCreateLeague(false); setNewLeagueName(""); setCreateError(null); }}
            className="w-full h-12 pixel-border bg-foreground text-primary-foreground text-xs uppercase tracking-wider"
          >
            {t("league.cancel")}
          </button>
        </div>
      </MobileSheet>

      {/* Danger zone — delete league */}
      {isAdmin && (
        <div className="space-y-2">
          <h2 className="text-[8px] text-pixel-red">⚠ {t("league.danger_heading")}</h2>
          <div className="border-2 border-pixel-red bg-card">
            <button
              onClick={() => { setDeleteError(null); setShowDeleteConfirm(true); }}
              className="flex items-center gap-3 px-3 py-2.5 w-full text-left"
            >
              <Trash2 size={12} className="text-pixel-red shrink-0" />
              <span className="text-pixel-red text-xs">{t("league.delete_league")}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Regenerate confirmation ── */}
      <MobileSheet
        open={showRegenerateConfirm}
        onClose={() => { setShowRegenerateConfirm(false); setRegenerateError(null); }}
        title={t("league.regen_confirm_title")}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground font-mono">{league?.invite_code}</span>
            {" — "}{t("league.regen_confirm_body")}
          </p>
          {regenerateError && <p className="text-xs text-pixel-red">{regenerateError}</p>}
          <button
            onClick={handleRegenerate}
            disabled={regenerateLoading}
            className="w-full h-12 pixel-border bg-pixel-red text-primary-foreground text-xs uppercase tracking-wider disabled:opacity-40"
          >
            {regenerateLoading ? t("league.regenerating") : t("league.confirm_regenerate")}
          </button>
          <button
            onClick={() => { setShowRegenerateConfirm(false); setRegenerateError(null); }}
            className="w-full h-12 pixel-border bg-foreground text-primary-foreground text-xs uppercase tracking-wider"
          >
            {t("league.cancel")}
          </button>
        </div>
      </MobileSheet>

      {/* ── Member action dialog (remove / promote / demote) ── */}
      <MobileSheet
        open={!!dialogConfig}
        onClose={() => { setDialogType(null); setDialogTarget(null); setDialogError(null); }}
        title={dialogConfig?.title ?? ""}
      >
        {dialogConfig && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{dialogConfig.body}</p>
            {dialogError && <p className="text-xs text-pixel-red">{dialogError}</p>}
            <button
              onClick={handleDialogConfirm}
              disabled={dialogLoading}
              className="w-full h-12 pixel-border bg-pixel-red text-primary-foreground text-xs uppercase tracking-wider disabled:opacity-40"
            >
              {dialogConfig.cta}
            </button>
            <button
              onClick={() => { setDialogType(null); setDialogTarget(null); setDialogError(null); }}
              className="w-full h-12 pixel-border bg-foreground text-primary-foreground text-xs uppercase tracking-wider"
            >
              {t("league.cancel")}
            </button>
          </div>
        )}
      </MobileSheet>

      {/* ── Delete league confirmation ── */}
      <MobileSheet
        open={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
        title={t("league.delete_league")}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground">{leagueName}</span>
            {" — "}{t("league.delete_body")}
          </p>
          {deleteError && <p className="text-xs text-pixel-red">{deleteError}</p>}
          <button
            onClick={handleDeleteLeague}
            disabled={deleteLoading}
            className="w-full h-12 pixel-border bg-pixel-red text-primary-foreground text-xs uppercase tracking-wider disabled:opacity-40"
          >
            {deleteLoading ? t("league.deleting") : t("league.confirm_delete")}
          </button>
          <button
            onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
            className="w-full h-12 pixel-border bg-foreground text-primary-foreground text-xs uppercase tracking-wider"
          >
            {t("league.cancel")}
          </button>
        </div>
      </MobileSheet>

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
