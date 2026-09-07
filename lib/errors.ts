/** Application error carrying an HTTP status + optional field for form errors. */
export class AppError extends Error {
  status: number;
  field?: string;
  constructor(status: number, message: string, field?: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.field = field;
  }
}

export class ApiResult {
  constructor(
    public ok: boolean,
    public status: number,
    public body: unknown
  ) {}
}

/** Wraps any thrown AppError (or unknown error) into a JSON API response. */
export function jsonError(err: unknown): Response {
  if (err instanceof AppError) {
    return Response.json(
      { ok: false, error: err.message, field: err.field },
      { status: err.status }
    );
  }
  console.error("[api-error]", err);
  return Response.json(
    { ok: false, error: "Internal server error" },
    { status: 500 }
  );
}

export function jsonOk(data?: unknown, extra?: { status?: number }): Response {
  return Response.json({ ok: true, ...(data ?? {}) }, { status: extra?.status ?? 200 });
}

/**
 * CSRF protection: every state-changing request must carry an `Origin`
 * header that matches the request host. Combined with SameSite=Lax session
 * cookies this neutralizes cross-site request forgery.
 */
export function checkSameOrigin(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(req.url);
    return originUrl.host === requestUrl.host;
  } catch {
    return false;
  }
}

export function assertSameOrigin(req: Request): void {
  if (!checkSameOrigin(req)) {
    throw new AppError(403, "Cross-origin requests are not allowed.");
  }
}

export async function readJson<T>(req: Request): Promise<T> {
  const text = await req.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AppError(400, "Invalid JSON body.");
  }
}

/** Returns the real client IP using trusted proxy headers. */
export function clientIp(req: Request): string {
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}