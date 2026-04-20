const members = [
  { rank: 1, name: "Sophie C.", initials: "SC", movement: 2, points: 24 },
  { rank: 2, name: "Tonton R.", initials: "TR", movement: 0, points: 21, isCurrentUser: true },
  { rank: 3, name: "Michel D.", initials: "MD", movement: -1, points: 19 },
  { rank: 4, name: "Papa L.", initials: "PL", movement: 0, points: 17 },
  { rank: 5, name: "Julie D.", initials: "JD", movement: -2, points: 14 },
  { rank: 6, name: "Luc M.", initials: "LM", movement: 1, points: 11 },
];

const MovementIndicator = ({ movement }: { movement: number }) => {
  if (movement > 0)
    return <span className="text-[8px] text-pixel-green">▲{movement}</span>;
  if (movement < 0)
    return <span className="text-[8px] text-pixel-red">▼{Math.abs(movement)}</span>;
  return <span className="text-[8px] text-muted-foreground">–</span>;
};

const RankingTab = () => {
  return (
    <div className="py-5 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-foreground text-lg">🏆 Leaderboard</h1>
        <span className="text-[7px] text-muted-foreground">MD 3 done</span>
      </div>

      <div className="space-y-2">
        {members.map((m) => (
          <div
            key={m.rank}
            className={`pixel-border-sm p-3 flex items-center gap-3 ${
              m.isCurrentUser ? "bg-pixel-gold/20 border-pixel-gold" : "bg-card"
            }`}
          >
            <span className="w-5 text-[8px] text-muted-foreground text-center">
              {m.rank === 1 ? "👑" : m.rank}
            </span>

            <div className="h-7 w-7 bg-foreground flex items-center justify-center shrink-0">
              <span className="text-[6px] text-primary-foreground">{m.initials}</span>
            </div>

            <span className="text-foreground flex-1 truncate text-xs">{m.name}</span>

            <MovementIndicator movement={m.movement} />

            <span className="text-[8px] text-foreground tabular-nums min-w-[45px] text-right">
              {m.points} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RankingTab;
