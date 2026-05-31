import { clearSession, getSession, getSupabaseConfig, refreshSession } from "@/lib/supabaseAuth";

export async function supabaseFetch(path: string, init?: RequestInit): Promise<Response> {
  const { url, publishableKey } = getSupabaseConfig();
  let session = getSession();

  const baseHeaders: Record<string, string> = {
    apikey: publishableKey,
    ...(init?.headers as Record<string, string> | undefined),
  };

  const withAuthHeaders = (accessToken?: string): Record<string, string> => ({
    ...baseHeaders,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  });

  const doFetch = (headers: Record<string, string>) =>
    fetch(`${url}/rest/v1/${path}`, {
      cache: "no-store",
      ...init,
      headers,
    });

  const headers = withAuthHeaders(session?.access_token);

  if (!headers["Content-Type"] && init?.body) {
    headers["Content-Type"] = "application/json";
  }

  let resp = await doFetch(headers);
  if (resp.status !== 401) {
    return resp;
  }

  const renewed = await refreshSession(session);
  if (!renewed?.access_token) {
    clearSession();
    return resp;
  }

  session = renewed;
  resp = await doFetch(withAuthHeaders(session.access_token));
  if (resp.status === 401) {
    clearSession();
  }
  return resp;
}

export function canUseSupabase(): boolean {
  const { url, publishableKey } = getSupabaseConfig();
  return Boolean(url && publishableKey && getSession()?.access_token);
}

export function getCurrentOwnerId(): string {
  return getSession()?.user?.id || "";
}
