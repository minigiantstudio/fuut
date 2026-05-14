/**
 * Admin auth client (DEC-018).
 *
 * Talks to apps/api's /api/admin/login + /api/admin/match-result. The JWT is
 * stored in localStorage under ADMIN_TOKEN_KEY and attached as a Bearer header
 * on every request. Independent of Supabase's auth — admin identity is
 * configured via API env vars, not the DB.
 */

export const ADMIN_TOKEN_KEY = "fuut.adminToken";
export const ADMIN_TOKEN_EXP_KEY = "fuut.adminTokenExpiresAt";

const apiUrl = () =>
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

export interface AdminLoginResult {
  token: string;
  expiresAt: number;
}

export async function adminLogin(email: string, password: string): Promise<AdminLoginResult> {
  const res = await fetch(`${apiUrl()}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(body.message ?? `Login failed (HTTP ${res.status})`);
  }
  const data = (await res.json()) as AdminLoginResult;
  localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
  localStorage.setItem(ADMIN_TOKEN_EXP_KEY, String(data.expiresAt));
  return data;
}

export function adminLogout(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_TOKEN_EXP_KEY);
}

/**
 * Returns the stored admin JWT only if it exists AND hasn't expired locally.
 * The server is still the source of truth — a stale token rejected by the
 * API surfaces as a 401 in adminFetch and triggers a redirect to /admin/login.
 */
export function getAdminToken(): string | null {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  const expStr = localStorage.getItem(ADMIN_TOKEN_EXP_KEY);
  if (!token || !expStr) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp * 1000 <= Date.now()) {
    adminLogout();
    return null;
  }
  return token;
}

export async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getAdminToken();
  if (!token) throw new Error("No admin token");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${apiUrl()}${path}`, { ...init, headers });
  if (res.status === 401) {
    adminLogout();
  }
  return res;
}

export interface FinalizeMatchInput {
  matchId: string;
  homeScore: number;
  awayScore: number;
  bonusResult: boolean;
}

export async function adminFinalizeMatch(input: FinalizeMatchInput): Promise<void> {
  const res = await adminFetch("/api/admin/match-result", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
}
