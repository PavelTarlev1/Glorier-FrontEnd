import { useEffect, useState, useCallback, useMemo } from 'react';
import { makeT, CAPITALS } from './i18n';
import { api } from './api';
import { estimate, todayIso, chargeItemsFrom, pointDistanceKm } from './calc';
import { resolveCity } from './geocode';
import { bridgeTollLabel } from './tollRates';
import Header, { type ThemeMode } from './components/Header';
import RouteForm from './components/RouteForm';
import ResultPanel from './components/ResultPanel';
import HistoryTable from './components/HistoryTable';
// import SavedList from './components/SavedList'; // temporarily unused — see the History-panel note below
import CompanySearch from './components/CompanySearch';
import HowItWorksModal from './components/HowItWorksModal';
import type { Lang, FormState, RatesData, Calculation } from './types';

function readStoredLang(): Lang {
  try {
    const v = localStorage.getItem('navlo_lang');
    return v === 'en' || v === 'bg' ? v : 'bg';
  } catch {
    return 'bg';
  }
}

function readStoredTheme(): ThemeMode {
  try {
    const v = localStorage.getItem('navlo_theme');
    if (v === 'light' || v === 'dark') return v;
    // No explicit choice saved (first visit, or a leftover "system" value from
    // before that option was removed) — pick once from the OS preference as a
    // sensible starting point; it's a fixed choice from here, not live-following.
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function initialForm(): FormState {
  const loading = 'DE';
  const unloading = 'IT';
  return {
    loading,
    unloading,
    cityLoading: CAPITALS[loading] || '',
    cityUnloading: CAPITALS[unloading] || '',
    postLoading: '',
    postUnloading: '',
    companyLoading: '',
    companyUnloading: '',
    cat: '18T',
    transitType: 'sold',
    shipDate: todayIso(),
    shipTime: '08:00',
    emptyKm: '',
    deviationKm: '',
    manualDistanceKm: '',
    manualPriceAvg: '',
    weightKg: '',
    tailLift: false,
    serviceTags: [],
    extraCost: '',
    // Toll/bridge/ferry/customs are NOT auto-filled: the real TMS data backing "Навло"
    // shows these costs are already baked into the historical price for a route that
    // typically needs them (e.g. every real ferry crossing's cost sits in the source
    // data's own expense column, subtracted from — not added to — Навло for margin).
    // Auto-adding a suggested amount on top would double-count what the model already
    // reflects. These fields stay empty by default — for a genuinely extra/atypical cost
    // beyond what a normal shipment on this route would have.
    tollCost: '',
    bridgeItems: [],
    ferryItems: [],
    customsCost: '',
  };
}

export default function App() {
  const [lang, setLangState] = useState<Lang>(readStoredLang);
  const t = makeT(lang);
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('navlo_lang', l);
    } catch {
      /* ignore */
    }
  };

  const [showHow, setShowHow] = useState(false);

  const [theme, setThemeState] = useState<ThemeMode>(readStoredTheme);
  const setTheme = (m: ThemeMode) => {
    setThemeState(m);
    try {
      localStorage.setItem('navlo_theme', m);
    } catch {
      /* ignore */
    }
  };
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const [rates, setRates] = useState<RatesData | null>(null);
  const [calculations, setCalculations] = useState<Calculation[]>([]);
  const [offline, setOffline] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // The country-centroid distance model can't tell two cities in the same country
  // apart (it's 0 for a country against itself) — for a domestic route, geocode
  // both picked cities instead and use the real distance between them.
  const [domesticCityKm, setDomesticCityKm] = useState(0);
  useEffect(() => {
    const isDomestic = form.loading && form.loading === form.unloading;
    if (!isDomestic || !form.cityLoading || !form.cityUnloading || form.cityLoading === form.cityUnloading) {
      setDomesticCityKm(0);
      return;
    }
    let cancelled = false;
    Promise.all([resolveCity(form.cityLoading, form.loading), resolveCity(form.cityUnloading, form.unloading)]).then(([a, b]) => {
      if (cancelled) return;
      setDomesticCityKm(a && b ? pointDistanceKm(a, b) : 0);
    });
    return () => {
      cancelled = true;
    };
  }, [form.loading, form.unloading, form.cityLoading, form.cityUnloading]);

  const loadAll = useCallback(async () => {
    try {
      const [r, calcs] = await Promise.all([api.getRates(), api.getCalculations()]);
      setRates(r);
      setCalculations(calcs);
      setOffline(false);
    } catch (e) {
      console.error(e);
      setOffline(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Live recalculation — route, taxes, ferry and travel-time all update the
  // moment any input changes, no separate "Calculate" step required. Bridge/tunnel
  // and ferry charges are entered as named line items (a trip can cross several),
  // so their EUR amounts are summed here before feeding the pricing model.
  const result = useMemo(() => {
    if (!rates) return null;
    const bridgeCost = form.bridgeItems.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
    const ferryCost = form.ferryItems.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
    return estimate(rates, { ...form, bridgeCost, ferryCost, bridgeItems: form.bridgeItems, ferryItems: form.ferryItems, domesticCityKm });
  }, [rates, form, domesticCityKm]);

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await api.createCalculation({
        lc: result.lc,
        uc: result.uc,
        cat: result.cat,
        cityFrom: result.cityLoading,
        cityTo: result.cityUnloading,
        postFrom: result.postLoading,
        postTo: result.postUnloading,
        companyFrom: result.companyLoading,
        companyTo: result.companyUnloading,
        transitType: result.transitType,
        shipDate: result.shipDate,
        shipTime: result.shipTime,
        arrivalDate: result.arrivalDate,
        arrivalTime: result.arrivalTime,
        distance: result.distance,
        deviationKm: result.deviationKm,
        manualDistanceKm: result.isManualDistance ? result.baseDistance : null,
        manualPriceAvg: result.isManualPrice ? result.priceAvg : null,
        pricePerKm: result.rate.avg,
        priceAvg: result.priceAvg,
        priceLo: result.priceLo,
        priceHi: result.priceHi,
        emptyKm: result.emptyKm,
        extraCost: result.extraCost,
        tollCost: result.tollCost,
        bridgeCost: result.bridgeCost,
        ferryCost: result.ferryCost,
        customsCost: result.customsCost,
        weightKg: result.weightKg,
        tailLift: result.tailLift,
        serviceTags: result.serviceTags,
        total: result.total,
        confidence: result.confidence,
        sampleSize: result.rate.n,
      });
      setCalculations((c) => [saved, ...c]);
    } catch (e) {
      console.error(e);
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCalc = async (id: number) => {
    setCalculations((c) => c.filter((x) => x.id !== id));
    try {
      await api.deleteCalculation(id);
    } catch (e) {
      console.error(e);
      loadAll();
    }
  };

  const handleReuseCalc = (c: Calculation) => {
    setForm({
      loading: c.lc,
      unloading: c.uc,
      cityLoading: c.city_from || CAPITALS[c.lc] || '',
      cityUnloading: c.city_to || CAPITALS[c.uc] || '',
      postLoading: c.post_from || '',
      postUnloading: c.post_to || '',
      companyLoading: c.company_from || '',
      companyUnloading: c.company_to || '',
      cat: c.cat,
      transitType: c.transit_type,
      shipDate: c.ship_date || todayIso(),
      shipTime: c.ship_time || '08:00',
      emptyKm: c.empty_km ? String(c.empty_km) : '',
      deviationKm: c.deviation_km ? String(c.deviation_km) : '',
      manualDistanceKm: c.manual_distance_km ? String(c.manual_distance_km) : '',
      manualPriceAvg: c.manual_price_avg ? String(c.manual_price_avg) : '',
      extraCost: c.extra_cost ? String(c.extra_cost) : '',
      tollCost: c.toll_cost ? String(c.toll_cost) : '',
      // The backend only persists a flat total (no per-crossing breakdown), so a
      // reused calculation comes back as one editable line item, not the original split.
      bridgeItems: chargeItemsFrom(c.bridge_cost || 0, bridgeTollLabel(c.lc, c.uc, 'bg') || 'Мост / тунел'),
      ferryItems: chargeItemsFrom(c.ferry_cost || 0, 'Ферибот'),
      customsCost: c.customs_cost ? String(c.customs_cost) : '',
      weightKg: c.weight_kg ? String(c.weight_kg) : '',
      tailLift: !!c.tail_lift,
      serviceTags: c.service_tags ? c.service_tags.split(',').filter(Boolean) : [],
    });
  };
  // Kept defined (not deleted) for when the History panel comes back — see the
  // note by <SavedList/> below. Referenced here only so unused-locals doesn't flag them.
  void handleDeleteCalc;
  void handleReuseCalc;
  void calculations;

  if (!loaded) return null;

  return (
    <>
      <Header t={t} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} onHow={() => setShowHow(true)} />
      {offline && <div className="offline-banner">{t('offline')}</div>}
      <div className="wrap">
        <main>
          {rates && (
            <>
              <div className="grid">
                <div className="col-left">
                  <RouteForm t={t} lang={lang} form={form} setForm={setForm} rates={rates} autoPriceAvg={result?.autoPriceAvg} />
                  {/* История temporarily hidden — saving is disabled server-side right now
                      (DISABLE_DB_WRITES), so a panel that only ever shows "nothing saved yet"
                      isn't useful. Re-add <SavedList .../> here once writes are back on. */}
                </div>
                <div className="col-right">
                  <ResultPanel t={t} lang={lang} result={result} onSave={handleSave} saving={saving} saveError={saveError} />
                  {result && <HistoryTable t={t} lang={lang} rates={rates} result={result} />}
                </div>
              </div>
              <div style={{ marginTop: 20 }}>
                <CompanySearch t={t} lang={lang} rates={rates} />
              </div>
            </>
          )}
        </main>

        <footer>
          <span>{rates ? t('footerData', { N: rates.total_records }) : ''}</span>
          <span>{t('footerNote')}</span>
        </footer>
      </div>

      {showHow && <HowItWorksModal t={t} onClose={() => setShowHow(false)} totalRecords={rates?.total_records || 0} />}
    </>
  );
}
