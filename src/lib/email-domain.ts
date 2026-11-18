/**
 * Can this email domain receive mail at all?
 *
 * Signups with a domain that has no working mail setup (typos like
 * "gmial.com", throwaway or made-up domains) can never be delivered to. They
 * don't hard-bounce either: Resend retries for ~14 hours, then reports a
 * *transient* bounce, every single day (e.g. a 2026-11 signup on a domain
 * with no reachable mail server). Rejecting them at signup stops that at the
 * source.
 *
 * Rules (RFC 5321 / 7505):
 *  - MX records with a real host        → yes
 *  - a "null MX" (single MX ".")        → no (domain declares it takes no mail)
 *  - no MX but an A/AAAA record          → yes (implicit MX)
 *  - domain does not exist / no records  → no
 *  - DNS timeout or server error         → yes (fail open: never block a real
 *                                           reader because DNS hiccuped)
 */
import { promises as dns } from "node:dns";

const TIMEOUT_MS = 3_000;
const NO_SUCH = new Set(["ENOTFOUND", "ENODATA", "NXDOMAIN"]);

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), TIMEOUT_MS)
    ),
  ]);
}

async function hasAddress(domain: string): Promise<boolean | null> {
  for (const lookup of [dns.resolve4, dns.resolve6]) {
    try {
      if ((await withTimeout(lookup(domain))).length > 0) return true;
    } catch (err) {
      if (!NO_SUCH.has((err as { code?: string }).code ?? "")) return null;
    }
  }
  return false;
}

export async function domainAcceptsMail(domain: string): Promise<boolean> {
  try {
    const mx = await withTimeout(dns.resolveMx(domain));
    const real = mx.filter((r) => r.exchange && r.exchange !== ".");
    if (real.length > 0) return true;
    if (mx.length > 0) return false; // null MX only
  } catch (err) {
    if (!NO_SUCH.has((err as { code?: string }).code ?? "")) return true; // fail open
  }
  const a = await hasAddress(domain);
  return a !== false; // null (DNS trouble) → fail open
}
