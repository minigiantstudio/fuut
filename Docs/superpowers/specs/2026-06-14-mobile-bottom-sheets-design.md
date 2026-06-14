# Mobile Bottom Sheets — Design Spec
**Date:** 2026-06-14  
**Scope:** Replace all centered modal overlays with bottom sheets across LeagueTab and RankingTab.

---

## Problem

All current overlays (`fixed inset-0 … max-w-[320px]`) render as centered modals. On a 390px mobile screen:
- The dialog can be too small to tap without zooming
- The keyboard covers the input field with no scroll compensation
- The pattern feels non-native on iOS/Android

## Solution

Convert every overlay to a **bottom sheet** — slides up from the bottom edge, thumb-friendly, keyboard-aware, dismissable by tapping the backdrop or dragging down. The existing `sheet.tsx` (shadcn/ui) already handles animation and dismiss logic.

---

## Affected Overlays (5 total)

| Overlay | File | Trigger |
|---|---|---|
| Create new league | `LeagueTab.tsx` | "+ Create new league" button |
| Delete league confirm | `LeagueTab.tsx` | Danger zone "Delete league" |
| Regenerate invite code confirm | `LeagueTab.tsx` | ⚙ "Regenerate code" |
| Remove / Promote / Demote member | `LeagueTab.tsx` | Member action icons |
| Share ranking fallback | `RankingTab.tsx` | "Share" button (non–Web Share API path) |

---

## MobileSheet Component

A thin wrapper over `Sheet` / `SheetContent` from `@/components/ui/sheet` that enforces:

- `side="bottom"` — slides up from the bottom
- Drag handle pill (centered, top of sheet)
- `pb-safe` padding — respects iPhone home bar (`env(safe-area-inset-bottom)`)
- Pixel-border top edge consistent with app aesthetic
- `onOpenChange` prop wires dismiss to parent state

```tsx
// src/components/MobileSheet.tsx
interface MobileSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}
```

Children render the body (inputs, buttons, error text). No scroll needed for short forms.

---

## Per-Sheet Content

### Create new league
- Text input (league name, maxLength 50, autoFocus)
- Create button (green, disabled when empty or loading)
- Cancel button (closes sheet, resets input)
- Inline error text below input on failure

### Delete league confirm
- Warning copy: league name + "all data will be lost"
- Delete button (red)
- Cancel button
- Inline error on failure

### Regenerate invite code confirm
- Current code displayed
- Warning copy about old links breaking
- Confirm button (red)
- Cancel button

### Remove / Promote / Demote member
- Member nickname displayed
- Action-specific copy (from existing `dialogConfig`)
- Confirm CTA (from existing config)
- Cancel button

### Share ranking fallback
- Snapshot URL displayed
- WhatsApp button
- Telegram button
- Copy link button
- Close button

---

## Visual Design

- Top edge: `border-t-2 border-foreground` — matches pixel-border style
- Drag handle: `w-10 h-1 bg-muted-foreground/40 rounded mx-auto mb-4`
- Safe area: `pb-[env(safe-area-inset-bottom)]` + extra `pb-4` fallback
- All buttons: existing `pixel-border` classes, full width, `h-12` minimum touch target (48px)
- Font sizes: minimum `text-xs` (12px) — no `text-[6px]` inside sheets

---

## What Does NOT Change

- The `Sheet` / `SheetContent` animation and backdrop from `sheet.tsx` — reused as-is
- All RPC calls, state management, query invalidation — unchanged
- App layout, BottomNav, TopBar — untouched
