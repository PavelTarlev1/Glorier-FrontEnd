// Shared city geocoding — via our backend's Nominatim proxy — used by both the
// route map (to place a picked city precisely) and the price model (to measure
// real distance between two cities in the same country, where the country-centroid
// model can't tell them apart). One module-scoped cache so both consumers share
// results instead of geocoding the same city twice.
import { useEffect, useState } from 'react';
import { COUNTRIES } from './i18n';
import { api } from './api';

export type LatLon = { lat: number; lon: number };

const geoCache = new Map<string, LatLon | null>();

export function geocodeCacheKey(city: string, countryCode: string): string {
  return `${city}, ${COUNTRIES[countryCode]?.en || countryCode}`;
}

/** Resolves a city to real coordinates (cached), falling back to `null` on a miss —
 *  callers decide their own fallback (e.g. a country centroid). */
export async function resolveCity(city: string, countryCode: string): Promise<LatLon | null> {
  if (!city) return null;
  const key = geocodeCacheKey(city, countryCode);
  const cached = geoCache.get(key);
  if (cached !== undefined) return cached;
  try {
    const hit = await api.geocode(key);
    geoCache.set(key, hit);
    return hit;
  } catch {
    return null;
  }
}

/** Resolves to city coordinates when a city is given and geocodes successfully,
 *  otherwise the country centroid — so the map always has somewhere to point. */
export function useGeocodedPoint(city: string, countryCode: string): LatLon {
  const centroid = { lat: COUNTRIES[countryCode].lat, lon: COUNTRIES[countryCode].lon };
  const [point, setPoint] = useState<LatLon>(centroid);

  useEffect(() => {
    if (!city) {
      setPoint(centroid);
      return;
    }
    let cancelled = false;
    resolveCity(city, countryCode).then((hit) => {
      if (!cancelled) setPoint(hit || centroid);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, countryCode]);

  return point;
}
