import { Sheet, SheetContent } from "@/components/ui/sheet";

interface MobileSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const MobileSheet = ({ open, onClose, title, children }: MobileSheetProps) => (
  <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
    <SheetContent
      side="bottom"
      className="rounded-t-xl border-t-2 border-foreground bg-card px-5 pt-4 pb-safe focus:outline-none"
    >
      {/* Drag handle */}
      <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/40" />
      <h2 className="mb-4 text-sm font-bold text-foreground uppercase tracking-wider">{title}</h2>
      {children}
    </SheetContent>
  </Sheet>
);

export default MobileSheet;
