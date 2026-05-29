export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: {
    id: string;
    email?: string;
  };
}

const SESSION_KEY = "radar-supabase-session";
const SESSION_EVENT = "radar-supabase-session-updated";
const SESSION_ACTIVITY_KEY = "radar-supabase-session-last-activity";

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  return { url, publishableKey };
}

export function hasSupabaseConfig(): boolean {
  const { url, publishableKey } = getSupabaseConfig();
  return Boolean(url && publishableKey);
}

export function saveSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  touchSessionActivity();
  window.dispatchEvent(new CustomEvent(SESSION_EVENT));
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(SESSION_ACTIVITY_KEY);
  window.dispatchEvent(new CustomEvent(SESSION_EVENT));
}

export function touchSessionActivity(timestamp?: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_ACTIVITY_KEY, String(timestamp ?? Date.now()));
}

export function getLastSessionActivity(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_ACTIVITY_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getSessionEventName(): string {
  return SESSION_EVENT;
}

async function parseAuthError(resp: Response): Promise<string> {
  try {
    const body = await resp.json();
    return body.msg || body.error_description || body.message || `Erro HTTP ${resp.status}`;
  } catch {
    return `Erro HTTP ${resp.status}`;
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthSession | null> {
  const { url, publishableKey } = getSupabaseConfig();
  const resp = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!resp.ok) {
    throw new Error(await parseAuthError(resp));
  }

  const data = await resp.json();
  if (data.session) {
    return data.session as AuthSession;
  }
  return null;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthSession> {
  const { url, publishableKey } = getSupabaseConfig();
  const resp = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!resp.ok) {
    throw new Error(await parseAuthError(resp));
  }

  return (await resp.json()) as AuthSession;
}

export async function validateSession(session: AuthSession): Promise<AuthSession | null> {
  const { url, publishableKey } = getSupabaseConfig();
  const resp = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!resp.ok) {
    return null;
  }

  const user = await resp.json();
  return {
    ...session,
    user: {
      id: user.id,
      email: user.email,
    },
  };
}