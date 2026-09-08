import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ferryPorts } from '../calc';
import { useGeocodedPoint } from '../geocode';
import type { EstimateResult } from '../types';

// Real basemap (OpenStreetMap tiles, no API key) + actual road routes via
// OSRM's public routing demo server. Country centroids are the same ones the
// price model itself uses, so the map matches the distance shown above it.
// For a ferry crossing, instead of one straight line across the whole
// country-to-country gap, we route origin→port, draw the sea leg between the
// two real ports, then route the other port→destination — so the map reads
// as "drive to the crossing, cross, drive onward", not one long guess.
function dotIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid var(--surface);box-shadow:0 0 0 1px ${color}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}
const originIcon = dotIcon('var(--accent)');
const destIcon = dotIcon('var(--amber)');
const portIcon = L.divIcon({
  className: '',
  html: `<span style="display:block;width:9px;height:9px;border-radius:50%;background:var(--surface);border:2px solid var(--ink-faint)"></span>`,
  iconSize: [9, 9],
  iconAnchor: [4, 4],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 8 });
  }, [map, points]);
  return null;
}

async function fetchRoute(a: { lat: number; lon: number }, b: { lat: number; lon: number }, signal: AbortSignal): Promise<[number, number][] | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url, { signal });
  const data = await res.json();
  const coords = data?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
  if (!coords || coords.length < 2) return null;
  return coords.map(([lon, lat]) => [lat, lon]);
}

interface RouteMapProps {
  result: EstimateResult;
}

export default function RouteMap({ result }: RouteMapProps) {
  const origin = useGeocodedPoint(result.cityLoading, result.lc);
  const dest = useGeocodedPoint(result.cityUnloading, result.uc);
  const originPos: [number, number] = [origin.lat, origin.lon];
  const destPos: [number, number] = [dest.lat, dest.lon];
  const ports = result.ferry ? ferryPorts(result.lc, result.uc) : null;

  const [singleRoute, setSingleRoute] = useState<[number, number][] | null>(null);
  const [legToPort, setLegToPort] = useState<[number, number][] | null>(null);
  const [legFromPort, setLegFromPort] = useState<[number, number][] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSingleRoute(null);
    setLegToPort(null);
    setLegFromPort(null);
    setFailed(false);
    // Skip only when origin and destination are the *same point* (nothing to route) —
    // a domestic trip between two different cities in the same country is a real route
    // and should still be drawn, not silently dropped just because lc === uc.
    if (origin.lat === dest.lat && origin.lon === dest.lon) return;

    const controller = new AbortController();

    if (result.ferry && ports) {
      Promise.all([fetchRoute(origin, ports.from, controller.signal), fetchRoute(ports.to, dest, controller.signal)])
        .then(([toPort, fromPort]) => {
          if (toPort) setLegToPort(toPort);
          if (fromPort) setLegFromPort(fromPort);
          if (!toPort || !fromPort) setFailed(true);
        })
        .catch(() => setFailed(true));
    } else if (result.ferry) {
      setFailed(true); // ferry with no known port pair — straight fallback
    } else {
      fetchRoute(origin, dest, controller.signal)
        .then((coords) => {
          if (coords) setSingleRoute(coords);
          else setFailed(true);
        })
        .catch(() => setFailed(true));
    }

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.lc, result.uc, origin.lat, origin.lon, dest.lat, dest.lon]);

  const seaMid: [number, number] | null = ports ? [(ports.from.lat + ports.to.lat) / 2, (ports.from.lon + ports.to.lon) / 2] : null;
  const showStraightFallback = (origin.lat !== dest.lat || origin.lon !== dest.lon) && failed;
  const points: [number, number][] = [originPos, destPos, ...(ports ? [[ports.from.lat, ports.from.lon] as [number, number], [ports.to.lat, ports.to.lon] as [number, number]] : [])];

  return (
    <div className="route-map">
      <MapContainer center={originPos} zoom={5} scrollWheelZoom={false} style={{ height: 320, width: '100%', borderRadius: 8 }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <FitBounds points={points} />

        {singleRoute && <Polyline positions={singleRoute} pathOptions={{ color: 'var(--accent)', weight: 3.5, opacity: 0.85 }} />}

        {legToPort && <Polyline positions={legToPort} pathOptions={{ color: 'var(--accent)', weight: 3.5, opacity: 0.85 }} />}
        {legFromPort && <Polyline positions={legFromPort} pathOptions={{ color: 'var(--accent)', weight: 3.5, opacity: 0.85 }} />}
        {ports && (legToPort || legFromPort) && (
          <Polyline
            positions={[
              [ports.from.lat, ports.from.lon],
              [ports.to.lat, ports.to.lon],
            ]}
            pathOptions={{ color: 'var(--accent)', weight: 3, opacity: 0.75, dashArray: '2 8' }}
          />
        )}

        {showStraightFallback && (
          <Polyline positions={[originPos, destPos]} pathOptions={{ color: 'var(--accent)', weight: 3, opacity: 0.75, dashArray: '2 8' }} />
        )}

        {ports && (legToPort || legFromPort) && (
          <>
            <Marker position={[ports.from.lat, ports.from.lon]} icon={portIcon} />
            <Marker position={[ports.to.lat, ports.to.lon]} icon={portIcon} />
          </>
        )}
        {result.ferry && seaMid && (legToPort || legFromPort || showStraightFallback) && (
          <Marker
            position={showStraightFallback && !ports ? [(originPos[0] + destPos[0]) / 2, (originPos[1] + destPos[1]) / 2] : seaMid}
            icon={L.divIcon({
              className: '',
              html: `<span style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:var(--surface);border:1px solid var(--line-strong);font-size:11px;">⛴</span>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })}
          />
        )}

        <Marker position={originPos} icon={originIcon} />
        <Marker position={destPos} icon={destIcon} />
      </MapContainer>
      {result.ferry && (
        <p className="route-map-caption">
          &#9875; {result.ferry.noteKey === 'ferryChannel' ? 'Ла Манш' : result.ferry.noteKey === 'ferryIreland' ? 'Ирландско море' : result.ferry.noteKey === 'ferryMalta' ? 'до Малта' : result.ferry.noteKey === 'ferryFinEst' ? 'Финският залив' : result.ferry.noteKey === 'ferrySeFi' ? 'Ботническия залив' : 'Адриатическо море'}
          {ports ? ' — маршрут до и от пристанището, пунктираният участък е прекосяването по вода' : ' — маршрутът включва ферибот, реалният път по вода не се чертае'}
        </p>
      )}
    </div>
  );
}
