/**
 * Pixel-art ranking snapshot (SOCIAL-03, D-11/D-12).
 *
 * One component for two callers: RankingTab renders it in a hidden offscreen
 * div for html-to-image PNG capture, and the public /s/:token teaser page
 * renders it for human visitors. The payload is the *frozen* snapshot data
 * stored in snapshot_tokens — it intentionally contains only public-safe fields
 * (nicknames, ranks, points) per threat T-04-07.
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
  /** Capture mode = fixed width + opaque background for html-to-image rendering. */
  capture?: boolean;
}

const SnapshotCard = ({ payload, podiumLabel = "🏆 Top 3", youLabel = "You", capture = false }: SnapshotCardProps) => {
  const dateStr = new Date(payload.createdAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  // The "you" row is suppressed when the current user is already on the podium
  // — avoids a duplicate line in the shareable image.
  const onPodium = payload.you ? payload.podium.some((p) => p.rank === payload.you!.rank && p.nickname === payload.you!.nickname) : true;

  return (
    <div
      className={`pixel-border bg-card p-4 space-y-3 ${capture ? "w-[360px]" : "w-full"}`}
      style={capture ? { backgroundColor: "#ffffff" } : undefined}
    >
      <div className="text-center space-y-0.5">
        <p className="text-[7px] text-muted-foreground uppercase tracking-[0.3em]">Fuut 2026</p>
        <h2 className="text-foreground text-sm tracking-wide truncate">👥 {payload.leagueName}</h2>
        <p className="text-[6px] text-muted-foreground">{dateStr}</p>
      </div>

      <div className="space-y-1.5">
        <p className="text-[7px] text-foreground uppercase tracking-wider">{podiumLabel}</p>
        {payload.podium.map((p) => {
          const medal = p.rank === 1 ? "👑" : p.rank === 2 ? "🥈" : p.rank === 3 ? "🥉" : `#${p.rank}`;
          return (
            <div key={`${p.rank}-${p.nickname}`} className="flex items-center gap-2 pixel-border-sm bg-background px-2 py-1.5">
              <span className="w-5 text-center text-[9px]">{medal}</span>
              <span className="text-foreground text-xs flex-1 truncate">{p.nickname}</span>
              <span className="text-[8px] text-foreground tabular-nums">{p.total_points} pts</span>
            </div>
          );
        })}
      </div>

      {payload.you && !onPodium && (
        <div className="space-y-1.5">
          <p className="text-[7px] text-pixel-gold uppercase tracking-wider">★ {youLabel}</p>
          <div className="flex items-center gap-2 pixel-border-sm bg-pixel-gold/20 px-2 py-1.5">
            <span className="w-5 text-center text-[8px] text-muted-foreground">#{payload.you.rank}</span>
            <span className="text-foreground text-xs flex-1 truncate">{payload.you.nickname}</span>
            <span className="text-[8px] text-foreground tabular-nums">{payload.you.total_points} pts</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SnapshotCard;
