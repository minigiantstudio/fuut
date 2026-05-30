/**
 * Pixel-art ranking snapshot (SOCIAL-03, D-11/D-12).
 *
 * One component for two callers: RankingTab renders it in a hidden offscreen
 * div for html-to-image PNG capture, and the public /s/:token teaser page
 * renders it for human visitors. The payload is the *frozen* snapshot data
 * stored in snapshot_tokens — it intentionally contains only public-safe fields
 * (nicknames, ranks, points) per threat T-04-07.
 *
 * Note: colors are inline-styled (explicit hex), not Tailwind theme tokens.
 * html-to-image inlines computed styles, but Tailwind class colors resolve via
 * CSS variables that flip with dark mode — capturing under dark mode against a
 * forced white background produced white-on-white blank PNGs. Hardcoding the
 * card as black-on-white makes it look like a printed badge regardless of
 * theme or render context.
 */

export interface SnapshotPayload {
  leagueName: string;
  inviteCode?: string;
  createdAt: string;
  podium: { rank: number; nickname: string; total_points: number }[];
  you: { rank: number; nickname: string; total_points: number } | null;
}

interface SnapshotCardProps {
  payload: SnapshotPayload;
  podiumLabel?: string;
  youLabel?: string;
  /** Capture mode = fixed width for html-to-image rendering. */
  capture?: boolean;
}

// Explicit palette — kept in one place for the printed-card aesthetic.
const C = {
  bg: "#ffffff",
  panel: "#f5f5f5",
  border: "#0a0a0a",
  text: "#0a0a0a",
  muted: "#666666",
  gold: "#f5b400",
  goldBg: "#fff7d6",
};

const SnapshotCard = ({ payload, podiumLabel = "🏆 Top 3", youLabel = "You", capture = false }: SnapshotCardProps) => {
  const dateStr = new Date(payload.createdAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  // The "you" row is suppressed when the current user is already on the podium
  // — avoids a duplicate line in the shareable image.
  const onPodium = payload.you ? payload.podium.some((p) => p.rank === payload.you!.rank && p.nickname === payload.you!.nickname) : true;

  const rootStyle: React.CSSProperties = {
    width: capture ? 360 : "100%",
    backgroundColor: C.bg,
    color: C.text,
    border: `4px solid ${C.border}`,
    padding: 16,
    boxSizing: "border-box",
    fontFamily: "monospace",
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 9,
    color: C.text,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  };

  const rowStyle = (highlight = false): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: `2px solid ${C.border}`,
    backgroundColor: highlight ? C.goldBg : C.panel,
    padding: "6px 8px",
    marginBottom: 4,
  });

  return (
    <div style={rootStyle}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <p style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 3, margin: 0 }}>
          Fuut 2026
        </p>
        <h2 style={{ fontSize: 16, color: C.text, margin: "4px 0", fontWeight: 700 }}>
          👥 {payload.leagueName}
        </h2>
        <p style={{ fontSize: 8, color: C.muted, margin: 0 }}>{dateStr}</p>
      </div>

      <div style={{ marginBottom: 12 }}>
        <p style={sectionLabel}>{podiumLabel}</p>
        {payload.podium.map((p) => {
          const medal = p.rank === 1 ? "👑" : p.rank === 2 ? "🥈" : p.rank === 3 ? "🥉" : `#${p.rank}`;
          return (
            <div key={`${p.rank}-${p.nickname}`} style={rowStyle(false)}>
              <span style={{ width: 20, textAlign: "center", fontSize: 12 }}>{medal}</span>
              <span style={{ flex: 1, fontSize: 12, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.nickname}
              </span>
              <span style={{ fontSize: 11, color: C.text, fontVariantNumeric: "tabular-nums" }}>
                {p.total_points} pts
              </span>
            </div>
          );
        })}
      </div>

      {payload.you && !onPodium && (
        <div>
          <p style={{ ...sectionLabel, color: C.gold }}>★ {youLabel}</p>
          <div style={rowStyle(true)}>
            <span style={{ width: 20, textAlign: "center", fontSize: 10, color: C.muted }}>
              #{payload.you.rank}
            </span>
            <span style={{ flex: 1, fontSize: 12, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {payload.you.nickname}
            </span>
            <span style={{ fontSize: 11, color: C.text, fontVariantNumeric: "tabular-nums" }}>
              {payload.you.total_points} pts
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SnapshotCard;
