// Real road distance via OSRM's public routing API — same server the map already
// uses to draw the route, but here we keep the actual `distance` figure (meters)
// instead of only the polyline geometry, so the price model can use a real routed
// distance instead of the haversine×1.25 straight-line approximation.
const cache = new Map<string, number | null>();

function key(a: { lat: number; lon: number }, b: { lat: number; lon: number }): string {
  return `${a.lat.toFixed(3)},${a.lon.toFixed(3)}->${b.lat.toFixed(3)},${b.lon.toFixed(3)}`;
}

/** Real road distance (km) between two points via OSRM, or null on any failure
 *  (no road connection, network error, etc.) — callers fall back to the
 *  haversine×1.25 approximation when this comes back null. */
export async function fetchRoadDistanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }, signal?: AbortSignal): Promise<number | null> {
  const k = key(a, b);
  const cached = cache.get(k);
  if (cached !== undefined) return cached;
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`;
    const res = await fetch(url, { signal });
    const data = await res.json();
    const meters = data?.routes?.[0]?.distance as number | undefined;
    const km = typeof meters === 'number' && meters > 0 ? Math.round(meters / 1000) : null;
    cache.set(k, km);
    return km;
  } catch {
    return null;
  }
}
