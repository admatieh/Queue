import { QueryClient, QueryFunction } from "@tanstack/react-query";

// ─── JWT Token Storage ────────────────────────────────────────────────────────
// Token is kept in memory AND persisted to localStorage so it survives
// page refreshes. We use a simple storage key and guard against localStorage
// being unavailable (e.g. private browsing with strict settings).
const TOKEN_KEY = "qb_token";

function readFromStorage(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function saveToStorage(token: string): void {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
}
function removeFromStorage(): void {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

// Restore persisted token on module load (happens once at app startup)
let _jwtToken: string | null = readFromStorage();

/** Set the JWT after successful login/register. Persists to localStorage. */
export function setToken(token: string): void {
  _jwtToken = token;
  saveToStorage(token);
}

/** Clear the JWT on logout. Removes from localStorage. */
export function clearToken(): void {
  _jwtToken = null;
  removeFromStorage();
}

/** Get the current JWT (may be null if not logged in). */
export function getToken(): string | null {
  return _jwtToken;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function buildHeaders(data?: unknown): Record<string, string> {
  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";
  if (_jwtToken) headers["Authorization"] = `Bearer ${_jwtToken}`;
  return headers;
}

// ─── API Request helper ───────────────────────────────────────────────────────
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: buildHeaders(data),
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// ─── React-Query default fetcher ─────────────────────────────────────────────
type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const headers: Record<string, string> = {};
      if (_jwtToken) headers["Authorization"] = `Bearer ${_jwtToken}`;

      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
        headers,
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
