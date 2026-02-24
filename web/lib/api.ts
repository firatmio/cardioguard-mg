// =============================================================================
// API Client — Server communication layer
// =============================================================================
// All CRUD operations are routed to the server through this client.
// Firebase Auth token is automatically attached.
// =============================================================================

import { auth } from "./firebase/config";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

// ---------------------------------------------------------------------------
// Token helper
// ---------------------------------------------------------------------------

async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("User is not signed in.");
  return user.getIdToken();
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  params?: Record<string, string | number | boolean | undefined | null>;
}

async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, auth: requireAuth = true, params } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (requireAuth) {
    const token = await getAuthToken();
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Build query string
  let url = `${API_BASE_URL}${path}`;
  if (params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qs.append(k, String(v));
    });
    const qstr = qs.toString();
    if (qstr) url += `?${qstr}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ detail: res.statusText }));
    const msg = errBody?.detail || errBody?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

export const api = {
  get: <T = unknown>(path: string, params?: RequestOptions["params"]) =>
    apiRequest<T>(path, { params }),

  post: <T = unknown>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "POST", body }),

  put: <T = unknown>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "PUT", body }),

  delete: <T = unknown>(path: string) =>
    apiRequest<T>(path, { method: "DELETE" }),

  /** For requests that don't require auth */
  public: {
    get: <T = unknown>(path: string, params?: RequestOptions["params"]) =>
      apiRequest<T>(path, { auth: false, params }),
  },
};

export default api;
