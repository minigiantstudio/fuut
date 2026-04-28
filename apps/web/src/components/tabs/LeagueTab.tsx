import { Switch } from "@/components/ui/switch";

interface Member {
  name: string;
  initials: string;
  role: "admin" | "active" | "inactive";
  predictions: number;
}

const members: Member[] = [
  { name: "Tonton R.", initials: "TR", role: "admin", predictions: 4 },
  { name: "Sophie C.", initials: "SC", role: "active", predictions: 4 },
  { name: "Michel D.", initials: "MD", role: "active", predictions: 3 },
  { name: "Papa L.", initials: "PL", role: "active", predictions: 2 },
  { name: "Julie D.", initials: "JD", role: "inactive", predictions: 0 },
  { name: "Luc M.", initials: "LM", role: "active", predictions: 1 },
];

const StatusBadge = ({ member }: { member: Member }) => {
  if (member.role === "admin") {
    return <span className="text-[6px] px-2 py-0.5 bg-pixel-blue text-primary-foreground border-2 border-foreground">ADMIN</span>;
  }
  if (member.predictions === 0) {
    return <span className="text-[6px] px-2 py-0.5 bg-pixel-gold text-foreground border-2 border-foreground">0 PRED</span>;
  }
  return <span className="text-[6px] px-2 py-0.5 bg-pixel-green text-primary-foreground border-2 border-foreground">ACTIVE</span>;
};

interface LeagueTabProps {
  isAdmin: boolean;
  onAdminChange: (v: boolean) => void;
}

const LeagueTab = ({ isAdmin, onAdminChange }: LeagueTabProps) => {
  return (
    <div className="py-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg text-foreground">👥 Chez Dupont</h1>
          <p className="text-[7px] text-muted-foreground mt-1">
            {members.length} members
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[6px] text-muted-foreground">Admin</span>
          <Switch checked={isAdmin} onCheckedChange={onAdminChange} />
        </div>
      </div>

      {/* Invite code */}
      <div className="pixel-border bg-card p-4 space-y-3">
        <p className="text-[7px] text-muted-foreground uppercase">Invite code</p>
        <div className="pixel-inset bg-background py-3 px-4 text-center">
          <span className="text-[14px] tracking-[0.3em] text-foreground">XK72F</span>
        </div>
        <button className="flex items-center gap-1.5 mx-auto text-xs text-lime-700">
          📤 Share via WhatsApp
        </button>
      </div>

      {/* Members list */}
      <div className="space-y-2">
        <h2 className="text-[8px] text-foreground">Members</h2>
        <div className="pixel-border bg-card divide-y-2 divide-foreground">
          {members.map((m) => (
            <div key={m.name} className="flex items-center gap-3 px-3 py-2.5">
              <div className="h-7 w-7 bg-foreground flex items-center justify-center shrink-0">
                <span className="text-[6px] text-primary-foreground">{m.initials}</span>
              </div>
              <span className="text-xs text-foreground flex-1">{m.name}</span>
              <StatusBadge member={m} />
              {isAdmin && m.role !== "admin" && (
                <button className="text-[7px] text-pixel-red ml-1">✕</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Admin section */}
      {isAdmin && (
        <div className="space-y-2">
          <h2 className="text-[8px] text-foreground">⚙ Manage</h2>
          <div className="pixel-border bg-card divide-y-2 divide-foreground">
            <button className="flex items-center gap-3 px-3 py-2.5 w-full text-left">
              <span className="text-foreground text-xs">✎ Rename league</span>
            </button>
            <button className="flex items-center gap-3 px-3 py-2.5 w-full text-left">
              <span className="text-pixel-red text-xs">⚠ Reset all predictions</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeagueTab;
