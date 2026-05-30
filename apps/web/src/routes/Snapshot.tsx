import { useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import SnapshotCard, { type SnapshotPayload } from "@/components/SnapshotCard";
import { useTranslation } from "@/lib/i18n";

interface SnapshotRow {
  token: string;
  league_id: string;
  snapshot_payload: SnapshotPayload;
  created_at: string;
}

/**
 * Public teaser route /s/:token (SOCIAL-03, D-11). Anyone with the URL can
 * read the frozen snapshot (snapshot_tokens has public-SELECT RLS, since the
 * token itself is the access control). Renders the pixel-art snapshot + a
 * "Join this league" CTA pointing at the existing /join/:code onboarding flow.
 *
 * OG meta tags are set client-side here (best effort for human visitors).
 * True per-route social previews (WhatsApp/Telegram fetching the URL with no
 * JS) require a Vercel edge function to server-render HTML with token-specific
 * <meta property="og:*"> — documented as a follow-up.
 */
const SnapshotPage = () => {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery<SnapshotRow | null>({
    queryKey: ["snapshot", token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("snapshot_tokens")
        .select("token, league_id, snapshot_payload, created_at")
        .eq("token", token!)
        .maybeSingle();
      if (error) throw error;
      return (data as SnapshotRow | null) ?? null;
    },
  });

  const payload = data?.snapshot_payload ?? null;
  // Prefer the live invite_code from the league (so regenerating the code
  // post-share still routes joiners correctly), falling back to the snapshot's
  // frozen copy. league SELECT is public, so anon can read it.
  const { data: liveLeague } = useQuery({
    queryKey: ["snapshot-league", data?.league_id],
    enabled: !!data?.league_id,
    queryFn: async () => {
      const { data: lg } = await supabase
        .from("leagues")
        .select("invite_code, name")
        .eq("id", data!.league_id)
        .maybeSingle();
      return lg as { invite_code: string; name: string } | null;
    },
  });

  const joinCode = liveLeague?.invite_code ?? payload?.inviteCode ?? "";

  // Client-side OG / title best-effort. Social bots that don't execute JS will
  // see the static index.html tags instead — that's the limitation noted above.
  useEffect(() => {
    if (!payload) return;
    const title = `${payload.leagueName} — Fuut 2026`;
    document.title = title;
    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        const m = selector.match(/\[(\w+)="([^"]+)"\]/);
        if (m) el.setAttribute(m[1], m[2]);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", t("snapshot.teaser_caption"));
    setMeta('meta[name="twitter:title"]', "content", title);
  }, [payload, t]);

  // Sanitize nicknames defensively (threat T-04-08). React already escapes
  // text content, but stripping control chars is a belt-and-suspenders move.
  const safePayload = useMemo<SnapshotPayload | null>(() => {
    if (!payload) return null;
    // eslint-disable-next-line no-control-regex -- intentional: strip control chars to harden the public teaser (T-04-08)
    const clean = (s: string) => String(s ?? "").replace(/[\x00-\x1f\x7f]/g, "").slice(0, 40);
    return {
      ...payload,
      leagueName: clean(payload.leagueName ?? ""),
      podium: (payload.podium ?? []).map((p) => ({ ...p, nickname: clean(p.nickname ?? "") })),
      you: payload.you ? { ...payload.you, nickname: clean(payload.you.nickname ?? "") } : null,
    };
  }, [payload]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-[420px] space-y-5">
        <header className="text-center space-y-1">
          <p className="text-[7px] uppercase tracking-[0.3em] text-muted-foreground">Fuut 2026</p>
          <p className="text-[8px] text-foreground">{t("snapshot.teaser_caption")}</p>
        </header>

        {isLoading && (
          <p className="text-center text-[8px] text-muted-foreground">{t("snapshot.loading")}</p>
        )}

        {!isLoading && !safePayload && (
          <p className="text-center text-[8px] text-pixel-red">{t("snapshot.not_found")}</p>
        )}

        {safePayload && (
          <>
            <SnapshotCard
              payload={safePayload}
              podiumLabel={t("snapshot.podium")}
              youLabel={t("snapshot.you")}
            />
            {joinCode && (
              <Link
                to={`/join/${joinCode}`}
                className="block w-full text-center pixel-border bg-pixel-green text-primary-foreground text-[9px] uppercase tracking-wider py-3"
              >
                {t("snapshot.join_cta")}
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SnapshotPage;
