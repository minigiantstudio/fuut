import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// No-op lock disables navigator.locks-based cross-tab coordination.
// The default lock can deadlock on page reload if a previous tab left a stale
// lock entry, causing `supabase.auth.getSession()` to hang forever.
// We don't run multiple tabs that mutate auth state simultaneously, so the
// coordination isn't needed.
const noOpLock = async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => fn();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    lock: noOpLock,
  },
});
