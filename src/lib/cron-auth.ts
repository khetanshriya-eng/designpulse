import { timingSafeEqual } from "node:crypto";

/**
 * Shared auth check for /api/cron/* routes.
 *
 * Returns a Response to send (503/401) when the request is not authorized,
 * or null when it is. Uses a constant-time comparison so the secret can't be
 * probed byte-by-byte via response timing (low practical risk, zero cost).
 */
export function checkCronAuth(req: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(auth);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (!ok) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
