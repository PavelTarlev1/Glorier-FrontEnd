import { COUNTRIES, ROAD_FACTOR, SERVICE_TAG_PRICE_MULT, TAIL_LIFT_PRICE_MULT, type ServiceTagKey } from './i18n';
import type { RatesData, RateEntry, RouteCatRate, RouteRate, CategoryRate, EstimateResult, HistoryRow, RateLevel, ConfidenceLevel, TransitType, ChargeItem } from './types';

let chargeIdSeq = 0;
/** Unique id for a new bridge/tunnel/ferry line item — timestamp + counter avoids
 *  clashes even when several are added within the same millisecond. */
export const genChargeId = (): string => `c${Date.now()}-${chargeIdSeq++}`;

/** Wraps a single suggested amount (from a known toll bridge/tunnel or ferry crossing)
 *  into a one-item charge list — a starting point the user can rename, retotal, or add to. */
export function chargeItemsFrom(amount: number, label: string): ChargeItem[] {
  return amount > 0 ? [{ id: genChargeId(), label, amount: String(amount) }] : [];
}

function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Road-approximated distance (km) between two real points (e.g. geocoded cities) —
 *  same straight-line × road-factor approach as `distanceKm`, just not limited to
 *  country centroids. Used for domestic (same-country) routes, where two cities in
 *  the same country are much closer together than the country's own centroid-to-
 *  centroid distance (which is 0) would ever suggest. */
export function pointDistanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  return Math.round(haversine(a, b) * ROAD_FACTOR);
}

/** Today's date as "YYYY-MM-DD" in the viewer's *local* calendar day — not
 *  `toISOString()`, which converts to UTC first and can land on the wrong day
 *  near midnight depending on the timezone offset (e.g. UTC+3 after 21:00 UTC). */
export function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Straight-line-based route distance between two country codes (km). Exported so
 *  other estimates (e.g. toll suggestions) can reuse it without a full price calc. */
export function distanceKm(lc: string, uc: string): number {
  const a = COUNTRIES[lc];
  const b = COUNTRIES[uc];
  const straight = haversine(a, b);
  return Math.round(Math.max(straight * ROAD_FACTOR, lc === uc ? 180 : straight * ROAD_FACTOR));
}

// EU Regulation 561/2006: max 9h driving per day (10h twice a week — ignored here,
// we estimate conservatively), followed by an 11h daily rest. Average long-haul
// truck speed accounts for breaks, borders and traffic, not just cruising speed.
const EU_MAX_DAILY_DRIVING_HOURS = 9;
const EU_DAILY_REST_HOURS = 11;
const AVG_TRUCK_SPEED_KMH = 65;
const MAX_DAILY_DRIVING_KM = EU_MAX_DAILY_DRIVING_HOURS * AVG_TRUCK_SPEED_KMH;

export interface DrivingTimeEstimate {
  drivingHours: number;
  drivingDays: number;
  overnightRests: number;
}

/** Whether the driver can make it in one day under EU driving-time rules, or needs
 *  one or more overnight rest stops en route. A rough planning estimate, not a
 *  tachograph-accurate schedule (ignores loading/unloading time, breaks, borders). */
export function evaluateDrivingTime(distance: number): DrivingTimeEstimate {
  const drivingHours = distance / AVG_TRUCK_SPEED_KMH;
  const drivingDays = Math.max(1, Math.ceil(distance / MAX_DAILY_DRIVING_KM));
  const overnightRests = Math.max(0, drivingDays - 1);
  return { drivingHours, drivingDays, overnightRests };
}

// A few country pairs have no continuous road link and genuinely need a sea
// crossing (islands: GB, IE, MT), plus one well-known lane (IT↔GR) that's
// commonly shipped by ferry even though a long land detour through the
// Balkans exists. Total time = the sailing itself + an average wait for the
// next scheduled departure (frequent short-sea routes wait little; the long
// infrequent lines can add most of a day before a truck even boards).
export interface FerryEvaluation {
  required: boolean;
  crossingHours: number;
  waitHours: number;
  hours: number;
  /** Calendar days the crossing adds beyond driving time (short Channel-type hops add none). */
  extraDays: number;
  noteKey: 'ferryChannel' | 'ferryIreland' | 'ferryMalta' | 'ferryItGr' | 'ferryFinEst' | 'ferryItHr' | 'ferrySeFi';
}

function ferry(required: boolean, crossingHours: number, waitHours: number, noteKey: FerryEvaluation['noteKey']): FerryEvaluation {
  const hours = crossingHours + waitHours;
  return { required, crossingHours, waitHours, hours, extraDays: hours >= 12 ? Math.ceil(hours / 24) : 0, noteKey };
}

export function evaluateFerry(lc: string, uc: string): FerryEvaluation | null {
  if (lc === uc) return null;
  const pair = new Set([lc, uc]);

  // Frequent short-sea crossings (many sailings/day) → short average wait.
  // Infrequent long-haul freight lines (once daily or a few times/week) →
  // waiting for the next scheduled departure often costs more than the sailing.
  if (pair.has('MT')) return ferry(true, 8, 16, 'ferryMalta'); // limited freight sailings from Sicily
  if (pair.has('IE')) {
    if (pair.has('GB')) return ferry(true, 3.5, 2, 'ferryIreland'); // Dublin–Holyhead etc., several/day
    return ferry(true, 18, 6, 'ferryIreland'); // direct continental line, ~1/day
  }
  if (pair.has('GB')) return ferry(true, 1.5, 1.5, 'ferryChannel'); // Dover–Calais, sailings every 30–45min
  if (pair.has('IT') && pair.has('GR')) return ferry(false, 16, 8, 'ferryItGr'); // Adriatic overnight lines, ~daily
  // Finland↔Estonia: separated by the Gulf of Finland with no land route that
  // doesn't detour through Russia — genuinely ferry-only, unlike the other
  // Nordic/Baltic pairs which connect by land through Sweden/Denmark.
  if (pair.has('FI') && pair.has('EE')) return ferry(true, 2.5, 1.5, 'ferryFinEst'); // Helsinki–Tallinn, very frequent
  // Italy↔Croatia: a land route exists via Slovenia/Balkans, but the
  // Split–Ancona/Bari lane is the common freight shortcut across the Adriatic.
  if (pair.has('IT') && pair.has('HR')) return ferry(false, 10, 6, 'ferryItHr'); // overnight Adriatic line, few/day
  // Sweden↔Finland: a land route exists around the top of the Gulf of Bothnia
  // via northern Norway, but it's a huge detour — Umeå–Vaasa is short and frequent.
  if (pair.has('SE') && pair.has('FI')) return ferry(false, 4, 3, 'ferrySeFi'); // Umeå–Vaasa (Wasaline/RG Line), few/day
  return null;
}

export interface LatLon {
  lat: number;
  lon: number;
}

/** The two real embarkation/disembarkation ports for a ferry crossing, oriented
 *  so `from` is on the loading-country side and `to` on the unloading-country
 *  side — lets the map draw a real road route to the port, a sea segment
 *  between the two ports, then a real road route from the other port onward,
 *  instead of one straight line across the whole country-to-country distance. */
export function ferryPorts(lc: string, uc: string): { from: LatLon; to: LatLon } | null {
  const pair = new Set([lc, uc]);
  if (pair.has('MT')) {
    const valletta = { lat: 35.8961, lon: 14.5058 };
    const pozzallo = { lat: 36.7333, lon: 14.85 }; // Sicily (IT) — realistic embarkation point regardless of true origin
    return lc === 'MT' ? { from: valletta, to: pozzallo } : { from: pozzallo, to: valletta };
  }
  if (pair.has('IE')) {
    if (pair.has('GB')) {
      const holyhead = { lat: 53.3094, lon: -4.6338 };
      const dublin = { lat: 53.3498, lon: -6.2603 };
      return lc === 'GB' ? { from: holyhead, to: dublin } : { from: dublin, to: holyhead };
    }
    const rosslare = { lat: 52.2569, lon: -6.3358 };
    const cherbourg = { lat: 49.6337, lon: -1.6224 }; // continental gateway (Rosslare–Cherbourg line)
    return lc === 'IE' ? { from: rosslare, to: cherbourg } : { from: cherbourg, to: rosslare };
  }
  if (pair.has('GB')) {
    const dover = { lat: 51.1279, lon: 1.3134 };
    const calais = { lat: 50.9513, lon: 1.8587 };
    return lc === 'GB' ? { from: dover, to: calais } : { from: calais, to: dover };
  }
  if (pair.has('IT') && pair.has('GR')) {
    const bari = { lat: 41.1171, lon: 16.8719 };
    const patras = { lat: 38.2466, lon: 21.7346 };
    return lc === 'IT' ? { from: bari, to: patras } : { from: patras, to: bari };
  }
  if (pair.has('FI') && pair.has('EE')) {
    const helsinki = { lat: 60.1699, lon: 24.9384 };
    const tallinn = { lat: 59.437, lon: 24.7536 };
    return lc === 'FI' ? { from: helsinki, to: tallinn } : { from: tallinn, to: helsinki };
  }
  if (pair.has('IT') && pair.has('HR')) {
    const ancona = { lat: 43.6158, lon: 13.5189 };
    const split = { lat: 43.5081, lon: 16.4402 };
    return lc === 'IT' ? { from: ancona, to: split } : { from: split, to: ancona };
  }
  if (pair.has('SE') && pair.has('FI')) {
    const umea = { lat: 63.8258, lon: 20.263 };
    const vaasa = { lat: 63.095, lon: 21.6158 };
    return lc === 'SE' ? { from: umea, to: vaasa } : { from: vaasa, to: umea };
  }
  return null;
}

function findRateCat(rates: RatesData, lc: string, uc: string, cat: string): RouteCatRate | null {
  return rates.route_cat.find((r) => r.lc === lc && r.uc === uc && r.cat === cat) || null;
}
function findRoute(rates: RatesData, lc: string, uc: string): RouteRate | null {
  return rates.route.find((r) => r.lc === lc && r.uc === uc) || null;
}
function findCat(rates: RatesData, cat: string): CategoryRate | null {
  return rates.category.find((r) => r.cat === cat) || null;
}

export interface EstimateInput {
  loading: string;
  unloading: string;
  cat: string;
  emptyKm: string | number;
  deviationKm: string | number;
  extraCost: string | number;
  tollCost: string | number;
  bridgeCost: string | number;
  bridgeItems?: { label: string; amount: string | number }[];
  ferryCost: string | number;
  ferryItems?: { label: string; amount: string | number }[];
  customsCost: string | number;
  /** Cargo weight (kg), optional — only affects the ferry fare's weight surcharge. */
  weightKg?: string | number;
  tailLift?: boolean;
  serviceTags?: string[];
  /** Manual override for the route distance (km) — replaces the auto country-centroid
   *  estimate when set (non-empty, > 0); `deviationKm` still adds on top of it. */
  manualDistanceKm?: string | number;
  /** Real road-routed distance (km) from OSRM — the same routing the map draws, kept
   *  here instead of only using it for the polyline. Used instead of the haversine×1.25
   *  straight-line approximation whenever it's available; not used for ferry-required
   *  routes (OSRM can't route across a sea gap), where the approximation stays in effect. */
  roadDistanceKm?: number;
  /** Manual override for "Навло" (distance × rate) — replaces the modeled freight price
   *  when set (non-empty, > 0), e.g. when a known real quote should be used as-is instead
   *  of the median-based model, which can be 20-50%+ off any single real route (wide
   *  variance is inherent to a flat-rate model — see the price range shown alongside it). */
  manualPriceAvg?: string | number;
  /** Manual override for the €/km rate itself — replaces `rate.avg` when set (and
   *  `manualPriceAvg` isn't also set, which takes precedence as the more direct figure).
   *  priceAvg becomes distance × this rate, with no service-tag multiplier on top —
   *  same reasoning as manualPriceAvg: a known real rate should win over the model. */
  manualPricePerKm?: string | number;
  cityLoading?: string;
  cityUnloading?: string;
  postLoading?: string;
  postUnloading?: string;
  companyLoading?: string;
  companyUnloading?: string;
  transitType?: TransitType;
  shipDate?: string;
  shipTime?: string;
}

/** Adds a duration (hours) to a date+time, entirely in UTC — a local-time Date
 *  shifted through toISOString() can land on the wrong calendar day depending on
 *  the server's timezone offset (e.g. UTC+3 after 21:00 UTC). Returns the new
 *  "YYYY-MM-DD" and "HH:MM". */
function addHours(isoDate: string, hhmm: string, hours: number): { date: string; time: string } {
  const dparts = isoDate.split('-').map(Number);
  const tparts = (hhmm || '00:00').split(':').map(Number);
  if (dparts.length !== 3 || dparts.some(Number.isNaN)) return { date: isoDate, time: hhmm };
  const [y, m, d] = dparts;
  const [hh, mm] = tparts.length === 2 && !tparts.some(Number.isNaN) ? tparts : [0, 0];
  const dt = new Date(Date.UTC(y, m - 1, d, hh, mm));
  dt.setTime(dt.getTime() + hours * 3600_000);
  const yyyy = dt.getUTCFullYear();
  const mo = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  const oh = String(dt.getUTCHours()).padStart(2, '0');
  const om = String(dt.getUTCMinutes()).padStart(2, '0');
  return { date: `${yyyy}-${mo}-${dd}`, time: `${oh}:${om}` };
}

/** Core pricing model: exact route+category → route → category → overall fallback chain.
 *  City/company are descriptive only (free text from the user) — they label the
 *  quote and feed search, but the price model is still country + vehicle category. */
export function estimate(
  rates: RatesData,
  {
    loading,
    unloading,
    cat,
    emptyKm,
    deviationKm,
    extraCost,
    tollCost,
    bridgeCost,
    bridgeItems: bridgeItemsIn = [],
    ferryCost,
    ferryItems: ferryItemsIn = [],
    customsCost,
    weightKg,
    tailLift = false,
    serviceTags = [],
    manualDistanceKm,
    manualPriceAvg,
    manualPricePerKm,
    roadDistanceKm,
    cityLoading = '',
    cityUnloading = '',
    postLoading = '',
    postUnloading = '',
    companyLoading = '',
    companyUnloading = '',
    transitType = 'sold',
    shipDate = todayIso(),
    shipTime = '08:00',
  }: EstimateInput
): EstimateResult {
  // roadDistanceKm comes from OSRM (real road routing, the same source the map
  // uses) — it naturally comes back null/unset for a route OSRM can't drive
  // end to end (e.g. across a sea gap it doesn't know about), so the fallback
  // straight-line×1.25 approximation only kicks in when there's genuinely no
  // real routed distance yet (still loading) or available at all.
  const isRoadDistance = !!roadDistanceKm && roadDistanceKm > 0;
  const autoDistance = isRoadDistance ? roadDistanceKm! : distanceKm(loading, unloading);
  const manualOverride = parseFloat(String(manualDistanceKm));
  const isManualDistance = manualOverride > 0;
  const baseDistance = isManualDistance ? manualOverride : autoDistance;
  const deviation = parseFloat(String(deviationKm)) || 0;
  const distance = baseDistance + deviation;

  let level: RateLevel;
  let rate: RateEntry;
  const rc = findRateCat(rates, loading, unloading, cat);
  if (rc) {
    level = 'routeCat';
    rate = rc;
  } else {
    const r = findRoute(rates, loading, unloading);
    if (r) {
      level = 'route';
      rate = r;
    } else {
      const c = findCat(rates, cat);
      if (c) {
        level = 'cat';
        rate = c;
      } else {
        level = 'overall';
        rate = rates.overall;
      }
    }
  }

  let confidence: ConfidenceLevel = 'low';
  if (level === 'routeCat' && rate.n >= 5) confidence = 'high';
  else if (level === 'routeCat' || (level === 'route' && rate.n >= 5)) confidence = 'medium';

  // Service tags shift price from the base route/category rate — multiplier per
  // tag is measured from the provided TMS data (see SERVICE_TAG_PRICE_MULT), not guessed.
  // Tail lift adds its own measured +8% on top when required.
  const serviceMult = serviceTags.reduce((m, key) => m * (SERVICE_TAG_PRICE_MULT[key as ServiceTagKey] ?? 1), 1) * (tailLift ? TAIL_LIFT_PRICE_MULT : 1);
  const autoPriceAvg = distance * rate.avg * serviceMult;
  const priceLo = distance * rate.lo * serviceMult;
  const priceHi = distance * rate.hi * serviceMult;
  // A flat median €/km is, by construction, wrong for any single real route — it's
  // the middle of a wide spread (see priceLo/priceHi). When the real quoted price for
  // this exact shipment is known, it should win outright rather than the model guessing.
  const manualPriceOverride = parseFloat(String(manualPriceAvg));
  const isManualPriceTotal = manualPriceOverride > 0;
  const manualRateOverride = parseFloat(String(manualPricePerKm));
  const isManualRate = !isManualPriceTotal && manualRateOverride > 0;
  const isManualPrice = isManualPriceTotal || isManualRate;
  const priceAvg = isManualPriceTotal ? manualPriceOverride : isManualRate ? distance * manualRateOverride : autoPriceAvg;
  // The €/km stat should reflect whatever price is actually in effect — including
  // a manual override — not silently keep showing the model's rate once overridden.
  const effectivePricePerKm = distance > 0 ? priceAvg / distance : rate.avg;

  const empty = parseFloat(String(emptyKm)) || 0;
  const emptyCost = empty > 0 ? empty * rate.avg * 0.5 : 0;
  const extra = parseFloat(String(extraCost)) || 0;
  const toll = parseFloat(String(tollCost)) || 0;
  const bridge = parseFloat(String(bridgeCost)) || 0;
  const ferryTicket = parseFloat(String(ferryCost)) || 0;
  const customs = parseFloat(String(customsCost)) || 0;
  const weight = parseFloat(String(weightKg)) || 0;
  const total = priceAvg + emptyCost + extra + toll + bridge + ferryTicket + customs;
  const bridgeItems = bridgeItemsIn
    .map((it) => ({ label: it.label, amount: parseFloat(String(it.amount)) || 0 }))
    .filter((it) => it.label.trim() || it.amount > 0);
  const ferryItems = ferryItemsIn
    .map((it) => ({ label: it.label, amount: parseFloat(String(it.amount)) || 0 }))
    .filter((it) => it.label.trim() || it.amount > 0);
  const driving = evaluateDrivingTime(distance);
  const ferry = evaluateFerry(loading, unloading);
  // Real elapsed time, not just calendar days: driving hours + the mandatory
  // 11h daily rest for each overnight stop + any ferry crossing/wait time.
  const totalElapsedHours = driving.drivingHours + driving.overnightRests * EU_DAILY_REST_HOURS + (ferry?.hours || 0);
  const arrival = addHours(shipDate, shipTime, totalElapsedHours);

  return {
    lc: loading,
    uc: unloading,
    cat,
    cityLoading,
    cityUnloading,
    postLoading,
    postUnloading,
    companyLoading,
    companyUnloading,
    transitType,
    shipDate,
    shipTime,
    arrivalDate: arrival.date,
    arrivalTime: arrival.time,
    distance,
    baseDistance,
    autoDistance,
    isManualDistance,
    isRoadDistance,
    deviationKm: deviation,
    rate,
    level,
    confidence,
    autoPriceAvg,
    isManualPrice,
    priceAvg,
    priceLo,
    priceHi,
    effectivePricePerKm,
    emptyKm: empty,
    emptyCost,
    extraCost: extra,
    tollCost: toll,
    bridgeCost: bridge,
    bridgeItems,
    ferryCost: ferryTicket,
    ferryItems,
    weightKg: weight,
    customsCost: customs,
    tailLift,
    serviceTags,
    total,
    drivingHours: driving.drivingHours,
    drivingDays: driving.drivingDays,
    overnightRests: driving.overnightRests,
    ferry,
  };
}

export function matchingHistory(rates: RatesData, lc: string, uc: string, cat: string): HistoryRow[] {
  const exact: HistoryRow[] = [];
  const routeOnly: HistoryRow[] = [];
  for (const h of rates.history) {
    if (h[1] === lc && h[2] === uc) {
      if (h[3] === cat) exact.push(h);
      else routeOnly.push(h);
    }
  }
  return exact.concat(routeOnly);
}

function monthSortKey(month: string | null): string {
  if (!month || !month.includes('.')) return '0000-00';
  const [mm, yyyy] = month.split('.');
  return `${yyyy}-${mm}`;
}

/** "What has this company shipped with us before?" — searches the historical
 *  TMS records (not just saved calculator quotes) by company name, route code or
 *  vehicle category, most recent first. */
export function searchHistory(rates: RatesData, query: string): HistoryRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return rates.history
    .filter((h) => h[1].toLowerCase().includes(q) || h[2].toLowerCase().includes(q) || h[3].toLowerCase().includes(q) || h[6].toLowerCase().includes(q) || h[7].toLowerCase().includes(q))
    .sort((a, b) => monthSortKey(b[0]).localeCompare(monthSortKey(a[0])));
}
