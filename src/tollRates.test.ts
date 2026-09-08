import { describe, it, expect } from 'vitest';
import { tollRateFor, suggestToll, suggestBridgeToll, bridgeTollLabel, suggestFerryCost, crossesCustomsBorder, suggestCustomsCost } from './tollRates';

describe('tollRateFor', () => {
  it('returns the known rate for a listed country', () => {
    expect(tollRateFor('AT')).toBe(0.42);
  });

  it('falls back to a default rate for an unlisted country code', () => {
    expect(tollRateFor('ZZ')).toBe(0.1);
  });
});

describe('suggestToll', () => {
  it('averages the two countries\' per-km rates and scales by distance', () => {
    // DE=0.20, IT=0.13 -> avg 0.165 * 1000km = 165
    expect(suggestToll(1000, 'DE', 'IT')).toBe(165);
  });

  it('is symmetric in country order', () => {
    expect(suggestToll(1000, 'DE', 'IT')).toBe(suggestToll(1000, 'IT', 'DE'));
  });

  it('is zero for zero distance', () => {
    expect(suggestToll(0, 'DE', 'IT')).toBe(0);
  });
});

describe('suggestBridgeToll / bridgeTollLabel', () => {
  it('returns the Mont Blanc/Fréjus toll for FR<->IT, symmetric either direction', () => {
    expect(suggestBridgeToll('FR', 'IT')).toBe(280);
    expect(suggestBridgeToll('IT', 'FR')).toBe(280);
  });

  it('returns 0 for a pair with no known fixed crossing', () => {
    expect(suggestBridgeToll('DE', 'PL')).toBe(0);
  });

  it('returns a representative domestic toll for AT (Alpine corridor tunnels)', () => {
    expect(suggestBridgeToll('AT', 'AT')).toBe(16);
  });

  it('label is null when there is no known crossing', () => {
    expect(bridgeTollLabel('DE', 'PL', 'en')).toBeNull();
  });

  it('label switches between Bulgarian and English for the same crossing', () => {
    const bg = bridgeTollLabel('FR', 'IT', 'bg');
    const en = bridgeTollLabel('FR', 'IT', 'en');
    expect(bg).not.toBe(en);
    expect(en).toMatch(/Mont Blanc/);
  });
});

describe('suggestFerryCost', () => {
  it('is 0 for a domestic or ordinary land-connected pair', () => {
    expect(suggestFerryCost('DE', 'DE')).toBe(0);
    expect(suggestFerryCost('DE', 'FR')).toBe(0);
  });

  it('returns the Channel crossing fare for GB pairs', () => {
    expect(suggestFerryCost('DE', 'GB')).toBe(160);
  });

  it('applies a weight surcharge above 24 000kg', () => {
    const base = suggestFerryCost('DE', 'GB', 5000);
    const heavy = suggestFerryCost('DE', 'GB', 25000);
    expect(heavy).toBeGreaterThan(base);
    expect(heavy).toBe(Math.round(160 * 1.3));
  });

  it('applies a smaller surcharge for the 10-24t band', () => {
    expect(suggestFerryCost('DE', 'GB', 15000)).toBe(Math.round(160 * 1.15));
  });
});

describe('crossesCustomsBorder / suggestCustomsCost', () => {
  it('does not cross a customs border between two EU members', () => {
    expect(crossesCustomsBorder('DE', 'IT')).toBe(false);
    expect(suggestCustomsCost('DE', 'IT')).toBe(0);
  });

  it('does not cross a customs border domestically', () => {
    expect(crossesCustomsBorder('DE', 'DE')).toBe(false);
  });

  it('crosses a customs border between the EU and GB', () => {
    expect(crossesCustomsBorder('DE', 'GB')).toBe(true);
    expect(suggestCustomsCost('DE', 'GB')).toBe(90);
  });

  it('crosses a customs border between two non-EU territories (CH and GB)', () => {
    expect(crossesCustomsBorder('CH', 'GB')).toBe(true);
  });

  it('crosses a customs border between EU and Norway despite EEA access', () => {
    expect(crossesCustomsBorder('DE', 'NO')).toBe(true);
  });
});
