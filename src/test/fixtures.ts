import type { RatesData } from '../types';

/** Small, hand-built RatesData fixture for unit tests — not real data, just
 *  enough shape/variety to exercise the fallback chain, confidence levels,
 *  and history search without depending on the real (782-record) rates.json. */
export function makeRates(overrides: Partial<RatesData> = {}): RatesData {
  return {
    overall: { n: 100, avg: 1.5, lo: 1.0, hi: 2.0 },
    avg_empty_ratio: 0.13,
    route_cat: [
      { lc: 'DE', uc: 'IT', cat: '18T', n: 13, avg: 1.33, lo: 0.84, hi: 1.66 },
      { lc: 'IT', uc: 'DE', cat: '18T', n: 21, avg: 1.84, lo: 1.12, hi: 2.29 },
      { lc: 'DE', uc: 'FR', cat: '18T', n: 3, avg: 1.4, lo: 1.0, hi: 1.8 }, // n<5: routeCat but only "medium"
    ],
    route: [
      { lc: 'DE', uc: 'IT', n: 20, avg: 1.34, lo: 0.85, hi: 1.66 },
      { lc: 'IT', uc: 'DE', n: 32, avg: 1.52, lo: 1.1, hi: 2.29 },
      { lc: 'DE', uc: 'ES', n: 8, avg: 1.2, lo: 0.9, hi: 1.5 }, // route-only fallback (no route_cat for this cat)
    ],
    category: [
      { cat: '18T', n: 539, avg: 1.68, lo: 1.2, hi: 2.26 },
      { cat: '7.5T', n: 93, avg: 1.16, lo: 0.92, hi: 1.56 },
    ],
    cat_info: {
      '18T': { payload_t: 10, ldm: 7.4 },
      '7.5T': { payload_t: 3.5, ldm: 6 },
    },
    total_records: 782,
    history: [
      ['07.2026', 'DE', 'IT', '18T', 1216, 1450, 'Company A', 'Company B'],
      ['06.2026', 'IT', 'DE', '18T', 1193, 2200, 'Company C', 'Company D'],
      ['06.2026', 'DE', 'IT', '7.5T', 900, 1100, 'Company A', 'Company E'],
    ],
    cities: { DE: ['Berlin', 'Munich'], IT: ['Rome', 'Milan'] },
    postcodes: { DE: ['10115'], IT: ['00100'] },
    postcode_city: { DE: { '10115': 'Berlin' }, IT: { '00100': 'Rome' } },
    ...overrides,
  };
}
