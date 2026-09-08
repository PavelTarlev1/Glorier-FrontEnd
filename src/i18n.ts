import type { Lang } from './types';

export interface CountryInfo {
  en: string;
  bg: string;
  lat: number;
  lon: number;
}

export const COUNTRIES: Record<string, CountryInfo> = {
  AT: { en: 'Austria', bg: 'Австрия', lat: 47.5162, lon: 14.5501 },
  BE: { en: 'Belgium', bg: 'Белгия', lat: 50.5039, lon: 4.4699 },
  BG: { en: 'Bulgaria', bg: 'България', lat: 42.7339, lon: 25.4858 },
  CH: { en: 'Switzerland', bg: 'Швейцария', lat: 46.8182, lon: 8.2275 },
  CZ: { en: 'Czechia', bg: 'Чехия', lat: 49.8175, lon: 15.4730 },
  DE: { en: 'Germany', bg: 'Германия', lat: 51.1657, lon: 10.4515 },
  DK: { en: 'Denmark', bg: 'Дания', lat: 56.2639, lon: 9.5018 },
  EE: { en: 'Estonia', bg: 'Естония', lat: 58.5953, lon: 25.0136 },
  ES: { en: 'Spain', bg: 'Испания', lat: 40.4637, lon: -3.7492 },
  FI: { en: 'Finland', bg: 'Финландия', lat: 61.9241, lon: 25.7482 },
  FR: { en: 'France', bg: 'Франция', lat: 46.6034, lon: 1.8883 },
  GB: { en: 'England', bg: 'Англия', lat: 55.3781, lon: -3.4360 },
  GR: { en: 'Greece', bg: 'Гърция', lat: 39.0742, lon: 21.8243 },
  HR: { en: 'Croatia', bg: 'Хърватия', lat: 45.1000, lon: 15.2000 },
  HU: { en: 'Hungary', bg: 'Унгария', lat: 47.1625, lon: 19.5033 },
  IE: { en: 'Ireland', bg: 'Ирландия', lat: 53.4129, lon: -8.2439 },
  IT: { en: 'Italy', bg: 'Италия', lat: 41.8719, lon: 12.5674 },
  LU: { en: 'Luxembourg', bg: 'Люксембург', lat: 49.8153, lon: 6.1296 },
  MT: { en: 'Malta', bg: 'Малта', lat: 35.9375, lon: 14.3754 },
  NL: { en: 'Netherlands', bg: 'Нидерландия', lat: 52.1326, lon: 5.2913 },
  NO: { en: 'Norway', bg: 'Норвегия', lat: 60.4720, lon: 8.4689 },
  PL: { en: 'Poland', bg: 'Полша', lat: 51.9194, lon: 19.1451 },
  PT: { en: 'Portugal', bg: 'Португалия', lat: 39.3999, lon: -8.2245 },
  SE: { en: 'Sweden', bg: 'Швеция', lat: 60.1282, lon: 18.6435 },
  SI: { en: 'Slovenia', bg: 'Словения', lat: 46.1512, lon: 14.9955 },
  SK: { en: 'Slovakia', bg: 'Словакия', lat: 48.6690, lon: 19.6990 },
};

/** Capital city per country — used to star it at the top of the city picker. */
export const CAPITALS: Record<string, string> = {
  AT: 'Vienna', BE: 'Brussels', BG: 'Sofia', CH: 'Bern', CZ: 'Prague', DE: 'Berlin',
  DK: 'Copenhagen', EE: 'Tallinn', ES: 'Madrid', FI: 'Helsinki', FR: 'Paris', GB: 'London',
  GR: 'Athens', HR: 'Zagreb', HU: 'Budapest', IE: 'Dublin', IT: 'Rome', LU: 'Luxembourg City',
  MT: 'Valletta', NL: 'Amsterdam', NO: 'Oslo', PL: 'Warsaw', PT: 'Lisbon', SE: 'Stockholm',
  SI: 'Ljubljana', SK: 'Bratislava',
};

export const CAT_ORDER = ['7.5T', '12T', '16T', '18T', '18T2D', '26T', '26T2D', '40T'] as const;

/** "Доп. инфо" service tags, straight from the real TMS export's values (combinable). */
export const SERVICE_TAGS = ['directDelivery', 'express', 'standardFtl', 'groupage'] as const;
export type ServiceTagKey = (typeof SERVICE_TAGS)[number];
export const SERVICE_TAG_LABELS: Record<ServiceTagKey, { en: string; bg: string }> = {
  directDelivery: { en: 'Direct delivery', bg: 'Директна доставка' },
  express: { en: 'Express transport', bg: 'Експресен транспорт' },
  standardFtl: { en: 'Standard FTL', bg: 'Стандартен FTL' },
  groupage: { en: 'Groupage', bg: 'Групаж' },
};
/** Price multiplier per service tag, applied on top of the base freight price
 *  (stacked when combined, e.g. "Директна доставка, Експресен транспорт" — a
 *  real combination in the TMS data). Measured directly from the TMS export —
 *  median €/km for shipments carrying each tag, versus the overall median
 *  (783 usable records): none 0.98×, express 1.01×, direct delivery 1.08×,
 *  standard FTL 1.06×, groupage 0.60×. Express turned out to carry almost no
 *  real premium despite the assumption it would — groupage's discount is far
 *  larger than a guess would suggest (shared truck, lower cost per shipment). */
// Revised via matched pairs: for each real loading→unloading relation, compare
// the median €/km of tagged shipments against untagged ones on that *same*
// relation (any category) — isolates the tag's own effect from which routes
// happen to carry it, unlike a single global-average comparison. standardFtl
// (+42%, 6/6 relations agree) and express (+16%, 9/11 agree) both turned out
// much larger than the earlier unmatched-average figures — too few samples per
// relation had washed the real effect out. directDelivery stayed inconclusive
// (only 3 relations, mixed direction) so it's kept as a rough estimate, not a
// measured one. groupage's -40% predates matched-pairs (its route-level data
// is too thin — 3 relations, n=2-4 each) but is kept — it matches the economics
// of a shared truck directly, which the data isn't strong enough to overrule.
export const SERVICE_TAG_PRICE_MULT: Record<ServiceTagKey, number> = {
  directDelivery: 1.08,
  express: 1.16,
  standardFtl: 1.42,
  groupage: 0.6,
};
// Tail-lift premium, same matched-pairs method: median €/km for shipments marked
// "Падащ борд" vs. unmarked ones on the same relation, weighted across 12
// different relations (9 of 12 agree on direction) — +15%, a real premium bigger
// than the earlier single unmatched global comparison (1.68 vs 1.55 €/km) suggested.
export const TAIL_LIFT_PRICE_MULT = 1.15;
export const ROAD_FACTOR = 1.25;

/** ISO 3166-1 alpha-2 → flag emoji, built from regional indicator symbols
 *  (no image assets, no external requests). GB renders as the UK flag. */
export function flagEmoji(countryCode: string): string {
  return String.fromCodePoint(...[...countryCode.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)));
}

type StrEntry = { en: string; bg: string };

const STR: Record<string, StrEntry> = {
  tagline: { en: 'Route price estimator for road freight', bg: 'Калкулатор за цени на автомобилен транспорт' },
  how: { en: 'How it works', bg: 'Как работи' },
  themeLight: { en: 'Light theme', bg: 'Светла тема' },
  themeDark: { en: 'Dark theme', bg: 'Тъмна тема' },
  themeSystem: { en: 'Match system', bg: 'Както системата' },
  navCalc: { en: 'Calculator', bg: 'Калкулатор' },
  formTitle: { en: 'Route', bg: 'Маршрут' },
  fromTitle: { en: 'From', bg: 'От къде' },
  toTitle: { en: 'To', bg: 'До къде' },
  vehicleTitle: { en: 'Vehicle & transit info', bg: 'Превозно средство и превоз' },
  loading: { en: 'Loading country', bg: 'Държава на товарене' },
  unloading: { en: 'Unloading country', bg: 'Държава на разтоварване' },
  cityLoading: { en: 'City (optional)', bg: 'Град (по избор)' },
  cityUnloading: { en: 'City (optional)', bg: 'Град (по избор)' },
  postLoading: { en: 'Postal code (optional)', bg: 'Пощ. код (по избор)' },
  postUnloading: { en: 'Postal code (optional)', bg: 'Пощ. код (по избор)' },
  cityPh: { en: 'Pick from list or type any city', bg: 'Избери от списък или въведи град' },
  postPh: { en: 'Type or pick a postcode', bg: 'Въведи или избери пощ. код' },
  cityNone: { en: '— none —', bg: '— няма —' },
  cityOther: { en: '+ Other city (type it)', bg: '+ Друг град (въведи)' },
  cityCustomPh: { en: 'Type city name', bg: 'Въведи име на град' },
  cityBackToList: { en: 'Back to list', bg: 'Обратно към списъка' },
  companyLoading: { en: 'Company (optional)', bg: 'Фирма (по избор)' },
  companyUnloading: { en: 'Company (optional)', bg: 'Фирма (по избор)' },
  companyPh: { en: 'consignee / sender name', bg: 'име на получател / изпращач' },
  swap: { en: 'Swap loading / unloading', bg: 'Размени товарене / разтоварване' },
  vehicle: { en: 'Vehicle category', bg: 'Категория превозно средство' },
  transitType: { en: 'Transit type', bg: 'Вид превоз' },
  transitOwn: { en: 'Own fleet', bg: 'Собствен транспорт' },
  transitSold: { en: 'Subcontracted / brokered', bg: 'Продаден (подизпълнител)' },
  serviceTagsLabel: { en: 'Service (optional)', bg: 'Услуга (по избор)' },
  tailLift: { en: 'Tail lift required', bg: 'Падащ борд' },
  serviceTagsPriceHint: { en: 'Effect on freight price (measured from real data): __PCT__%', bg: 'Ефект върху навлото (измерено от реални данни): __PCT__%' },
  shipDate: { en: 'Loading date', bg: 'Дата на товарене' },
  shipTime: { en: 'Loading time', bg: 'Час на товарене' },
  manualDistance: { en: 'Distance override (km, optional)', bg: 'Ръчно разстояние (км, по избор)' },
  manualBadge: { en: 'manual', bg: 'ръчно' },
  manualDistanceHint: { en: 'auto-calculated: __N__ km — leave empty to use it', bg: 'автоматично изчислено: __N__ км — остави празно за да го ползваш' },
  manualPrice: { en: '"Навло" override (EUR, optional)', bg: 'Ръчно навло (EUR, по избор)' },
  manualPriceHint: {
    en: 'model estimate: __N__ EUR — a flat rate is inherently a rough median, not a quote for this exact shipment; enter the real known price here to use it instead',
    bg: 'изчислено от модела: __N__ EUR — ставката е медиана и по природа е приблизителна за конкретен превоз; въведи реалната позната цена тук, за да я ползваш вместо това',
  },
  manualPriceHintNoModel: { en: 'no model estimate available for this route/category yet', bg: 'все още няма изчислена ставка за тази релация/категория' },
  extrasLegend: { en: 'Optional extras', bg: 'Допълнителни (по избор)' },
  emptyKm: { en: 'Empty km before loading', bg: 'Празни километри преди товарене' },
  deviationKm: { en: 'Route deviation (km)', bg: 'Отклонение от пътя (км)' },
  deviationKmHint: { en: 'extra km for stops/detours off the direct route — added to distance and price', bg: 'допълнителни км за спирки/отклонения от прекия път — добавят се към разстоянието и цената' },
  extraCost: { en: 'Additional costs (EUR)', bg: 'Допълнителни разходи (EUR)' },
  extraCostHint: { en: 'e.g. waiting time, ADR, pallets', bg: 'напр. престой, ADR, палети' },
  tollCost: { en: 'Toll / highway taxes (EUR)', bg: 'Пътни такси / винетки (EUR)' },
  tollHint: {
    en: 'Not pre-filled — "Навло" already reflects typical toll costs from real historical prices. Fill this in only for a toll beyond that norm (~__N__ EUR/national rate, for reference)',
    bg: 'Не се попълва автоматично — "Навло" вече отразява типичните пътни такси от реални исторически цени. Попълни само за такса извън обичайното (~__N__ EUR/национална ставка, за ориентир)',
  },
  bridgeCost: { en: 'Bridges / tunnels (EUR)', bg: 'Мостове / тунели (EUR)' },
  ferryCost: { en: 'Ferry ticket (EUR)', bg: 'Билет за ферибот (EUR)' },
  bridgeFerryHint: {
    en: '"Навло" already reflects typical costs for a route that needs one — add a crossing here only for a cost beyond the norm',
    bg: '"Навло" вече отразява типичните разходи за релация, която го изисква — добави тук само разход извън обичайното',
  },
  bridgeHintWithName: { en: 'Includes __NAME__ — edit freely', bg: 'Включва __NAME__ — редактируемо' },
  crossingNamePh: { en: 'name (e.g. Mont Blanc Tunnel)', bg: 'име (напр. тунел Мон Блан)' },
  addBridge: { en: '+ Add bridge / tunnel', bg: '+ Добави мост / тунел' },
  addFerry: { en: '+ Add ferry crossing', bg: '+ Добави ферибот' },
  removeCrossing: { en: 'Remove', bg: 'Премахни' },
  crossingsTotal: { en: 'Total: __SUM__ EUR', bg: 'Общо: __SUM__ EUR' },
  ferryWeightKg: { en: 'Cargo weight for ferry fare (kg, optional)', bg: 'Тегло на товара за ферибота (кг, по избор)' },
  ferryWeightHint: { en: 'Heavier loads carry a ferry weight surcharge: +15% over 10,000 kg, +30% over 24,000 kg', bg: 'По-тежките товари носят надбавка на ферибота: +15% над 10 000 кг, +30% над 24 000 кг' },
  customsCost: { en: 'Customs clearance (EUR)', bg: 'Митническо оформяне (EUR)' },
  customsHintCrosses: {
    en: 'Route crosses an EU customs border — typically already reflected in "Навло" for real relations like this; fill in only for clearance costs beyond that (~__N__ EUR, for reference; not duty/VAT)',
    bg: 'Релацията пресича митническа граница на ЕС — обичайно вече е отразено в "Навло" за реални релации като тази; попълни само за разходи извън обичайното (~__N__ EUR, за ориентир; не мито/ДДС)',
  },
  customsHintNone: { en: 'No customs border on this route (EU↔EU or domestic)', bg: 'Няма митническа граница по тази релация (ЕС↔ЕС или вътрешна)' },
  calcBtn: { en: 'Calculate', bg: 'Изчисли' },
  liveCalcNote: { en: 'Updates instantly as you change any field', bg: 'Обновява се мигновено при всяка промяна' },

  emptyTitle: { en: 'No route calculated yet', bg: 'Все още няма изчислен маршрут' },
  emptySub: { en: 'Fill in the route on the left and press Calculate to get a price estimate.', bg: 'Попълнете маршрута отляво и натиснете Изчисли за оценка на цената.' },
  distance: { en: 'Distance', bg: 'Разстояние' },
  pricePerKm: { en: 'Price / km', bg: 'Цена / км' },
  estPrice: { en: 'Estimated price', bg: 'Очаквана цена' },
  priceRange: { en: 'Price range', bg: 'Ценови диапазон' },
  confHigh: { en: 'High confidence', bg: 'Висока сигурност' },
  confMedium: { en: 'Medium confidence', bg: 'Средна сигурност' },
  confLow: { en: 'Low confidence', bg: 'Ниска сигурност' },
  srcRouteCat: { en: 'based on __N__ past shipments on this exact route with this vehicle category', bg: 'базирано на __N__ реални превоза по тази релация с тази категория' },
  srcRoute: { en: 'based on __N__ past shipments on this route (all vehicle categories)', bg: 'базирано на __N__ реални превоза по тази релация (всички категории)' },
  srcCat: { en: 'no data for this route yet — based on __N__ shipments for this vehicle category, all routes', bg: 'няма данни за тази релация — базирано на __N__ превоза за тази категория, всички релации' },
  srcOverall: { en: 'no matching data — based on the overall average of __N__ shipments', bg: 'няма съвпадащи данни — базирано на общата средна стойност от __N__ превоза' },

  breakdown: { en: 'Cost breakdown', bg: 'Разбивка на цената' },
  lineFreight: { en: 'Freight (distance × rate)', bg: 'Навло (разстояние × ставка)' },
  lineFreightModel: { en: 'model estimate (for comparison)', bg: 'изчислено от модела (за сравнение)' },
  lineEmpty: { en: 'Empty-run repositioning (est.)', bg: 'Празен пробег (оценка)' },
  lineExtra: { en: 'Additional costs', bg: 'Допълнителни разходи' },
  lineToll: { en: 'Toll / highway taxes', bg: 'Пътни такси / винетки' },
  lineBridge: { en: 'Bridges / tunnels', bg: 'Мостове / тунели' },
  lineFerry: { en: 'Ferry ticket', bg: 'Билет за ферибот' },
  lineCustoms: { en: 'Customs clearance', bg: 'Митническо оформяне' },
  ferryWeightNote: { en: '↳ incl. weight surcharge for', bg: '↳ вкл. надбавка за тегло за' },
  ferryWaitLine: { en: '↳ wait before boarding', bg: '↳ изчакване преди качване' },
  ferryCrossingLine: { en: '↳ time on board (dock to dock)', bg: '↳ време на борда (кей до кей)' },
  lineTotal: { en: 'Total', bg: 'Общо' },
  copyBtn: { en: 'Copy summary', bg: 'Копирай резюме' },
  copiedBtn: { en: 'Copied', bg: 'Копирано' },
  saveBtn: { en: 'Save calculation', bg: 'Запази изчислението' },
  savingBtn: { en: 'Saving…', bg: 'Запазване…' },

  drivingTitle: { en: 'Driving time & arrival', bg: 'Време за път и пристигане' },
  drivingHoursLabel: { en: '__H__h driving (avg. __SPEED__ km/h)', bg: '__H__ ч. шофиране (ср. __SPEED__ км/ч)' },
  drivingSameDay: { en: 'Feasible within a single driving day (EU 9h/day rule)', bg: 'Изпълнимо в рамките на един работен ден (правило ЕС 9ч/ден)' },
  drivingNeedsRest: { en: '__N__ overnight rest stop(s) required — __DAYS__ driving days under the EU 9h/day rule', bg: 'Необходими __N__ нощувки на трасето — __DAYS__ дни шофиране по правилото на ЕС за 9ч/ден' },
  shippedLabel: { en: 'Shipped', bg: 'Тръгва на' },
  arrivalLabel: { en: 'Est. arrival', bg: 'Очаквано пристигане' },
  ferryChannel: { en: 'Requires a Channel crossing (ferry/Eurotunnel) — ~__H__h total incl. boarding wait', bg: 'Изисква прекосяване на Ла Манш (ферибот/Евротунел) — общо ~__H__ч вкл. изчакване за качване' },
  ferryIreland: { en: 'Requires a ferry crossing to/from Ireland — ~__H__h total incl. wait for next sailing', bg: 'Изисква ферибот до/от Ирландия — общо ~__H__ч вкл. изчакване за следващ курс' },
  ferryMalta: { en: 'Requires sea freight/ferry to Malta — ~__H__h total, sailings are infrequent', bg: 'Изисква морски/фериботен превоз до Малта — общо ~__H__ч, курсовете са редки' },
  ferryItGr: { en: 'Commonly shipped via the IT↔GR Adriatic ferry — ~__H__h total incl. wait (land detour via the Balkans also possible)', bg: 'Обичайно се превозва с ферибот IT↔GR през Адриатика — общо ~__H__ч вкл. изчакване (възможен е и обиколен път по сушата през Балканите)' },
  ferryFinEst: { en: 'Requires the Helsinki–Tallinn ferry — no land route avoids Russia — ~__H__h total incl. wait', bg: 'Изисква ферибот Хелзинки–Талин — няма път по сушата, който да заобиколи Русия — общо ~__H__ч вкл. изчакване' },
  ferryItHr: { en: 'Commonly shipped via the Ancona–Split Adriatic ferry — ~__H__h total incl. wait (land route via Slovenia/Balkans also possible)', bg: 'Обичайно се превозва с ферибот Анкона–Сплит през Адриатика — общо ~__H__ч вкл. изчакване (възможен е и път по сушата през Словения/Балканите)' },
  ferrySeFi: { en: 'Commonly shipped via the Umeå–Vaasa ferry — ~__H__h total incl. wait (land route around the Gulf of Bothnia is a huge detour)', bg: 'Обичайно се превозва с ферибот Умео–Ваза — общо ~__H__ч вкл. изчакване (пътят по сушата около Ботническия залив е огромно заобикаляне)' },

  histTitle: { en: 'Matching shipments in the data', bg: 'Съвпадащи превози в данните' },
  histMeta: { en: 'Showing __SHOWN__ of __TOTAL__ matching shipments, most recent first', bg: 'Показани __SHOWN__ от __TOTAL__ съвпадащи превоза, най-новите първо' },
  histEmpty: { en: 'No individual shipment records match this exact route yet.', bg: 'Все още няма индивидуални превози, съвпадащи точно с тази релация.' },
  colDate: { en: 'Month', bg: 'Месец' },
  colRoute: { en: 'Route', bg: 'Релация' },
  colVehicle: { en: 'Vehicle', bg: 'Превозно ср.' },
  colDist: { en: 'Km', bg: 'Км' },
  colPrice: { en: 'Price', bg: 'Цена' },

  savedTitle: { en: 'Saved calculations', bg: 'Запазени изчисления' },
  savedEmpty: { en: 'Nothing saved yet — calculations your team saves will appear here for everyone.', bg: 'Все още няма запазени — изчисленията, които екипът запазва, се показват тук за всички.' },
  savedShared: { en: 'Shared across the team — stored on the server, not just this browser.', bg: 'Споделено между екипа — съхранява се на сървъра, не само в този браузър.' },
  reuseBtn: { en: 'Use again', bg: 'Използвай отново' },
  savedRouteLabel: { en: 'Route', bg: 'Маршрут' },
  savedCompanyLabel: { en: 'Companies', bg: 'Фирми' },

  companySearchTitle: { en: 'Search past shipments', bg: 'Търсене в минали превози' },
  companySearchSub: { en: 'Find what was shipped with a company, or all past loads on a route — searches __N__ real historical records plus your team’s saved quotes.', bg: 'Намери какво е превозвано с дадена фирма, или всички минали товари по релация — търси в __N__ реални исторически записа плюс запазените оферти на екипа.' },
  companySearchPh: { en: 'Company, city, country code or category…', bg: 'Фирма, град, код на държава или категория…' },
  companySearchHistTab: { en: 'Historical shipments (__N__)', bg: 'Исторически превози (__N__)' },
  companySearchSavedTab: { en: 'Saved quotes (__N__)', bg: 'Запазени оферти (__N__)' },
  companySearchEmpty: { en: 'Type a company name or route to search.', bg: 'Въведете име на фирма или релация за търсене.' },
  companySearchNoResults: { en: 'No matches found.', bg: 'Няма намерени съвпадения.' },
  colCompanyFrom: { en: 'From company', bg: 'От фирма' },
  colCompanyTo: { en: 'To company', bg: 'До фирма' },

  footerData: { en: 'Rates modeled from __N__ anonymized shipment records.', bg: 'Ставките са изчислени от __N__ анонимизирани записа за превози.' },
  footerNote: { en: 'Estimates only — not a binding quote.', bg: 'Само ориентировъчна оценка — не е обвързваща оферта.' },
  offline: { en: 'Can’t reach the server — is the backend running?', bg: 'Няма връзка със сървъра — стартиран ли е бекендът?' },

  modalTitle: { en: 'How Navlo works', bg: 'Как работи Navlo' },
  modalP1: { en: 'Navlo estimates road-freight prices from real historical shipment data, so spedition and sales teams can quote routes in seconds instead of digging through spreadsheets.', bg: 'Navlo оценява цени за автомобилен транспорт на база реални исторически данни за превози, за да могат спедитори и търговци да калкулират релации за секунди, вместо да ровят в таблици.' },
  modalH1: { en: '1. Distance', bg: '1. Разстояние' },
  modalP2: { en: 'Calculated from country centroids using the great-circle distance, scaled by ×1.25 to approximate real road routing.', bg: 'Изчислява се от географските центрове на държавите по права линия (haversine), умножено по ×1.25, за да се доближи до реален път по пътната мрежа.' },
  modalH2: { en: '2. Price / km', bg: '2. Цена / км' },
  modalP3: { en: 'Navlo looks up the median €/km from past shipments, trying the most specific match first: exact route + vehicle category → route only → vehicle category only → overall average. The confidence badge tells you which level was used.', bg: 'Navlo търси медианната €/км от минали превози, като първо пробва най-точното съвпадение: релация + категория → само релация → само категория → обща средна стойност. Индикаторът за сигурност показва кое ниво е използвано.' },
  modalH3: { en: '3. Range, not a point', bg: '3. Диапазон, не точка' },
  modalP4: { en: 'The low–high range shown is the 20th–80th percentile of comparable historical prices, so you see realistic bounds rather than false precision.', bg: 'Показаният диапазон ниска-висока е 20-ти до 80-ти персентил на сравними исторически цени, за да видите реалистични граници, а не фалшива точност.' },
  modalH4: { en: '4. Fleet + saved calculations', bg: '4. Автопарк + запазени изчисления' },
  modalP5: { en: 'Truck status and saved calculations are stored on the backend (SQLite), shared live across everyone using the tool — update a truck’s status and your colleagues see it immediately.', bg: 'Статусът на камионите и запазените изчисления се съхраняват на бекенда (SQLite) и се споделят в реално време между всички, които ползват инструмента — обновите ли статус на камион, колегите го виждат веднага.' },
  modalH5: { en: '5. Data source', bg: '5. Източник на данни' },
  modalP6: { en: 'All figures come from an anonymized export of __N__ completed shipments. No client, company or driver names are used.', bg: 'Всички стойности идват от анонимизиран експорт на __N__ завършени превоза. Не се използват имена на клиенти, фирми или шофьори.' },
};

export function makeT(lang: Lang) {
  return function t(key: string, repl?: Record<string, string | number>): string {
    const entry = STR[key];
    let s = entry ? entry[lang] : key;
    if (repl) {
      for (const k in repl) s = s.replace('__' + k + '__', String(repl[k]));
    }
    return s;
  };
}
