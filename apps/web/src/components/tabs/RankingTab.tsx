import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toPng } from "html-to-image";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/lib/supabase/client";
import type { LeaderboardEntry, Session } from "@/lib/supabase/types";
import { useTranslation } from "@/lib/i18n";
import SnapshotCard, { type SnapshotPayload } from "@/components/SnapshotCard";

interface RankingTabProps {
  session: Session;
}

const MovementIndicator = ({ movement }: { movement: number }) => {
  if (movement > 0) return <span className="text-[8px] text-pixel-green">▲{movement}</span>;
  if (movement < 0) return <span className="text-[8px] text-pixel-red">▼{Math.abs(movement)}</span>;
  return <span className="text-[8px] text-muted-foreground">–</span>;
};

const RankingTab = ({ session }: RankingTabProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const snapshotRef = useRef<HTMLDivElement | null>(null);
  const [sharing, setSharing] = useState(false);
  // Fallback share dialog (desktop / no Web Share API)
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: leaderboard = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", session.leagueId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_leaderboard", {
        p_league_id: session.leagueId,
      });
      if (error) throw error;
      return (data ?? []).sort((a, b) => a.rank - b.rank);
    },
  });

  // Realtime leaderboard (D-06): subscribe to INSERT/UPDATE events on
  // leaderboard_snapshots filtered to this league, and invalidate the
  // get_leaderboard query when anything changes. The channel name is
  // namespaced per league to avoid cross-league bleed when multiple
  // RankingTabs would otherwise share a channel.
  useEffect(() => {
    // Scoring feedback (D-15/D-16, SOCIAL-04): when a match is scored the
    // scoring engine inserts a fresh snapshot row per league member. For the
    // current user's row, surface a Sonner toast with the points earned this
    // round and the new rank. pts_earned is derived by diffing the new total
    // against the cached leaderboard (the realtime payload carries totals, not
    // per-match deltas). The diff baseline updates after the invalidate refetch.
    const maybeToastScored = (payload: { new?: Record<string, unknown> }) => {
      const row = payload.new;
      if (!row || row.user_id !== session.userId) return;

      const cached = queryClient.getQueryData<LeaderboardEntry[]>([
        "leaderboard",
        session.leagueId,
      ]);
      // No baseline yet (toast would be meaningless) — skip, just let the
      // invalidate below refresh the table.
      if (!cached) return;

      const prev = cached.find((e) => e.user_id === session.userId);
      if (!prev) return;

      const newTotal = Number(row.total_points ?? 0);
      const ptsEarned = newTotal - prev.total_points;
      // Nothing changed for this user (e.g. they had no prediction and rank held)
      // — don't fire a noisy zero toast.
      if (ptsEarned <= 0 && Number(row.rank_delta ?? 0) === 0) return;

      const rank = Number(row.rank ?? prev.rank);
      const rankDelta = Number(row.rank_delta ?? 0);
      const movement =
        rankDelta > 0 ? ` ↑${rankDelta}` : rankDelta < 0 ? ` ↓${Math.abs(rankDelta)}` : "";

      toast.success(
        `Match scored — you earned ${ptsEarned} pt${ptsEarned === 1 ? "" : "s"} (#${rank}${movement})`
      );
    };

    const channel = supabase.channel(`leaderboard-${session.leagueId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leaderboard_snapshots",
          filter: `league_id=eq.${session.leagueId}`,
        },
        (payload) => {
          maybeToastScored(payload);
          queryClient.invalidateQueries({ queryKey: ["leaderboard", session.leagueId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leaderboard_snapshots",
          filter: `league_id=eq.${session.leagueId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["leaderboard", session.leagueId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.leagueId, session.userId, queryClient]);

  // Shareable snapshot payload (D-11/D-12 SOCIAL-03). Top-3 podium + the
  // current user (if they're not already on the podium). Intentionally
  // public-safe — no emails or per-user identifiers beyond nickname (T-04-07).
  // inviteCode is omitted from the frozen payload so the public teaser fetches
  // the LIVE invite_code from the league, which still works after a regenerate.
  const snapshotPayload = useMemo<SnapshotPayload>(() => {
    const me = leaderboard.find((m) => m.user_id === session.userId);
    return {
      leagueName: session.leagueName,
      createdAt: new Date().toISOString(),
      podium: leaderboard.slice(0, 3).map((m) => ({
        rank: m.rank,
        nickname: m.nickname,
        total_points: m.total_points,
      })),
      you: me ? { rank: me.rank, nickname: me.nickname, total_points: me.total_points } : null,
    };
  }, [leaderboard, session.userId, session.leagueName]);

  const handleShare = async () => {
    if (!snapshotRef.current || sharing) return;
    setSharing(true);
    try {
      // 1. Capture the hidden snapshot div as a PNG (pixelRatio=2 for crispness).
      const pngDataUrl = await toPng(snapshotRef.current, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });

      // 2. Short token (12 hex chars ≈ 4.7e14 keyspace — fine for this scale).
      const token = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)
        .replace(/-/g, "")
        .slice(0, 12);

      // 3. Persist the FROZEN payload. RLS requires created_by = auth.uid().
      const { error } = await supabase.from("snapshot_tokens").insert({
        token,
        league_id: session.leagueId,
        snapshot_payload: snapshotPayload,
        created_by: session.userId,
      });
      if (error) throw error;

      const url = `${window.location.origin}/s/${token}`;
      const text = `${session.leagueName} — Fuut 2026`;

      // 4. Web Share API path (D-13). Prefer sharing the file when supported.
      const nav = navigator as Navigator & {
        canShare?: (data: { files?: File[] }) => boolean;
      };
      if (typeof navigator.share === "function") {
        try {
          const blob = await (await fetch(pngDataUrl)).blob();
          const file = new File([blob], "fuut-snapshot.png", { type: "image/png" });
          if (nav.canShare?.({ files: [file] })) {
            await navigator.share({ title: text, text, url, files: [file] });
            return;
          }
          await navigator.share({ title: text, text, url });
          return;
        } catch (err) {
          // user cancelled — fall through to fallback dialog
          if ((err as { name?: string })?.name !== "AbortError") {
            console.warn("navigator.share failed; showing fallback", err);
          } else {
            return;
          }
        }
      }

      // 5. Fallback: show the explicit-buttons dialog (WhatsApp/Telegram/Copy).
      setShareUrl(url);
      setCopied(false);
    } catch (err) {
      console.error("Snapshot share failed", err);
      toast.error("Could not generate snapshot");
    } finally {
      setSharing(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="py-5 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-foreground text-lg">{t("ranking.title")}</h1>
        <span className="text-[7px] text-muted-foreground">{session.leagueName}</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="pixel-border bg-card p-6 text-center">
          <p className="text-[8px] text-muted-foreground">{t("ranking.no_scores")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={handleShare}
            disabled={sharing || leaderboard.length === 0}
            className="w-full text-center pixel-border bg-pixel-blue text-primary-foreground text-[8px] uppercase tracking-wider py-2.5 disabled:opacity-40"
          >
            {sharing ? t("ranking.sharing") : t("ranking.share")}
          </button>
          {leaderboard.map((m) => {
            const isMe = m.user_id === session.userId;
            const initials = m.nickname.slice(0, 2).toUpperCase();
            return (
              <div
                key={m.user_id}
                className={`pixel-border-sm p-3 flex items-center gap-3 ${
                  isMe ? "bg-pixel-gold/20 border-pixel-gold" : "bg-card"
                }`}
              >
                <span className="w-5 text-[8px] text-muted-foreground text-center">
                  {m.rank === 1 ? "👑" : m.rank}
                </span>

                <div className="h-7 w-7 bg-foreground flex items-center justify-center shrink-0">
                  <span className="text-[6px] text-primary-foreground">{initials}</span>
                </div>

                <span className="text-foreground flex-1 truncate text-xs">{m.nickname}</span>

                <MovementIndicator movement={m.rank_delta} />

                <span className="text-[8px] text-foreground tabular-nums min-w-[45px] text-right">
                  {m.total_points} {t("ranking.pts")}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden snapshot capture target — laid out offscreen so html-to-image
          can serialize it without affecting the on-screen layout. Kept opaque
          and width-locked to produce a stable PNG. */}
      <div
        ref={snapshotRef}
        aria-hidden="true"
        style={{ position: "fixed", left: -9999, top: 0, width: 360, pointerEvents: "none" }}
      >
        <SnapshotCard
          payload={snapshotPayload}
          podiumLabel={t("snapshot.podium")}
          youLabel={t("snapshot.you")}
          capture
        />
      </div>

      {/* Fallback share dialog (D-13) — shown when Web Share API isn't available. */}
      {shareUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShareUrl(null)}>
          <div className="w-full max-w-[320px] mx-4 pixel-border bg-card p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[10px] text-foreground">{t("snapshot.share_via")}</h3>
            <div className="pixel-inset bg-background p-2 text-[7px] font-mono text-foreground break-all">{shareUrl}</div>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${session.leagueName} — Fuut 2026 ${shareUrl}`)}`}
                target="_blank" rel="noreferrer"
                className="flex items-center justify-center pixel-border bg-pixel-green text-primary-foreground text-[7px] uppercase tracking-wider py-2"
              >
                {t("snapshot.whatsapp")}
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`${session.leagueName} — Fuut 2026`)}`}
                target="_blank" rel="noreferrer"
                className="flex items-center justify-center pixel-border bg-pixel-blue text-primary-foreground text-[7px] uppercase tracking-wider py-2"
              >
                {t("snapshot.telegram")}
              </a>
            </div>
            <button
              onClick={handleCopy}
              className="w-full pixel-border bg-foreground text-primary-foreground text-[7px] uppercase tracking-wider py-2"
            >
              {copied ? t("snapshot.copied") : t("snapshot.copy_link")}
            </button>
            <button
              onClick={() => setShareUrl(null)}
              className="w-full text-[7px] uppercase tracking-wider text-muted-foreground py-1"
            >
              {t("league.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RankingTab;
