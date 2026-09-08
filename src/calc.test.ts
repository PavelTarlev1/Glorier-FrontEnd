import { describe, it, expect } from 'vitest';
import {
  distanceKm,
  pointDistanceKm,
  evaluateDrivingTime,
  evaluateFerry,
  ferryPorts,
  estimate,
  matchingHistory,
  searchHistory,
  chargeItemsFrom,
  todayIso,
} from './calc';
import { makeRates } from './test/fixtures';

const baseInput = {
  loading: 'DE',
  unloading: 'IT',
  cat: '18T',
  emptyKm: '',
  deviationKm: '',
  extraCost: '',
  tollCost: '',
  bridgeCost: '',
  ferryCost: '',
  customsCost: '',
};

describe('distanceKm', () => {
  it('is symmetric between two countries', () => {
    expect(distanceKm('DE', 'IT')).toBe(distanceKm('IT', 'DE'));
  });

  it('floors domestic (same-country) distance at 180km rather than 0', () => {
    // Country centroid-to-itself is 0 by haversine — the floor exists so a
    // domestic route never prices as a free/zero-distance trip by default.
    expect(distanceKm('DE', 'DE')).toBe(180);
  });

  it('scales roughly with real-world separation (DE-IT further than DE-NL)', () => {
    expect(distanceKm('DE', 'IT')).toBeGreaterThan(distanceKm('DE', 'NL'));
  });
});

describe('pointDistanceKm', () => {
  it('returns 0 for identical points', () => {
    expect(pointDistanceKm({ lat: 52.5, lon: 13.4 }, { lat: 52.5, lon: 13.4 })).toBe(0);
  });

  it('is positive and symmetric for distinct points', () => {
    const a = { lat: 52.52, lon: 13.405 }; // Berlin
    const b = { lat: 48.137, lon: 11.575 }; // Munich
    const d1 = pointDistanceKm(a, b);
    const d2 = pointDistanceKm(b, a);
    expect(d1).toBeGreaterThan(0);
    expect(d1).toBe(d2);
  });
});

describe('evaluateDrivingTime', () => {
  it('needs no overnight rest for a short same-day distance', () => {
    const r = evaluateDrivingTime(300); // well under 9h*65km/h = 585km
    expect(r.drivingDays).toBe(1);
    expect(r.overnightRests).toBe(0);
  });

  it('requires overnight rests for a distance beyond one EU driving day', () => {
    const r = evaluateDrivingTime(1600); // needs 3 driving days at 585km/day cap
    expect(r.drivingDays).toBe(3);
    expect(r.overnightRests).toBe(2);
  });

  it('always reports at least 1 driving day, even for ~0 distance', () => {
    expect(evaluateDrivingTime(0).drivingDays).toBe(1);
  });
});

describe('evaluateFerry', () => {
  it('returns null for a domestic (same-country) pair', () => {
    expect(evaluateFerry('DE', 'DE')).toBeNull();
  });

  it('returns null for an ordinary land-connected pair', () => {
    expect(evaluateFerry('DE', 'FR')).toBeNull();
  });

  it('marks Channel crossings (GB) as required', () => {
    const f = evaluateFerry('DE', 'GB');
    expect(f).not.toBeNull();
    expect(f!.required).toBe(true);
    expect(f!.noteKey).toBe('ferryChannel');
  });

  it('marks Malta as required with a long wait (infrequent freight sailings)', () => {
    const f = evaluateFerry('IT', 'MT');
    expect(f!.required).toBe(true);
    expect(f!.noteKey).toBe('ferryMalta');
  });

  it('marks IT<->GR as commonly-ferried but not strictly required (land detour exists)', () => {
    const f = evaluateFerry('IT', 'GR');
    expect(f!.required).toBe(false);
    expect(f!.noteKey).toBe('ferryItGr');
  });

  it('is symmetric regardless of argument order', () => {
    expect(evaluateFerry('GB', 'DE')).toEqual(evaluateFerry('DE', 'GB'));
  });

  it('computes total hours as crossing + wait', () => {
    const f = evaluateFerry('DE', 'GB')!;
    expect(f.hours).toBe(f.crossingHours + f.waitHours);
  });
});

describe('ferryPorts', () => {
  it('returns null when there is no known crossing for the pair', () => {
    expect(ferryPorts('DE', 'FR')).toBeNull();
  });

  it('orients from/to based on which side is the loading country', () => {
    const fromGB = ferryPorts('GB', 'FR')!;
    const fromFR = ferryPorts('FR', 'GB')!;
    expect(fromGB.from).toEqual(fromFR.to);
    expect(fromGB.to).toEqual(fromFR.from);
  });
});

describe('chargeItemsFrom', () => {
  it('returns an empty list for a zero or negative amount', () => {
    expect(chargeItemsFrom(0, 'Toll')).toEqual([]);
    expect(chargeItemsFrom(-5, 'Toll')).toEqual([]);
  });

  it('wraps a positive amount into one item carrying the label and amount', () => {
    const items = chargeItemsFrom(280, 'Mont Blanc Tunnel');
    expect(items).toHaveLength(1);
    expect(items[0].label).toBe('Mont Blanc Tunnel');
    expect(items[0].amount).toBe('280');
    expect(items[0].id).toBeTruthy();
  });

  it('gives each generated item a unique id', () => {
    const a = chargeItemsFrom(10, 'A')[0];
    const b = chargeItemsFrom(10, 'B')[0];
    expect(a.id).not.toBe(b.id);
  });
});

describe('todayIso', () => {
  it('returns a well-formed YYYY-MM-DD string', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('estimate — rate fallback chain', () => {
  it('uses the exact route+category rate when available', () => {
    const rates = makeRates();
    const r = estimate(rates, { ...baseInput, loading: 'DE', unloading: 'IT', cat: '18T' });
    expect(r.level).toBe('routeCat');
    expect(r.rate.avg).toBe(1.33);
  });

  it('falls back to route-only when no exact category match exists', () => {
    const rates = makeRates();
    // DE->ES has a `route` entry but no `route_cat` entry for any category.
    const r = estimate(rates, { ...baseInput, loading: 'DE', unloading: 'ES', cat: '18T' });
    expect(r.level).toBe('route');
    expect(r.rate.avg).toBe(1.2);
  });

  it('falls back to category-only when the route is entirely unknown', () => {
    const rates = makeRates();
    const r = estimate(rates, { ...baseInput, loading: 'PL', unloading: 'SE', cat: '7.5T' });
    expect(r.level).toBe('cat');
    expect(r.rate.avg).toBe(1.16);
  });

  it('falls back to the overall average as the last resort', () => {
    const rates = makeRates();
    const r = estimate(rates, { ...baseInput, loading: 'PL', unloading: 'SE', cat: 'unknown-cat' });
    expect(r.level).toBe('overall');
    expect(r.rate.avg).toBe(1.5);
  });
});

describe('estimate — confidence levels', () => {
  it('is "high" for an exact route+category match with n>=5', () => {
    const r = estimate(makeRates(), { ...baseInput, loading: 'DE', unloading: 'IT', cat: '18T' });
    expect(r.confidence).toBe('high');
  });

  it('is "medium" for an exact route+category match with n<5', () => {
    const r = estimate(makeRates(), { ...baseInput, loading: 'DE', unloading: 'FR', cat: '18T' });
    expect(r.confidence).toBe('medium');
  });

  it('is "low" for a category-only or overall fallback', () => {
    const r = estimate(makeRates(), { ...baseInput, loading: 'PL', unloading: 'SE', cat: '7.5T' });
    expect(r.confidence).toBe('low');
  });
});

describe('estimate — directional asymmetry', () => {
  it('gives DE->IT and IT->DE genuinely different prices (real lane pricing, not a bug)', () => {
    const rates = makeRates();
    const deIt = estimate(rates, { ...baseInput, loading: 'DE', unloading: 'IT', cat: '18T' });
    const itDe = estimate(rates, { ...baseInput, loading: 'IT', unloading: 'DE', cat: '18T' });
    expect(deIt.rate.avg).not.toBe(itDe.rate.avg);
    expect(itDe.rate.avg).toBeGreaterThan(deIt.rate.avg);
  });
});

describe('estimate — service tag & tail lift multipliers', () => {
  it('increases price for standardFtl relative to no tags', () => {
    const rates = makeRates();
    const base = estimate(rates, { ...baseInput });
    const withFtl = estimate(rates, { ...baseInput, serviceTags: ['standardFtl'] });
    expect(withFtl.autoPriceAvg).toBeGreaterThan(base.autoPriceAvg);
  });

  it('decreases price for groupage relative to no tags', () => {
    const rates = makeRates();
    const base = estimate(rates, { ...baseInput });
    const withGroupage = estimate(rates, { ...baseInput, serviceTags: ['groupage'] });
    expect(withGroupage.autoPriceAvg).toBeLessThan(base.autoPriceAvg);
  });

  it('stacks tail lift on top of a service tag multiplicatively', () => {
    const rates = makeRates();
    const tagOnly = estimate(rates, { ...baseInput, serviceTags: ['standardFtl'] });
    const tagPlusLift = estimate(rates, { ...baseInput, serviceTags: ['standardFtl'], tailLift: true });
    expect(tagPlusLift.autoPriceAvg).toBeGreaterThan(tagOnly.autoPriceAvg);
  });
});

describe('estimate — distance sources & precedence', () => {
  it('uses the country-centroid distance by default', () => {
    const rates = makeRates();
    const r = estimate(rates, { ...baseInput });
    expect(r.distance).toBe(distanceKm('DE', 'IT'));
    expect(r.isRoadDistance).toBe(false);
    expect(r.isManualDistance).toBe(false);
  });

  it('prefers real road distance over the centroid approximation when given', () => {
    const rates = makeRates();
    const r = estimate(rates, { ...baseInput, roadDistanceKm: 1506 });
    expect(r.distance).toBe(1506);
    expect(r.isRoadDistance).toBe(true);
  });

  it('a manual distance override beats both the centroid estimate and road distance', () => {
    const rates = makeRates();
    const r = estimate(rates, { ...baseInput, roadDistanceKm: 1506, manualDistanceKm: '999' });
    expect(r.baseDistance).toBe(999);
    expect(r.isManualDistance).toBe(true);
  });

  it('adds route deviation on top of the base distance', () => {
    const rates = makeRates();
    const r = estimate(rates, { ...baseInput, manualDistanceKm: '1000', deviationKm: '50' });
    expect(r.distance).toBe(1050);
  });
});

describe('estimate — manual price overrides', () => {
  it('uses the modeled price when no override is set', () => {
    const rates = makeRates();
    const r = estimate(rates, { ...baseInput });
    expect(r.isManualPrice).toBe(false);
    expect(r.priceAvg).toBe(r.autoPriceAvg);
  });

  it('a manual total price ("Ръчно навло") overrides the modeled price', () => {
    const rates = makeRates();
    const r = estimate(rates, { ...baseInput, manualPriceAvg: '5000' });
    expect(r.isManualPrice).toBe(true);
    expect(r.priceAvg).toBe(5000);
  });

  it('a manual rate ("Ръчно Цена/км") sets price = distance × rate', () => {
    const rates = makeRates();
    const r = estimate(rates, { ...baseInput, manualDistanceKm: '1000', manualPricePerKm: '2.5' });
    expect(r.isManualPrice).toBe(true);
    expect(r.priceAvg).toBe(2500);
    expect(r.effectivePricePerKm).toBeCloseTo(2.5);
  });

  it('a manual total price takes precedence over a manual rate when both are set', () => {
    const rates = makeRates();
    const r = estimate(rates, {
      ...baseInput,
      manualDistanceKm: '1000',
      manualPricePerKm: '2.5', // would imply 2500
      manualPriceAvg: '5000', // should win outright
    });
    expect(r.priceAvg).toBe(5000);
  });

  it('effectivePricePerKm reflects a manual total override, not the stale model rate', () => {
    const rates = makeRates();
    const r = estimate(rates, { ...baseInput, manualDistanceKm: '1000', manualPriceAvg: '3000' });
    expect(r.effectivePricePerKm).toBeCloseTo(3.0);
    expect(r.effectivePricePerKm).not.toBe(r.rate.avg);
  });
});

describe('estimate — extras and total', () => {
  it('sums all extra costs into the total on top of priceAvg', () => {
    const rates = makeRates();
    const r = estimate(rates, {
      ...baseInput,
      manualPriceAvg: '1000',
      extraCost: '50',
      tollCost: '100',
      bridgeCost: '20',
      ferryCost: '30',
      customsCost: '90',
    });
    expect(r.total).toBe(1000 + 50 + 100 + 20 + 30 + 90);
  });

  it('filters out empty bridge/ferry line items but keeps named or nonzero ones', () => {
    const rates = makeRates();
    const r = estimate(rates, {
      ...baseInput,
      bridgeItems: [
        { label: '', amount: '0' },
        { label: 'Mont Blanc', amount: '280' },
        { label: 'Named but zero', amount: '0' },
      ],
    });
    expect(r.bridgeItems).toHaveLength(2);
    expect(r.bridgeItems.map((i) => i.label)).toEqual(['Mont Blanc', 'Named but zero']);
  });
});

describe('estimate — arrival time', () => {
  it('lands on the same day for a short same-day trip', () => {
    const rates = makeRates();
    const r = estimate(rates, { ...baseInput, manualDistanceKm: '200', shipDate: '2026-06-01', shipTime: '08:00' });
    expect(r.arrivalDate).toBe('2026-06-01');
  });

  it('pushes the arrival date forward across a UTC month/day boundary correctly', () => {
    const rates = makeRates();
    // ~1600km needs ~2 overnight rests -> should land a few days later, not
    // silently roll back a day the way a naive local-time Date conversion could.
    const r = estimate(rates, { ...baseInput, manualDistanceKm: '1600', shipDate: '2026-06-30', shipTime: '22:00' });
    expect(r.arrivalDate >= '2026-07-01').toBe(true);
  });
});

describe('matchingHistory', () => {
  it('puts exact route+category matches before route-only matches', () => {
    const rates = makeRates();
    const rows = matchingHistory(rates, 'DE', 'IT', '18T');
    expect(rows[0][3]).toBe('18T'); // exact-category row first
    expect(rows.some((r) => r[3] === '7.5T')).toBe(true); // route-only row still included, later
  });

  it('returns nothing for a route with no historical records', () => {
    const rates = makeRates();
    expect(matchingHistory(rates, 'PL', 'SE', '18T')).toEqual([]);
  });
});

describe('searchHistory', () => {
  it('matches by company name (case-insensitive)', () => {
    const rates = makeRates();
    const rows = searchHistory(rates, 'company a');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r[6].toLowerCase().includes('company a') || r[7].toLowerCase().includes('company a'))).toBe(true);
  });

  it('returns an empty list for a blank query', () => {
    expect(searchHistory(makeRates(), '   ')).toEqual([]);
  });

  it('sorts results most-recent-month first', () => {
    const rates = makeRates();
    const rows = searchHistory(rates, 'DE'); // matches loading/unloading country code too
    const months = rows.map((r) => r[0]);
    const sorted = [...months].sort().reverse();
    // Same set of months, in descending order (exact tie order between equal
    // months isn't asserted, just that later months never trail earlier ones).
    expect(months).toEqual(sorted);
  });
});
