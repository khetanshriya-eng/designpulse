/**
 * GET /api/diag/resub?email=<addr>  — TEMPORARY (auth: Bearer CRON_SECRET).
 *
 * Empirically find how to resurrect a Buttondown-suppressed subscriber via the
 * API (someone who opted out and is now re-subscribing with fresh consent).
 * Tries each approach in order and reports the raw result of each, so we can
 * implement the one that actually works. Deleted after we know.
 */
import type { NextRequest } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
const API = "https://api.buttondown.com/v1";

export async function GET(req: NextRequest) {
  const denied = checkCronAuth(req);
  if (denied) return denied;
  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) return Response.json({ error: "no key" }, { status: 503 });
  const email = (new URL(req.url).searchParams.get("email") ?? "").toLowerCase();
  if (!email) return Response.json({ error: "email required" }, { status: 400 });

  const auth = { Authorization: `Token ${apiKey}` };
  const json = { ...auth, "Content-Type": "application/json" };
  const bypass = { ...json, "X-Buttondown-Bypass-Firewall": "true" };
  const enc = encodeURIComponent(email);
  const steps: Record<string, unknown> = {};

  const run = async (label: string, p: Promise<Response>) => {
    try {
      const res = await p;
      steps[label] = { status: res.status, body: (await res.text()).slice(0, 400) };
    } catch (e) {
      steps[label] = { error: (e as Error).message };
    }
  };

  // A) GET by email — is there a subscriber object at all?
  await run("A_get", fetch(`${API}/subscribers/${enc}`, { headers: auth }));

  // B) PATCH type→regular by email (the docs' recommended "update existing").
  await run(
    "B_patch_regular",
    fetch(`${API}/subscribers/${enc}`, {
      method: "PATCH",
      headers: bypass,
      body: JSON.stringify({ type: "regular" }),
    })
  );

  // C) POST create with collision-behavior: overwrite (docs' override header).
  await run(
    "C_create_overwrite",
    fetch(`${API}/subscribers`, {
      method: "POST",
      headers: { ...bypass, "X-Buttondown-Collision-Behavior": "overwrite" },
      body: JSON.stringify({ email_address: email, type: "regular" }),
    })
  );

  // D) POST create with collision-behavior: add.
  await run(
    "D_create_add",
    fetch(`${API}/subscribers`, {
      method: "POST",
      headers: { ...bypass, "X-Buttondown-Collision-Behavior": "add" },
      body: JSON.stringify({ email_address: email, type: "regular" }),
    })
  );

  // E) GET again — did C or D resurrect it?
  await run("E_get_after", fetch(`${API}/subscribers/${enc}`, { headers: auth }));

  return Response.json({ email, steps });
}
