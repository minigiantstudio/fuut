import { useRef, useEffect } from "react";

const stages = [
  "Matchday 1",
  "Matchday 2",
  "Matchday 3",
  "Round of 16",
  "Quarter-finals",
  "Semi-finals",
  "Final",
];

interface StageNavProps {
  active: string;
  onSelect: (stage: string) => void;
}

const StageNav = ({ active, onSelect }: StageNavProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [active]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {stages.map((stage) => {
        const isActive = stage === active;
        return (
          <button
            key={stage}
            ref={isActive ? activeRef : undefined}
            onClick={() => onSelect(stage)}
            className={`shrink-0 px-3 py-2 text-[7px] uppercase tracking-wider border-2 border-foreground transition-all whitespace-nowrap pixel-press ${
              isActive
                ? "bg-foreground text-primary-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                : "bg-card text-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:bg-muted"
            }`}
          >
            {stage}
          </button>
        );
      })}
    </div>
  );
};

export default StageNav;
