export interface RateEntry {
  n: number;
  avg: number;
  lo: number;
  hi: number;
}
export interface RouteCatRate extends RateEntry {
  lc: string;
  uc: string;
  cat: string;
}
export interface RouteRate extends RateEntry {
  lc: string;
  uc: string;
}
export interface CategoryRate extends RateEntry {
  cat: string;
}
/** [month ("MM.YYYY" or null), loading country, unloading country, vehicle category, distance km, price EUR, loading company, unloading company] */
export type HistoryRow = [string | null, string, string, string, number, number, string, string];
export interface CatInfo {
  payload_t: number;
  ldm: number;
}
export interface RatesData {
  overall: RateEntry;
  avg_empty_ratio: number;
  route_cat: RouteCatRate[];
  route: RouteRate[];
  category: CategoryRate[];
  cat_info: Record<string, CatInfo>;
  total_records: number;
  history: HistoryRow[];
  /** Known cities per country code, drawn from real shipment records — feeds the
   *  city pickers' suggestion list. Not exhaustive: any city can still be typed. */
  cities: Record<string, string[]>;
  /** Known postal codes per country code, same source and purpose as `cities`. */
  postcodes: Record<string, string[]>;
  /** Postcode → city, per country, from the same real records — picking a postcode
   *  from the list can fill in its city automatically. */
  postcode_city: Record<string, Record<string, string>>;
}

/** Own fleet vs. subcontracted/brokered to another carrier — mirrors the
 *  TMS export's "Собствен / Продаден" distinction. */
export type TransitType = 'own' | 'sold';

export interface Calculation {
  id: number;
  lc: string;
  uc: string;
  cat: string;
  city_from: string;
  city_to: string;
  post_from: string;
  post_to: string;
  company_from: string;
  company_to: string;
  transit_type: TransitType;
  ship_date: string;
  ship_time: string;
  arrival_date: string;
  arrival_time: string;
  distance: number;
  deviation_km: number;
  manual_distance_km: number | null;
  manual_price_avg: number | null;
  price_per_km: number;
  price_avg: number;
  price_lo: number;
  price_hi: number;
  empty_km: number;
  extra_cost: number;
  toll_cost: number;
  bridge_cost: number;
  ferry_cost: number;
  customs_cost: number;
  weight_kg: number;
  tail_lift: number;
  service_tags: string;
  total: number;
  confidence: string;
  sample_size: number;
  truck_id: number | null;
  created_at: string;
}
export interface NewCalculationInput {
  lc: string;
  uc: string;
  cat: string;
  cityFrom: string;
  cityTo: string;
  postFrom: string;
  postTo: string;
  companyFrom: string;
  companyTo: string;
  transitType: TransitType;
  shipDate: string;
  shipTime: string;
  arrivalDate: string;
  arrivalTime: string;
  distance: number;
  deviationKm: number;
  manualDistanceKm: number | null;
  manualPriceAvg: number | null;
  pricePerKm: number;
  priceAvg: number;
  priceLo: number;
  priceHi: number;
  emptyKm: number;
  extraCost: number;
  tollCost: number;
  bridgeCost: number;
  ferryCost: number;
  customsCost: number;
  /** Cargo weight (kg) — only used to scale the ferry fare's weight surcharge; no effect otherwise. */
  weightKg: number;
  tailLift: boolean;
  serviceTags: string[];
  total: number;
  confidence: string;
  sampleSize: number;
}

export type Lang = 'bg' | 'en';
export type TFunc = (key: string, repl?: Record<string, string | number>) => string;
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type RateLevel = 'routeCat' | 'route' | 'cat' | 'overall';

export interface EstimateResult {
  lc: string;
  uc: string;
  cat: string;
  cityLoading: string;
  cityUnloading: string;
  postLoading: string;
  postUnloading: string;
  companyLoading: string;
  companyUnloading: string;
  transitType: TransitType;
  shipDate: string;
  shipTime: string;
  /** Estimated arrival date+time, derived from shipDate/shipTime + real elapsed
   *  hours (driving + mandatory rests + ferry). */
  arrivalDate: string;
  arrivalTime: string;
  distance: number;
  /** Route distance before any deviation is added — either the auto country-centroid
   *  estimate, or the manual override when one is set. */
  baseDistance: number;
  /** The auto country-centroid distance, always computed, for comparison/reset. */
  autoDistance: number;
  /** Whether `baseDistance` came from a manual override rather than the auto estimate. */
  isManualDistance: boolean;
  /** Extra km for stops/detours off the direct route — added to `distance`, so it
   *  scales the freight price and driving-time estimate like real extra driving. */
  deviationKm: number;
  rate: RateEntry;
  level: RateLevel;
  confidence: ConfidenceLevel;
  /** The modeled freight price (distance × rate, before any manual override) — kept
   *  around so a manual override can still be shown next to what the model would say. */
  autoPriceAvg: number;
  /** Whether `priceAvg` came from a manual override rather than the distance×rate model. */
  isManualPrice: boolean;
  priceAvg: number;
  priceLo: number;
  priceHi: number;
  emptyKm: number;
  emptyCost: number;
  extraCost: number;
  tollCost: number;
  bridgeCost: number;
  /** Named bridge/tunnel line items behind `bridgeCost` (may be several per trip), for display. */
  bridgeItems: { label: string; amount: number }[];
  ferryCost: number;
  /** Named ferry-crossing line items behind `ferryCost` (a multi-leg journey can have more than one), for display. */
  ferryItems: { label: string; amount: number }[];
  customsCost: number;
  /** Cargo weight (kg) the user entered, 0 if not given — scales the ferry fare's weight surcharge only. */
  weightKg: number;
  total: number;
  /** Estimated hours of actual driving at typical long-haul truck speed. */
  drivingHours: number;
  /** Calendar driving days needed under the EU 9h/day driving-time rule. */
  drivingDays: number;
  /** Overnight rest stops required en route (drivingDays - 1, floored at 0). */
  overnightRests: number;
  ferry: FerryEvaluation | null;
  tailLift: boolean;
  serviceTags: string[];
}

export interface FerryEvaluation {
  required: boolean;
  crossingHours: number;
  waitHours: number;
  hours: number;
  extraDays: number;
  noteKey: 'ferryChannel' | 'ferryIreland' | 'ferryMalta' | 'ferryItGr' | 'ferryFinEst' | 'ferryItHr' | 'ferrySeFi';
}

/** One named fixed-fee crossing (a bridge, tunnel, or ferry) — several can apply to a single trip. */
export interface ChargeItem {
  id: string;
  label: string;
  amount: string;
}

export interface FormState {
  loading: string;
  unloading: string;
  cityLoading: string;
  cityUnloading: string;
  postLoading: string;
  postUnloading: string;
  companyLoading: string;
  companyUnloading: string;
  cat: string;
  transitType: TransitType;
  shipDate: string;
  shipTime: string;
  emptyKm: string;
  deviationKm: string;
  extraCost: string;
  tollCost: string;
  /** Bridges/tunnels a route can cross more than one of (e.g. Mont Blanc + Millau on the same trip) —
   *  a repeatable list rather than a single flat field; their amounts sum into the total. */
  bridgeItems: ChargeItem[];
  /** Same idea for ferry legs — a multi-hop journey can involve more than one crossing. */
  ferryItems: ChargeItem[];
  customsCost: string;
  manualDistanceKm: string;
  /** Overrides "Навло" (distance × rate) with a known real freight price — the modeled
   *  figure is still shown alongside it for comparison, never silently replaced. */
  manualPriceAvg: string;
  /** Cargo weight (kg), optional — only shown/used when a ferry crossing applies, to scale its weight surcharge. */
  weightKg: string;
  /** "Падащ борд" (tail lift) — the one real value seen in the TMS export's "Сертификат" column. */
  tailLift: boolean;
  /** "Доп. инфо" service tags — combinable, straight from the real TMS values (e.g. "Директна доставка, Експресен транспорт"). */
  serviceTags: string[];
}
