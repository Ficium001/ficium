/**
 * api/_lib/response.ts
 * ─────────────────────────────────────────────────────────────
 * Standardised HTTP response helpers for all API routes.
 * Consistent error shapes make frontend error handling trivial.
 */

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiError      = { ok: false; error: string; code?: string };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;
type Res = any;

export const Response = {
  ok<T>(res: Res, data: T, status = 200): void {
    res.status(status).json({ ok: true, data });
  },

  error(res: Res, message: string, status = 500, code?: string): void {
    res.status(status).json({ ok: false, error: message, code });
  },

  methodNotAllowed(res: Res, allowed: string[]): void {
    res.setHeader("Allow", allowed.join(", "));
    res.status(405).json({ ok: false, error: "Method not allowed" });
  },

  /** SSE helpers for streaming endpoints */
  sseStart(res: Res): void {
    res.setHeader("Content-Type",  "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection",    "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // disable Nginx buffering
  },

  sseWrite(res: Res, data: unknown): void {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  },

  sseDone(res: Res): void {
    res.write("data: [DONE]\n\n");
    res.end();
  },

  sseError(res: Res, message: string): void {
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  },
};
