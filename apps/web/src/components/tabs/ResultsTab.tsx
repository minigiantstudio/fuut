interface ResultMatch {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  predHome: number;
  predAway: number;
}

const matchday3: ResultMatch[] = [
  { home: "Morocco", away: "Portugal", homeScore: 2, awayScore: 1, predHome: 1, predAway: 2 },
  { home: "USA", away: "Mexico", homeScore: 2, awayScore: 1, predHome: 2, predAway: 1 },
  { home: "France", away: "Argentina", homeScore: 1, awayScore: 0, predHome: 1, predAway: 1 },
];

const getPoints = (m: ResultMatch) => {
  if (m.homeScore === m.predHome && m.awayScore === m.predAway) return 3;
  const actualResult = Math.sign(m.homeScore - m.awayScore);
  const predResult = Math.sign(m.predHome - m.predAway);
  if (actualResult === predResult) return 1;
  return 0;
};

const PointsBadge = ({ points }: { points: number }) => {
  if (points === 3) return <span className="text-[7px] text-pixel-green">+3 pts ★</span>;
  if (points === 1) return <span className="text-[7px] text-pixel-green">+1 pt</span>;
  return <span className="text-[7px] text-muted-foreground">0 pts</span>;
};

const ResultsTab = () => {
  const totalPoints = matchday3.reduce((sum, m) => sum + getPoints(m), 0);

  return (
    <div className="py-5 space-y-4">
      <div>
        <h1 className="text-foreground text-lg">📋 Matchday 3</h1>
        <p className="text-[7px] text-muted-foreground mt-1">Jun 14, 2026</p>
      </div>

      <div className="space-y-3">
        {matchday3.map((m, i) => {
          const pts = getPoints(m);
          return (
            <div key={i} className="pixel-border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-foreground text-xs">
                  {m.home} {m.homeScore} – {m.awayScore} {m.away}
                </span>
                <span className="text-[6px] px-2 py-0.5 bg-pixel-green text-primary-foreground border-2 border-foreground">
                  FT
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[7px] text-muted-foreground">
                  Pred: {m.predHome}–{m.predAway}
                </span>
                <PointsBadge points={pts} />
              </div>
            </div>
          );
        })}

        <div className="pixel-border-sm bg-muted p-3 flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Total this matchday</span>
          <span className="text-[8px] text-pixel-green">+{totalPoints} pts</span>
        </div>
      </div>
    </div>
  );
};

export default ResultsTab;
