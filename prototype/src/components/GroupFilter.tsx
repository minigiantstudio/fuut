import { useState } from "react";
import { Filter } from "lucide-react";

const groups = ["All", "Group A", "Group B", "Group C", "Group D", "Group E", "Group F", "Group G", "Group H"];

interface GroupFilterProps {
  active: string;
  onSelect: (group: string) => void;
}

const GroupFilter = ({ active, onSelect }: GroupFilterProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 flex items-center justify-center border-2 border-foreground bg-card text-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] pixel-press"
        aria-label="Filter by group"
      >
        <Filter size={14} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 border-3 border-foreground bg-card shadow-[3px_3px_0_0_hsl(var(--foreground))] pixel-border min-w-[140px]">
            {groups.map((group) => (
              <button
                key={group}
                onClick={() => {
                  onSelect(group);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-[7px] uppercase tracking-wider border-b border-foreground/20 last:border-b-0 transition-colors ${
                  active === group
                    ? "bg-foreground text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {group}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default GroupFilter;
