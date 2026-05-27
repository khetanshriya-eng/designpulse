/**
 * Theme selection by visitor's local sunrise/sunset.
 *
 * Strategy: read Vercel's edge geo headers (`x-vercel-ip-latitude`,
 * `x-vercel-ip-longitude`) at request time, compute today's sunrise/sunset
 * for that coordinate, and return "dark" if the current UTC instant is
 * outside the lit window. No client JS, no flash, no localStorage —
 * the server sends pre-themed HTML.
 *
 * Falls back to a UTC-hour heuristic (6am-6pm local-ish) when geo isn't
 * available (e.g., local dev, opted-out clients, edge cache miss).
 *
 * Sun math: NOAA simplified algorithm. Accurate to ~1 minute, plenty for
 * a UI theme switcher.
 */

const RAD = Math.PI / 180;

/** Sunrise/sunset for `date` at (lat, lng), as UTC ms timestamps. */
function sunTimes(date: Date, lat: number, lng: number):
  | { rise: number; set: number }
  | null {
  // Day-of-year (1-based).
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - yearStart) / 864e5);

  // Fractional year (radians).
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);

  // Equation of time (minutes).
  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  // Solar declination (radians).
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  // Hour angle at sunrise (zenith = 90.833° accounts for refraction + sun radius).
  const cosHa =
    Math.cos(90.833 * RAD) / (Math.cos(lat * RAD) * Math.cos(decl)) -
    Math.tan(lat * RAD) * Math.tan(decl);
  if (cosHa > 1 || cosHa < -1) return null; // polar night / midnight sun

  const ha = Math.acos(cosHa) / RAD;

  // Solar noon (minutes from UTC midnight) for this longitude.
  const solarNoonMin = 720 - 4 * lng - eqtime;
  const riseMin = solarNoonMin - 4 * ha;
  const setMin = solarNoonMin + 4 * ha;

  const dayStart = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
  return {
    rise: dayStart + riseMin * 60000,
    set: dayStart + setMin * 60000,
  };
}

/**
 * Decide "light" or "dark" for the visitor.
 *
 * @param now   Current instant (defaults to Date.now()).
 * @param lat   Visitor latitude in decimal degrees (Vercel header).
 * @param lng   Visitor longitude in decimal degrees (Vercel header).
 */
export function pickTheme(
  lat: number | null,
  lng: number | null,
  now: Date = new Date()
): "light" | "dark" {
  // No geo — local dev or a request that bypassed the edge. Fall back to
  // a crude UTC-hour cutoff; not perfect but never wrong by more than a
  // few hours relative to the user's real wall clock.
  if (lat == null || lng == null || !isFinite(lat) || !isFinite(lng)) {
    const h = now.getUTCHours();
    return h < 6 || h >= 18 ? "dark" : "light";
  }

  const t = sunTimes(now, lat, lng);
  if (!t) {
    // Polar conditions. In summer polar day, default to light; winter polar
    // night, default to dark. Approximate via raw declination sign.
    const month = now.getUTCMonth(); // 0..11
    const northernSummer = month >= 3 && month <= 8;
    if (lat >= 0) return northernSummer ? "light" : "dark";
    return northernSummer ? "dark" : "light";
  }

  const nowMs = now.getTime();
  return nowMs < t.rise || nowMs >= t.set ? "dark" : "light";
}
