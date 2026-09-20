/** Local demo boundary, not authentication or a hostile-code sandbox. */
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
export const MAX_JSON_BYTES = 16 * 1024;
export const MAX_TASK_CHARS = 8 * 1024;

export function apiError(code: string, status: number): Response {
  return Response.json({ error: code }, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
  });
}

/** Reject DNS rebinding and cross-origin browser writes before reading the body. */
export function checkLocalRequest(request: Request, requireJson = true): Response | null {
  let url: URL;
  let host: URL;
  try {
    url = new URL(request.url);
    const authority = request.headers.get("host") ?? url.host;
    host = new URL(`${url.protocol}//${authority}`);
    if (host.host !== authority.toLowerCase() || host.username || host.password ||
        host.pathname !== "/" || host.search || host.hash) {
      return apiError("LOCAL_REQUEST_REQUIRED", 403);
    }
  } catch {
    return apiError("LOCAL_REQUEST_REQUIRED", 403);
  }
  if (!["http:", "https:"].includes(url.protocol) ||
      !LOOPBACK_HOSTS.has(url.hostname) || !LOOPBACK_HOSTS.has(host.hostname) ||
      url.port !== host.port) return apiError("LOCAL_REQUEST_REQUIRED", 403);
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return apiError("SAME_ORIGIN_REQUIRED", 403);
  }
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== host.origin) {
    return apiError("SAME_ORIGIN_REQUIRED", 403);
  }
  if (requireJson && request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") {
    return apiError("JSON_REQUIRED", 415);
  }
  return null;
}

export type JsonResult = { ok: true; value: unknown } | { ok: false; response: Response };

/** Enforce the byte limit on the stream, not just the untrusted Content-Length. */
export async function readLimitedJson(request: Request, maxBytes = MAX_JSON_BYTES, timeoutMs = 10_000): Promise<JsonResult> {
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBytes)) {
    return { ok: false, response: apiError("BODY_TOO_LARGE", 413) };
  }
  if (!request.body) return { ok: false, response: apiError("INVALID_JSON", 400) };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let expired = false;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      expired = true;
      void reader.cancel().catch(() => {});
      reject(new Error("BODY_TIMEOUT"));
    }, timeoutMs);
  });
  try {
    while (true) {
      const chunk = await Promise.race([reader.read(), timeout]);
      if (expired) return { ok: false, response: apiError("BODY_TIMEOUT", 408) };
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) {
        void reader.cancel().catch(() => {});
        return { ok: false, response: apiError("BODY_TOO_LARGE", 413) };
      }
      chunks.push(chunk.value);
    }
    const combined = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.byteLength; }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(combined);
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: apiError(expired ? "BODY_TIMEOUT" : "INVALID_JSON", expired ? 408 : 400) };
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}

export function parseTask(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const task = (value as Record<string, unknown>).task;
  return typeof task === "string" && task.trim().length > 0 && task.length <= MAX_TASK_CHARS
    ? task.trim() : null;
}

/** Prevent overlapping provider calls in a single local demo process. */
export function createExclusiveGate(busyCode = "COMPILATION_BUSY") {
  let busy = false;
  return async (work: () => Promise<Response>): Promise<Response> => {
    if (busy) return apiError(busyCode, 429);
    busy = true;
    try { return await work(); } finally { busy = false; }
  };
}
