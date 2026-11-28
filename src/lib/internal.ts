/**
 * "This is me" switch: marks a browser as the owner's/team's so their visits
 * don't count. Open any page with ?internal=on (or ?internal=off to undo);
 * the choice is kept in localStorage for that browser.
 *
 * While on: Clarity and GA don't load, and the reader-visit and click-out
 * beacons don't send. Added 2026-11-28 because most of a week's traffic was
 * our own testing.
 */
const KEY = "designator-internal";

/** Reads (and, if the URL carries ?internal=on|off, first saves) the flag. */
export function isInternal(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const param = new URLSearchParams(window.location.search).get("internal");
    if (param === "on") localStorage.setItem(KEY, "1");
    if (param === "off") localStorage.removeItem(KEY);
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
