/**
 * Small typed fetch helper for client components.
 * Always sends the `Origin` header so the server's CSRF checks pass
 * for same-origin requests (browsers also add it automatically).
 */
export interface ApiResult {
  ok: boolean;
  error?: string;
  field?: string;
}

export async function api<T = ApiResult>(
  path: string,
  init?: { method?: string; json?: unknown }
): Promise<T & ApiResult> {
  const method = init?.method ?? (init?.json !== undefined ? "POST" : "GET");
  const headers: Record<string, string> = {
    origin: window.location.origin,
  };
  if (init?.json !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(path, {
    method,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : undefined,
  });
  let data: T & ApiResult;
  try {
    data = (await res.json()) as T & ApiResult;
  } catch {
    data = { ok: res.ok } as T & ApiResult;
  }
  return data;
}