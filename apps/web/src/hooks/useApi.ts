import { useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export const useApi = () => {
  const apiFetch = useCallback(async <T = unknown>(path: string, init: RequestInit = {}): Promise<T> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

    if (!response.ok) {
      const body = await response.text();
      throw new ApiError(response.status, body || response.statusText);
    }

    return response.json() as Promise<T>;
  }, []);

  return { apiFetch };
};
