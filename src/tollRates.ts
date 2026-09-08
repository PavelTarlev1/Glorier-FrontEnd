// Approximate real-world HGV toll cost per km, by country — Maut/vignette/péage
// systems for a laden truck (~40t, mid emission class). These are ballpark
// national averages, not a routing engine: actual cost depends on the exact
// road, axle count, emission class and time of day. Used only to pre-fill a
// sensible starting number for the "Toll / highway taxes" field — always
// editable, never presented as an exact quote.
//
// Sources (order of magnitude, EUR/km for trucks, approx. recent public rates):
//  DE Maut ~0.19–0.23, AT Asfinag Go-Maut ~0.30–0.55, CH LSVA ~0.30,
//  FR/ES/PT/IT/PL/SI/HR péage/vignette systems ~0.10–0.16,
//  CZ/SK/HU electronic vignette systems ~0.10–0.13,
//  BE/NL/LU/DK/SE/FI/NO/IE mostly untolled or flat low-cost vignette ~0.03–0.06,
//  GB largely untolled ~0.02, BG/GR/EE low vignette-based ~0.05.
export const TOLL_RATE_PER_KM: Record<string, number> = {
  AT: 0.42,
  BE: 0.05,
  BG: 0.05,
  CH: 0.30,
  CZ: 0.13,
  DE: 0.20,
  DK: 0.04,
  EE: 0.04,
  ES: 0.12,
  FI: 0.03,
  FR: 0.14,
  GB: 0.02,
  GR: 0.10,
  HR: 0.11,
  HU: 0.12,
  IE: 0.03,
  IT: 0.13,
  LU: 0.03,
  MT: 0.0,
  NL: 0.04,
  NO: 0.06,
  PL: 0.14,
  PT: 0.14,
  SE: 0.03,
  SI: 0.15,
  SK: 0.12,
};

const DEFAULT_RATE = 0.10;

export function tollRateFor(country: string): number {
  return TOLL_RATE_PER_KM[country] ?? DEFAULT_RATE;
}

// Fixed toll bridges/tunnels are flat per-crossing fees, not per-km — a per-km
// national average completely misses them. This list is deliberately not
// exhaustive: it covers the primary/well-documented crossings on real European
// freight lanes, at country-pair granularity (no real route waypoints, so a
// "domestic" entry is an approximation — not every domestic trip crosses it).
// Left out on purpose: Swiss tunnels (Gotthard, San Bernardino, Great St.
// Bernard's CH side) — already priced into the CH per-km rate via the LSVA,
// which is distance/weight-based, not a separate discrete toll; and various
// small private tunnels (e.g. Warnow/Herrentunnel in northern Germany) too
// regionally specific for a country-pair model to represent honestly.
interface BridgeToll {
  amountEur: number;
  labelBg: string;
  labelEn: string;
}
const FIXED_CROSSINGS: { test: (lc: string, uc: string) => boolean; toll: BridgeToll }[] = [
  {
    // Great Belt Fixed Link (Storebæltsbroen), Zealand↔Funen, DK — truck fee ≈ 500-600 DKK one-way.
    test: (lc, uc) => lc === uc && lc === 'DK',
    toll: { amountEur: 70, labelBg: 'Мост Стуребелт (Дания)', labelEn: 'Great Belt Bridge (Denmark)' },
  },
  {
    // Øresund Bridge (Öresundsbron), Copenhagen↔Malmö — truck fee ≈ 900-1150 SEK one-way.
    test: (lc, uc) => new Set([lc, uc]).size === 2 && new Set([lc, uc]).has('DK') && new Set([lc, uc]).has('SE'),
    toll: { amountEur: 90, labelBg: 'Мост Йоресунд (Дания–Швеция)', labelEn: 'Øresund Bridge (Denmark–Sweden)' },
  },
  {
    // Rio–Antirrio Bridge (Γέφυρα Ρίου-Αντιρρίου), connects the Peloponnese to
    // mainland Greece — on the common route toward Patras port. Truck fee ≈ €35.
    test: (lc, uc) => lc === uc && lc === 'GR',
    toll: { amountEur: 35, labelBg: 'Мост Рио–Андирио (Гърция)', labelEn: 'Rio–Antirrio Bridge (Greece)' },
  },
  {
    // Lisbon's Tagus crossings (Vasco da Gama / 25 de Abril bridges) — truck fee ≈ €15-20.
    test: (lc, uc) => lc === uc && lc === 'PT',
    toll: { amountEur: 18, labelBg: 'Мостове над Тежу, Лисабон (Португалия)', labelEn: 'Tagus bridges, Lisbon (Portugal)' },
  },
  {
    // Mont Blanc / Fréjus road tunnels — the two main Alpine truck crossings
    // between France and Italy. Notoriously expensive: heavy-truck one-way
    // toll is in the €250-300 range (vs. a car's ~€45).
    test: (lc, uc) => new Set([lc, uc]).size === 2 && new Set([lc, uc]).has('FR') && new Set([lc, uc]).has('IT'),
    toll: { amountEur: 280, labelBg: 'Тунел Мон Блан / Фрежюс (Франция–Италия)', labelEn: 'Mont Blanc / Fréjus Tunnel (France–Italy)' },
  },
  {
    // Millau Viaduct (A75), a common corridor toward Spain — truck fee ≈ €25-30.
    test: (lc, uc) => lc === uc && lc === 'FR',
    toll: { amountEur: 27, labelBg: 'Виадукт Мийо (Франция)', labelEn: 'Millau Viaduct (France)' },
  },
  {
    // Karawanken Tunnel (A11/A2), Austria↔Slovenia — a supplementary truck
    // toll on top of the standard Asfinag Go-Maut, ≈ €10-15 one-way.
    test: (lc, uc) => new Set([lc, uc]).size === 2 && new Set([lc, uc]).has('AT') && new Set([lc, uc]).has('SI'),
    toll: { amountEur: 12, labelBg: 'Тунел Караванкен (Австрия–Словения)', labelEn: 'Karawanken Tunnel (Austria–Slovenia)' },
  },
  {
    // Austrian Alpine toll tunnels (Tauern, Katschberg, Felbertauern, Arlberg) —
    // several A10/S16 corridor tunnels each carry their own supplementary
    // truck toll on top of the standard Go-Maut, individually ≈ €10-18
    // one-way. Represented as one representative domestic-AT line rather than
    // naming a single tunnel, since which one a route crosses isn't known here.
    test: (lc, uc) => lc === uc && lc === 'AT',
    toll: { amountEur: 16, labelBg: 'Алпийски тунели (Австрия, A10/S16)', labelEn: 'Alpine toll tunnels (Austria, A10/S16)' },
  },
  {
    // Great St. Bernard Tunnel, Switzerland↔Italy — one of only two year-round
    // Alpine road crossings between CH and IT (the other, Gotthard, has no
    // separate toll beyond the LSVA). Truck fee is steep, ≈ €50-60 one-way.
    test: (lc, uc) => new Set([lc, uc]).size === 2 && new Set([lc, uc]).has('CH') && new Set([lc, uc]).has('IT'),
    toll: { amountEur: 55, labelBg: 'Тунел Голям Сен Бернар (Швейцария–Италия)', labelEn: 'Great St. Bernard Tunnel (Switzerland–Italy)' },
  },
  {
    // Westerscheldetunnel (Zeeland, NL) — since Dec 2024 free for cars, but
    // tall vehicles (trucks, height >3m) still pay a separate toll on top of
    // the standard Dutch system; it's the only fixed road link across the
    // Scheldt estuary, avoiding a long detour via Antwerp. Truck fee ≈ €18-25.
    test: (lc, uc) => lc === uc && lc === 'NL',
    toll: { amountEur: 20, labelBg: 'Тунел Вестерсхелде (Нидерландия)', labelEn: 'Westerscheldetunnel (Netherlands)' },
  },
  {
    // Dartford Crossing (QE2 Bridge/tunnel), M25 — the only Thames crossing
    // east of London, used by most north–south freight routes rather than
    // driving through the city. Multi-axle HGV fee ≈ £8.40 (~€10) one-way.
    test: (lc, uc) => lc === uc && lc === 'GB',
    toll: { amountEur: 10, labelBg: 'Тунел/мост Дартфорд (Англия)', labelEn: 'Dartford Crossing (England)' },
  },
];

function bridgeTollFor(lc: string, uc: string): BridgeToll | null {
  return FIXED_CROSSINGS.find((c) => c.test(lc, uc))?.toll || null;
}

/** Per-km national toll estimate only — bridges and ferries are separate line
 *  items (see `suggestBridgeToll` / `suggestFerryCost`), so this isn't inflated
 *  by a fixed fee that belongs on its own line. */
export function suggestToll(distanceKm: number, lc: string, uc: string): number {
  const rate = (tollRateFor(lc) + tollRateFor(uc)) / 2;
  return Math.round(distanceKm * rate);
}

/** Flat bridge/tunnel toll for the route (0 if none applies) — its own editable
 *  breakdown line, not folded into the per-km toll estimate above. */
export function suggestBridgeToll(lc: string, uc: string): number {
  return bridgeTollFor(lc, uc)?.amountEur || 0;
}

/** Name of the bridge/tunnel included in the suggestion, or null. */
export function bridgeTollLabel(lc: string, uc: string, lang: 'bg' | 'en'): string | null {
  const bridge = bridgeTollFor(lc, uc);
  if (!bridge) return null;
  return lang === 'bg' ? bridge.labelBg : bridge.labelEn;
}

// Flat truck ferry-ticket estimates (one-way), by crossing — real freight-ferry
// fares run far above a car's fare (extra length/weight class). Ballpark only.
const FERRY_TICKET_EUR: Record<string, number> = {
  ferryChannel: 160, // Dover–Calais type short-sea crossing
  ferryIrelandShort: 300, // GB↔IE (e.g. Holyhead–Dublin)
  ferryIrelandLong: 600, // IE↔continental Europe direct (e.g. Rosslare–Cherbourg), overnight
  ferryMalta: 450,
  ferryItGr: 320, // Adriatic overnight line (Bari/Ancona↔Patras/Igoumenitsa)
  ferryFinEst: 180, // Helsinki↔Tallinn, short and very frequent
  ferryItHr: 280, // Ancona↔Split, overnight Adriatic line
  ferrySeFi: 220, // Umeå↔Vaasa (Wasaline/RG Line), short Gulf of Bothnia crossing
};

// RoRo freight ferries price mainly by vehicle/lane length, but heavier
// consignments (approaching max gross combination weight) commonly carry a
// weight surcharge on top of the standard truck+trailer fare.
function ferryWeightSurcharge(weightKg: number): number {
  if (weightKg > 24000) return 1.3;
  if (weightKg > 10000) return 1.15;
  return 1;
}

/** Flat ferry ticket estimate for the route (0 if no ferry applies), scaled by
 *  a weight surcharge when cargo weight is given. Mirrors the crossings
 *  `evaluateFerry` (calc.ts) identifies, priced for a truck+trailer. */
export function suggestFerryCost(lc: string, uc: string, weightKg = 0): number {
  const base = suggestFerryBaseCost(lc, uc);
  return Math.round(base * ferryWeightSurcharge(weightKg));
}

function suggestFerryBaseCost(lc: string, uc: string): number {
  const pair = new Set([lc, uc]);
  if (lc === uc) return 0;
  if (pair.has('MT')) return FERRY_TICKET_EUR.ferryMalta;
  if (pair.has('IE')) return pair.has('GB') ? FERRY_TICKET_EUR.ferryIrelandShort : FERRY_TICKET_EUR.ferryIrelandLong;
  if (pair.has('GB')) return FERRY_TICKET_EUR.ferryChannel;
  if (pair.has('IT') && pair.has('GR')) return FERRY_TICKET_EUR.ferryItGr;
  if (pair.has('FI') && pair.has('EE')) return FERRY_TICKET_EUR.ferryFinEst;
  if (pair.has('IT') && pair.has('HR')) return FERRY_TICKET_EUR.ferryItHr;
  if (pair.has('SE') && pair.has('FI')) return FERRY_TICKET_EUR.ferrySeFi;
  return 0;
}

// EU customs union membership, among the 26 countries this tool covers. Goods
// moving within the EU cross no customs border (single market). CH, GB and NO
// are each their own separate customs territory — even NO (EEA/single-market
// access) and CH (extensive bilateral deals) still require an export/import
// customs declaration at the border, unlike an EU↔EU move.
const EU_MEMBERS = new Set([
  'AT', 'BE', 'BG', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU',
  'IE', 'IT', 'LU', 'MT', 'NL', 'PL', 'PT', 'SE', 'SI', 'SK',
]);

/** The customs territory a country belongs to: 'EU' for member states, or the
 *  country's own code for a non-member (each is its own separate territory). */
function customsTerritory(country: string): string {
  return EU_MEMBERS.has(country) ? 'EU' : country;
}

/** Whether a route crosses a customs border at all (different territories on
 *  each end) — domestic moves and intra-EU moves don't. */
export function crossesCustomsBorder(lc: string, uc: string): boolean {
  return customsTerritory(lc) !== customsTerritory(uc);
}

// Flat customs clearance / brokerage fee for an export+import declaration pair
// on a standard commercial (non-ATA-carnet) consignment — ballpark agent fee,
// not the duty/VAT itself (which depends on the goods and stays out of scope
// for a freight-price estimate).
const CUSTOMS_CLEARANCE_EUR = 90;

/** Flat customs clearance estimate for the route (0 if it stays within one
 *  customs territory, e.g. EU↔EU or domestic). */
export function suggestCustomsCost(lc: string, uc: string): number {
  return crossesCustomsBorder(lc, uc) ? CUSTOMS_CLEARANCE_EUR : 0;
}
