import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider } from "@/contexts/SessionContext";
import { LanguageProvider } from "@/lib/i18n";
import Index from "./pages/Index.tsx";
import JoinPage from "./pages/Join.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminLogin from "./admin/AdminLogin.tsx";
import AdminDashboard from "./admin/AdminDashboard.tsx";
import SnapshotPage from "./routes/Snapshot.tsx";
import PWAUpdater from "@/components/PWAUpdater";

// Caching defaults so tab switches are instant (data stays fresh for 30s, cached
// for 5min) instead of re-running every query on each remount. refetchOnWindowFocus
// is off on purpose: in this app a focus-triggered refetch can collide with the
// Supabase auth client's token refresh and stall requests. Realtime invalidation
// (RankingTab) and post-mutation invalidateQueries still force fresh fetches.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <LanguageProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAUpdater />
      <BrowserRouter>
        <SessionProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/join/:code" element={<JoinPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* Public shareable ranking snapshot (SOCIAL-03, D-11). No auth — token is the access control. */}
            <Route path="/s/:token" element={<SnapshotPage />} />
            {/* Admin subtree (DEC-018): env-var auth, separate from SessionContext */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </LanguageProvider>
);

export default App;
