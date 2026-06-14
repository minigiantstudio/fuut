# Mobile Bottom Sheets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all five centered modal overlays with mobile-native bottom sheets so the app works without zooming on a 390px screen.

**Architecture:** Build one `MobileSheet` wrapper over the existing `Sheet`/`SheetContent` from `@/components/ui/sheet` (Radix Dialog, already installed). Each of the five overlays in `LeagueTab.tsx` and `RankingTab.tsx` is rewritten to use `MobileSheet` — all RPC calls, state, and query invalidation stay untouched.

**Tech Stack:** React, Radix UI Sheet (already in `/apps/web/src/components/ui/sheet.tsx`), Tailwind CSS, TypeScript.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| **Create** | `apps/web/src/components/MobileSheet.tsx` | Reusable bottom-sheet wrapper |
| **Modify** | `apps/web/src/components/tabs/LeagueTab.tsx` | Swap 4 modals → MobileSheet |
| **Modify** | `apps/web/src/components/tabs/RankingTab.tsx` | Swap share fallback → MobileSheet |
| **Modify** | `apps/web/src/index.css` | Add `pb-safe` utility |

---

### Task 1: Add `pb-safe` CSS utility

The home bar on iPhone sits below the bottom sheet. `env(safe-area-inset-bottom)` gives us the right padding without hardcoding.

**Files:**
- Modify: `apps/web/src/index.css`

- [ ] **Step 1: Open `apps/web/src/index.css` and add the utility after the existing `--topbar-height` line inside `:root`**

Find the block:
```css
:root {
  --topbar-height: calc(3.5rem + env(safe-area-inset-top, 0px));
```

Add immediately after that line:
```css
  --safe-bottom: env(safe-area-inset-bottom, 0px);
```

Then at the bottom of the file (after all `@layer` blocks) add:
```css
.pb-safe {
  padding-bottom: max(1rem, env(safe-area-inset-bottom, 1rem));
}
```

- [ ] **Step 2: Verify TypeScript still compiles**

```bash
cd apps/web && bunx tsc --noEmit
```
Expected: no output (zero errors).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/index.css
git commit -m "chore: add pb-safe CSS utility for iPhone home bar"
```

---

### Task 2: Create `MobileSheet` component

One wrapper that all five overlays will use.

**Files:**
- Create: `apps/web/src/components/MobileSheet.tsx`

- [ ] **Step 1: Create the file**

```tsx
// apps/web/src/components/MobileSheet.tsx
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && bunx tsc --noEmit
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/MobileSheet.tsx
git commit -m "feat: add MobileSheet bottom-sheet wrapper"
```

---

### Task 3: Convert "Create new league" overlay → MobileSheet

**Files:**
- Modify: `apps/web/src/components/tabs/LeagueTab.tsx`

- [ ] **Step 1: Add the import at the top of `LeagueTab.tsx`**

After the existing imports add:
```tsx
import MobileSheet from "@/components/MobileSheet";
```

- [ ] **Step 2: Replace the `showCreateLeague` inline block in the render**

Find this block (around line 335–375):
```tsx
      {/* Create new league */}
      <div className="space-y-2">
        <h2 className="text-[8px] text-foreground">➕ New league</h2>
        {showCreateLeague ? (
          <div className="pixel-border bg-card p-4 space-y-3">
            <input
              autoFocus
              value={newLeagueName}
              onChange={(e) => setNewLeagueName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newLeagueName.trim()) handleCreateLeague(); if (e.key === "Escape") { setShowCreateLeague(false); setNewLeagueName(""); setCreateError(null); } }}
              maxLength={50}
              placeholder="League name"
              className="w-full pixel-inset bg-background px-2 py-1.5 text-sm text-foreground"
            />
            {createError && <p className="text-[6px] text-pixel-red">{createError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleCreateLeague}
                disabled={createLoading || !newLeagueName.trim()}
                className="flex-1 h-10 pixel-border bg-pixel-green text-primary-foreground text-[7px] uppercase tracking-wider disabled:opacity-40"
              >
                {createLoading ? "Creating…" : "Create"}
              </button>
              <button
                onClick={() => { setShowCreateLeague(false); setNewLeagueName(""); setCreateError(null); }}
                className="flex-1 h-10 pixel-border bg-foreground text-primary-foreground text-[7px] uppercase tracking-wider"
              >
                {t("league.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateLeague(true)}
            className="w-full text-center pixel-border bg-card text-foreground text-[8px] uppercase tracking-wider py-2.5"
          >
            + Create new league
          </button>
        )}
      </div>
```

Replace with:
```tsx
      {/* Create new league */}
      <div className="space-y-2">
        <button
          onClick={() => setShowCreateLeague(true)}
          className="w-full text-center pixel-border bg-card text-foreground text-[8px] uppercase tracking-wider py-3"
        >
          + Create new league
        </button>
      </div>

      <MobileSheet
        open={showCreateLeague}
        onClose={() => { setShowCreateLeague(false); setNewLeagueName(""); setCreateError(null); }}
        title="New league"
      >
        <div className="space-y-3">
          <input
            autoFocus
            value={newLeagueName}
            onChange={(e) => setNewLeagueName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && newLeagueName.trim()) handleCreateLeague(); }}
            maxLength={50}
            placeholder="League name"
            className="w-full pixel-inset bg-background px-3 py-3 text-sm text-foreground"
          />
          {createError && <p className="text-xs text-pixel-red">{createError}</p>}
          <button
            onClick={handleCreateLeague}
            disabled={createLoading || !newLeagueName.trim()}
            className="w-full h-12 pixel-border bg-pixel-green text-primary-foreground text-xs uppercase tracking-wider disabled:opacity-40"
          >
            {createLoading ? "Creating…" : "Create"}
          </button>
          <button
            onClick={() => { setShowCreateLeague(false); setNewLeagueName(""); setCreateError(null); }}
            className="w-full h-12 pixel-border bg-foreground text-primary-foreground text-xs uppercase tracking-wider"
          >
            {t("league.cancel")}
          </button>
        </div>
      </MobileSheet>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/web && bunx tsc --noEmit
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/tabs/LeagueTab.tsx
git commit -m "feat(league): create-new-league overlay → bottom sheet"
```

---

### Task 4: Convert member action dialog (Remove/Promote/Demote) → MobileSheet

**Files:**
- Modify: `apps/web/src/components/tabs/LeagueTab.tsx`

- [ ] **Step 1: Find the member action dialog block**

Look for the block that starts around:
```tsx
      {/* ── Member action dialog ── */}
      {dialogConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-[320px] mx-4 pixel-border bg-card p-5 space-y-4">
```

- [ ] **Step 2: Replace the entire member action dialog with MobileSheet**

Replace from `{/* ── Member action dialog ── */}` through its closing `)}` with:

```tsx
      {/* ── Member action dialog ── */}
      <MobileSheet
        open={!!dialogConfig}
        onClose={() => { setDialogType(null); setDialogTarget(null); setDialogError(null); }}
        title={dialogConfig?.title ?? ""}
      >
        {dialogConfig && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{dialogConfig.body}</p>
            {dialogError && <p className="text-xs text-pixel-red">{dialogError}</p>}
            <button
              onClick={handleDialogAction}
              disabled={dialogLoading}
              className="w-full h-12 pixel-border bg-pixel-red text-primary-foreground text-xs uppercase tracking-wider disabled:opacity-40"
            >
              {dialogLoading ? "…" : dialogConfig.cta}
            </button>
            <button
              onClick={() => { setDialogType(null); setDialogTarget(null); setDialogError(null); }}
              className="w-full h-12 pixel-border bg-foreground text-primary-foreground text-xs uppercase tracking-wider"
            >
              {t("league.cancel")}
            </button>
          </div>
        )}
      </MobileSheet>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/web && bunx tsc --noEmit
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/tabs/LeagueTab.tsx
git commit -m "feat(league): member action dialog → bottom sheet"
```

---

### Task 5: Convert "Regenerate invite code" confirm → MobileSheet

**Files:**
- Modify: `apps/web/src/components/tabs/LeagueTab.tsx`

- [ ] **Step 1: Find the regenerate confirm block**

Look for:
```tsx
      {/* ── Regenerate confirmation ── */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-[320px] mx-4 pixel-border bg-card p-5 space-y-4">
```

- [ ] **Step 2: Replace with MobileSheet**

Replace the entire block with:
```tsx
      {/* ── Regenerate confirmation ── */}
      <MobileSheet
        open={showRegenerateConfirm}
        onClose={() => { setShowRegenerateConfirm(false); setRegenerateError(null); }}
        title={t("league.regen_confirm_title")}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground font-mono">{league?.invite_code}</span>
            {" — "}{t("league.regen_confirm_body")}
          </p>
          {regenerateError && <p className="text-xs text-pixel-red">{regenerateError}</p>}
          <button
            onClick={handleRegenerate}
            disabled={regenerateLoading}
            className="w-full h-12 pixel-border bg-pixel-red text-primary-foreground text-xs uppercase tracking-wider disabled:opacity-40"
          >
            {regenerateLoading ? t("league.regenerating") : t("league.confirm_regenerate")}
          </button>
          <button
            onClick={() => { setShowRegenerateConfirm(false); setRegenerateError(null); }}
            className="w-full h-12 pixel-border bg-foreground text-primary-foreground text-xs uppercase tracking-wider"
          >
            {t("league.cancel")}
          </button>
        </div>
      </MobileSheet>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/web && bunx tsc --noEmit
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/tabs/LeagueTab.tsx
git commit -m "feat(league): regenerate-code confirm → bottom sheet"
```

---

### Task 6: Convert "Delete league" confirm → MobileSheet

**Files:**
- Modify: `apps/web/src/components/tabs/LeagueTab.tsx`

- [ ] **Step 1: Find the delete confirm block**

Look for:
```tsx
      {/* ── Delete confirmation ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-[320px] mx-4 pixel-border bg-card p-5 space-y-4">
```

- [ ] **Step 2: Replace with MobileSheet**

Replace the entire block with:
```tsx
      {/* ── Delete confirmation ── */}
      <MobileSheet
        open={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
        title={t("league.danger_heading")}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground">{leagueName}</span>
            {" — "}{t("league.delete_confirm_body")}
          </p>
          {deleteError && <p className="text-xs text-pixel-red">{deleteError}</p>}
          <button
            onClick={handleDeleteLeague}
            disabled={deleteLoading}
            className="w-full h-12 pixel-border bg-pixel-red text-primary-foreground text-xs uppercase tracking-wider disabled:opacity-40"
          >
            {deleteLoading ? "…" : t("league.confirm_delete")}
          </button>
          <button
            onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
            className="w-full h-12 pixel-border bg-foreground text-primary-foreground text-xs uppercase tracking-wider"
          >
            {t("league.cancel")}
          </button>
        </div>
      </MobileSheet>
```

- [ ] **Step 3: Check that `t("league.delete_confirm_body")` and `t("league.confirm_delete")` exist in both locale files**

```bash
grep -n "delete_confirm_body\|confirm_delete" apps/web/src/lib/i18n/en.json apps/web/src/lib/i18n/es.json
```

If they are missing, add to `en.json`:
```json
"delete_confirm_body": "This will permanently delete the league and all data.",
"confirm_delete": "Delete forever"
```
And to `es.json`:
```json
"delete_confirm_body": "Esto eliminará permanentemente la liga y todos los datos.",
"confirm_delete": "Eliminar para siempre"
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd apps/web && bunx tsc --noEmit
```
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/tabs/LeagueTab.tsx apps/web/src/lib/i18n/en.json apps/web/src/lib/i18n/es.json
git commit -m "feat(league): delete-league confirm → bottom sheet"
```

---

### Task 7: Convert share fallback dialog in RankingTab → MobileSheet

**Files:**
- Modify: `apps/web/src/components/tabs/RankingTab.tsx`

- [ ] **Step 1: Add MobileSheet import**

Add after existing imports:
```tsx
import MobileSheet from "@/components/MobileSheet";
```

- [ ] **Step 2: Find the share fallback dialog block**

Look for:
```tsx
      {/* Fallback share dialog (D-13) — shown when Web Share API isn't available. */}
      {shareUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShareUrl(null)}>
          <div className="w-full max-w-[320px] mx-4 pixel-border bg-card p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
```

- [ ] **Step 3: Replace with MobileSheet**

Replace the entire `{shareUrl && ( … )}` block with:
```tsx
      {/* Fallback share dialog (D-13) — shown when Web Share API isn't available. */}
      <MobileSheet
        open={!!shareUrl}
        onClose={() => setShareUrl(null)}
        title={t("snapshot.share_via")}
      >
        {shareUrl && (
          <div className="space-y-3">
            <div className="pixel-inset bg-background p-2 text-xs font-mono text-foreground break-all">
              {shareUrl}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${session.leagueName} — Fuut 2026 ${shareUrl}`)}`}
                target="_blank" rel="noreferrer"
                className="flex items-center justify-center pixel-border bg-pixel-green text-primary-foreground text-xs uppercase tracking-wider h-12"
              >
                {t("snapshot.whatsapp")}
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`${session.leagueName} — Fuut 2026`)}`}
                target="_blank" rel="noreferrer"
                className="flex items-center justify-center pixel-border bg-pixel-blue text-primary-foreground text-xs uppercase tracking-wider h-12"
              >
                {t("snapshot.telegram")}
              </a>
            </div>
            <button
              onClick={handleCopy}
              className="w-full h-12 pixel-border bg-foreground text-primary-foreground text-xs uppercase tracking-wider"
            >
              {copied ? t("snapshot.copied") : t("snapshot.copy_link")}
            </button>
            <button
              onClick={() => setShareUrl(null)}
              className="w-full text-xs text-muted-foreground py-2"
            >
              {t("league.cancel")}
            </button>
          </div>
        )}
      </MobileSheet>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd apps/web && bunx tsc --noEmit
```
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/tabs/RankingTab.tsx
git commit -m "feat(ranking): share fallback dialog → bottom sheet"
```

---

### Task 8: Push to main and verify deploy

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Check Vercel build succeeds** — watch the Vercel dashboard for the new commit. Build should complete with `✓ built in ~5s`.

- [ ] **Step 3: Open `https://app.fuut.club` on a real phone**, go to the League tab, tap "+ Create new league". Verify:
  - Sheet slides up from the bottom
  - Input is reachable without zooming
  - Keyboard pushes the sheet up (doesn't cover the input)
  - Tapping outside dismisses the sheet

- [ ] **Step 4: Test all 5 overlays on mobile** — Remove member, Promote, Demote, Regenerate code, Delete league, Share ranking.
