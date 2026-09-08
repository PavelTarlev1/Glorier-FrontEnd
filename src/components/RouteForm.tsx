import { COUNTRIES, CAT_ORDER, CAPITALS, SERVICE_TAGS, SERVICE_TAG_LABELS, SERVICE_TAG_PRICE_MULT, TAIL_LIFT_PRICE_MULT, flagEmoji } from '../i18n';
import { distanceKm, evaluateFerry, genChargeId } from '../calc';
import { suggestToll, suggestBridgeToll, suggestFerryCost, bridgeTollLabel, suggestCustomsCost, crossesCustomsBorder } from '../tollRates';
import { SwapIcon } from '../icons';
import CityPicker from './CityPicker';
import type { Lang, TFunc, FormState, RatesData, TransitType } from '../types';

function countryLabel(code: string, lang: Lang): string {
  return `${flagEmoji(code)} ${COUNTRIES[code][lang]} (${code})`;
}

interface RouteFormProps {
  t: TFunc;
  lang: Lang;
  form: FormState;
  setForm: (updater: (f: FormState) => FormState) => void;
  rates: RatesData;
  /** The modeled "Навло" (distance × rate) for the current inputs, before any manual
   *  override — shown next to the override field so the model's own number stays visible. */
  autoPriceAvg?: number;
}

export default function RouteForm({ t, lang, form, setForm, rates, autoPriceAvg }: RouteFormProps) {
  const codes = Object.keys(COUNTRIES).sort((a, b) => COUNTRIES[a][lang].localeCompare(COUNTRIES[b][lang]));

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  // Route changes default the city to the new country's capital whenever the
  // current pick doesn't belong to it — the city field always has a real
  // selection, never blank. Toll/bridge/ferry/customs are deliberately NOT
  // auto-filled here (see note by their fields below) — they'd double-count
  // costs the historical rate already reflects for a route that typically needs them.
  const updateRoute = (patch: Partial<FormState>) =>
    setForm((f) => {
      const next = { ...f, ...patch };
      if (patch.loading && !(rates.cities[next.loading] || []).includes(next.cityLoading)) {
        next.cityLoading = CAPITALS[next.loading] || '';
      }
      if (patch.unloading && !(rates.cities[next.unloading] || []).includes(next.cityUnloading)) {
        next.cityUnloading = CAPITALS[next.unloading] || '';
      }
      return next;
    });

  const ferry = evaluateFerry(form.loading, form.unloading);

  // Cargo weight only rescales an already-present ferry line item's amount (by the
  // weight surcharge) — it never adds one on its own; ferry cost stays opt-in.
  const updateWeight = (weightKg: string) => {
    setForm((f) => {
      if (!f.ferryItems.length) return { ...f, weightKg };
      const suggested = suggestFerryCost(f.loading, f.unloading, parseFloat(weightKg) || 0);
      const items = [...f.ferryItems];
      items[0] = { ...items[0], amount: String(suggested) };
      return { ...f, weightKg, ferryItems: items };
    });
  };

  // "+ Add" pre-fills the new row with the known suggested crossing (if any) so the
  // ballpark figure is one click away — but it's never inserted automatically.
  const addBridgeItem = () =>
    setForm((f) => ({
      ...f,
      bridgeItems: [
        ...f.bridgeItems,
        f.bridgeItems.length === 0 && suggestBridgeToll(f.loading, f.unloading) > 0
          ? { id: genChargeId(), label: bridgeTollLabel(f.loading, f.unloading, lang) || t('bridgeCost'), amount: String(suggestBridgeToll(f.loading, f.unloading)) }
          : { id: genChargeId(), label: '', amount: '0' },
      ],
    }));
  const addFerryItem = () =>
    setForm((f) => ({
      ...f,
      ferryItems: [
        ...f.ferryItems,
        f.ferryItems.length === 0 && suggestFerryCost(f.loading, f.unloading, parseFloat(f.weightKg) || 0) > 0
          ? { id: genChargeId(), label: t('ferryCost'), amount: String(suggestFerryCost(f.loading, f.unloading, parseFloat(f.weightKg) || 0)) }
          : { id: genChargeId(), label: '', amount: '0' },
      ],
    }));
  const updateBridgeItem = (id: string, patch: Partial<{ label: string; amount: string }>) =>
    setForm((f) => ({ ...f, bridgeItems: f.bridgeItems.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  const updateFerryItem = (id: string, patch: Partial<{ label: string; amount: string }>) =>
    setForm((f) => ({ ...f, ferryItems: f.ferryItems.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  const removeBridgeItem = (id: string) => setForm((f) => ({ ...f, bridgeItems: f.bridgeItems.filter((it) => it.id !== id) }));
  const removeFerryItem = (id: string) => setForm((f) => ({ ...f, ferryItems: f.ferryItems.filter((it) => it.id !== id) }));
  const bridgeSum = form.bridgeItems.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
  const ferrySum = form.ferryItems.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);

  // Picking a postcode also fills in the city it belongs to (when known) —
  // still a plain field afterwards, so the city can be corrected independently.
  const pickPostLoading = (v: string) => {
    const city = rates.postcode_city[form.loading]?.[v];
    update({ postLoading: v, ...(city ? { cityLoading: city } : {}) });
  };
  const pickPostUnloading = (v: string) => {
    const city = rates.postcode_city[form.unloading]?.[v];
    update({ postUnloading: v, ...(city ? { cityUnloading: city } : {}) });
  };

  // The reverse direction: picking a city suggests one of its real postcodes
  // (a city can have several — the first match from the data is a fine starting
  // point) — only when the postcode field is still empty, so it never overwrites
  // something the user already typed in.
  const firstPostcodeForCity = (country: string, city: string): string => {
    const map = rates.postcode_city[country];
    if (!map) return '';
    const hit = Object.entries(map).find(([, c]) => c === city);
    return hit ? hit[0] : '';
  };
  const pickCityLoading = (city: string) =>
    setForm((f) => ({ ...f, cityLoading: city, postLoading: f.postLoading || firstPostcodeForCity(f.loading, city) }));
  const pickCityUnloading = (city: string) =>
    setForm((f) => ({ ...f, cityUnloading: city, postUnloading: f.postUnloading || firstPostcodeForCity(f.unloading, city) }));

  const swap = () =>
    updateRoute({
      loading: form.unloading,
      unloading: form.loading,
      cityLoading: form.cityUnloading,
      cityUnloading: form.cityLoading,
      postLoading: form.postUnloading,
      postUnloading: form.postLoading,
      companyLoading: form.companyUnloading,
      companyUnloading: form.companyLoading,
    });


  return (
    <>
      {/* --- From --- */}
      <div className="panel route-panel-from">
        <p className="eyebrow">{lang === 'bg' ? 'Стъпка 1' : 'Step 1'}</p>
        <h2>{t('fromTitle')}</h2>

        <div className="field">
          <label htmlFor="loadingSel">{t('loading')}</label>
          <select id="loadingSel" value={form.loading} onChange={(e) => updateRoute({ loading: e.target.value })}>
            {codes.map((c) => (
              <option key={c} value={c}>
                {countryLabel(c, lang)}
              </option>
            ))}
          </select>
        </div>
        <div className="two-col">
          <div className="field">
            <label htmlFor="cityLoadingInp">{t('cityLoading')}</label>
            <CityPicker t={t} id="cityLoadingInp" value={form.cityLoading} options={rates.cities[form.loading] || []} onChange={pickCityLoading} capital={CAPITALS[form.loading]} required />
          </div>
          <div className="field">
            <label htmlFor="postLoadingInp">{t('postLoading')}</label>
            <input
              id="postLoadingInp"
              list="postLoadingList"
              value={form.postLoading}
              placeholder={t('postPh')}
              onChange={(e) => pickPostLoading(e.target.value)}
            />
            <datalist id="postLoadingList">
              {(rates.postcodes[form.loading] || []).map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="companyLoadingInp">{t('companyLoading')}</label>
          <input id="companyLoadingInp" value={form.companyLoading} placeholder={t('companyPh')} onChange={(e) => update({ companyLoading: e.target.value })} />
        </div>
      </div>

      <div className="swap-divider">
        <button className="swap-btn" onClick={swap}>
          <SwapIcon /> {t('swap')}
        </button>
      </div>

      {/* --- To --- */}
      <div className="panel route-panel-to">
        <p className="eyebrow">{lang === 'bg' ? 'Стъпка 2' : 'Step 2'}</p>
        <h2>{t('toTitle')}</h2>

        <div className="field">
          <label htmlFor="unloadingSel">{t('unloading')}</label>
          <select id="unloadingSel" value={form.unloading} onChange={(e) => updateRoute({ unloading: e.target.value })}>
            {codes.map((c) => (
              <option key={c} value={c}>
                {countryLabel(c, lang)}
              </option>
            ))}
          </select>
        </div>
        <div className="two-col">
          <div className="field">
            <label htmlFor="cityUnloadingInp">{t('cityUnloading')}</label>
            <CityPicker t={t} id="cityUnloadingInp" value={form.cityUnloading} options={rates.cities[form.unloading] || []} onChange={pickCityUnloading} capital={CAPITALS[form.unloading]} required />
          </div>
          <div className="field">
            <label htmlFor="postUnloadingInp">{t('postUnloading')}</label>
            <input
              id="postUnloadingInp"
              list="postUnloadingList"
              value={form.postUnloading}
              placeholder={t('postPh')}
              onChange={(e) => pickPostUnloading(e.target.value)}
            />
            <datalist id="postUnloadingList">
              {(rates.postcodes[form.unloading] || []).map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="companyUnloadingInp">{t('companyUnloading')}</label>
          <input id="companyUnloadingInp" value={form.companyUnloading} placeholder={t('companyPh')} onChange={(e) => update({ companyUnloading: e.target.value })} />
        </div>
      </div>

      {/* --- Vehicle & transit info --- */}
      {/* A <details> element: on desktop it just reads as a normal open panel; on a
          phone (see the CSS media query) the summary becomes a tappable collapse toggle,
          so this heavier step-3 section doesn't have to stay expanded taking up the screen. */}
      <details className="panel vehicle-panel" open>
        <summary>
          <span className="eyebrow">{lang === 'bg' ? 'Стъпка 3' : 'Step 3'}</span>
          <h2>{t('vehicleTitle')}</h2>
        </summary>

        <div className="field">
          <label htmlFor="catSel">{t('vehicle')}</label>
          <select id="catSel" value={form.cat} onChange={(e) => update({ cat: e.target.value })}>
            {CAT_ORDER.map((c) => {
              const info = rates.cat_info[c];
              return (
                <option key={c} value={c}>
                  {c}
                  {info ? ` — ${info.payload_t}t / ${info.ldm} LDM` : ''}
                </option>
              );
            })}
          </select>
        </div>

        <div className="field">
          <label>{t('serviceTagsLabel')}</label>
          <div className="tag-checks">
            {SERVICE_TAGS.map((key) => (
              <label key={key} className="tag-check">
                <input
                  type="checkbox"
                  checked={form.serviceTags.includes(key)}
                  onChange={(e) => {
                    if (!e.target.checked) {
                      update({ serviceTags: form.serviceTags.filter((k) => k !== key) });
                      return;
                    }
                    // Групаж shares the truck with other customers' freight — it
                    // rules out a dedicated/direct/express load, and vice versa:
                    // picking any of those means the truck isn't shared.
                    const next =
                      key === 'groupage'
                        ? ['groupage']
                        : [...form.serviceTags.filter((k) => k !== 'groupage'), key];
                    update({ serviceTags: next });
                  }}
                />
                {SERVICE_TAG_LABELS[key][lang]}
              </label>
            ))}
            <label className="tag-check">
              <input type="checkbox" checked={form.tailLift} onChange={(e) => update({ tailLift: e.target.checked })} />
              {t('tailLift')}
            </label>
          </div>
          {(form.serviceTags.length > 0 || form.tailLift) &&
            (() => {
              const mult =
                form.serviceTags.reduce((m, k) => m * (SERVICE_TAG_PRICE_MULT[k as keyof typeof SERVICE_TAG_PRICE_MULT] ?? 1), 1) *
                (form.tailLift ? TAIL_LIFT_PRICE_MULT : 1);
              const pct = Math.round((mult - 1) * 100);
              return <p className="hint">{t('serviceTagsPriceHint', { PCT: (pct >= 0 ? '+' : '') + pct })}</p>;
            })()}
        </div>

        <div className="two-col">
          <div className="field">
            <label htmlFor="shipDateInp">{t('shipDate')}</label>
            <input id="shipDateInp" type="date" value={form.shipDate} onChange={(e) => update({ shipDate: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="shipTimeInp">{t('shipTime')}</label>
            <input id="shipTimeInp" type="time" value={form.shipTime} onChange={(e) => update({ shipTime: e.target.value })} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="transitTypeSel">{t('transitType')}</label>
          <select id="transitTypeSel" value={form.transitType} onChange={(e) => update({ transitType: e.target.value as TransitType })}>
            <option value="sold">{t('transitSold')}</option>
            <option value="own">{t('transitOwn')}</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="manualDistanceInp">{t('manualDistance')}</label>
          <input
            type="number"
            min="0"
            step="10"
            id="manualDistanceInp"
            value={form.manualDistanceKm}
            placeholder={String(distanceKm(form.loading, form.unloading))}
            onChange={(e) => update({ manualDistanceKm: e.target.value })}
          />
          <p className="hint">{t('manualDistanceHint', { N: distanceKm(form.loading, form.unloading) })}</p>
        </div>

        <div className="field">
          <label htmlFor="manualPriceInp">{t('manualPrice')}</label>
          <input
            type="number"
            min="0"
            step="10"
            id="manualPriceInp"
            value={form.manualPriceAvg}
            placeholder={autoPriceAvg ? String(Math.round(autoPriceAvg)) : '0'}
            onChange={(e) => update({ manualPriceAvg: e.target.value })}
          />
          <p className="hint">{autoPriceAvg ? t('manualPriceHint', { N: Math.round(autoPriceAvg) }) : t('manualPriceHintNoModel')}</p>
        </div>

        <fieldset>
          <legend>{t('extrasLegend')}</legend>
          <div className="two-col">
            <div className="field">
              <label htmlFor="emptyKmInp">{t('emptyKm')}</label>
              <input
                type="number"
                min="0"
                step="10"
                id="emptyKmInp"
                value={form.emptyKm}
                placeholder="0"
                onChange={(e) => update({ emptyKm: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="deviationKmInp">{t('deviationKm')}</label>
              <input
                type="number"
                min="0"
                step="5"
                id="deviationKmInp"
                value={form.deviationKm}
                placeholder="0"
                onChange={(e) => update({ deviationKm: e.target.value })}
              />
            </div>
          </div>
          <p className="hint" style={{ marginTop: -4, marginBottom: 12 }}>
            {t('deviationKmHint')}
          </p>
          <div className="field">
            <label htmlFor="extraCostInp">{t('extraCost')}</label>
            <input
              type="number"
              min="0"
              step="10"
              id="extraCostInp"
              value={form.extraCost}
              placeholder="0"
              onChange={(e) => update({ extraCost: e.target.value })}
            />
            <p className="hint">{t('extraCostHint')}</p>
          </div>
          <div className="field">
            <label htmlFor="tollCostInp">
              <span className="field-icon" aria-hidden="true">
                🛣️
              </span>
              {t('tollCost')}
            </label>
            <input type="number" min="0" step="5" id="tollCostInp" value={form.tollCost} placeholder="0" onChange={(e) => update({ tollCost: e.target.value })} />
            <p className="hint">{t('tollHint', { N: suggestToll(distanceKm(form.loading, form.unloading), form.loading, form.unloading) })}</p>
          </div>
          <div className="field">
            <label>
              <span className="field-icon" aria-hidden="true">
                🌉
              </span>
              {t('bridgeCost')}
            </label>
            {form.bridgeItems.map((item) => (
              <div className="charge-row" key={item.id}>
                <input
                  type="text"
                  value={item.label}
                  placeholder={t('crossingNamePh')}
                  onChange={(e) => updateBridgeItem(item.id, { label: e.target.value })}
                />
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={item.amount}
                  placeholder="0"
                  onChange={(e) => updateBridgeItem(item.id, { amount: e.target.value })}
                />
                <button type="button" className="charge-remove" onClick={() => removeBridgeItem(item.id)} aria-label={t('removeCrossing')}>
                  ×
                </button>
              </div>
            ))}
            <button type="button" className="charge-add" onClick={addBridgeItem}>
              {t('addBridge')}
            </button>
            <p className="hint">
              {bridgeSum > 0 ? t('crossingsTotal', { SUM: bridgeSum }) + ' — ' : ''}
              {bridgeTollLabel(form.loading, form.unloading, lang)
                ? t('bridgeHintWithName', { NAME: bridgeTollLabel(form.loading, form.unloading, lang) || '' })
                : t('bridgeFerryHint')}
            </p>
          </div>
          <div className="field">
            <label>
              <span className="field-icon" aria-hidden="true">
                ⛴️
              </span>
              {t('ferryCost')}
            </label>
            {form.ferryItems.map((item) => (
              <div className="charge-row" key={item.id}>
                <input
                  type="text"
                  value={item.label}
                  placeholder={t('crossingNamePh')}
                  onChange={(e) => updateFerryItem(item.id, { label: e.target.value })}
                />
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={item.amount}
                  placeholder="0"
                  onChange={(e) => updateFerryItem(item.id, { amount: e.target.value })}
                />
                <button type="button" className="charge-remove" onClick={() => removeFerryItem(item.id)} aria-label={t('removeCrossing')}>
                  ×
                </button>
              </div>
            ))}
            <button type="button" className="charge-add" onClick={addFerryItem}>
              {t('addFerry')}
            </button>
            {ferrySum > 0 && (
              <p className="hint" style={{ marginBottom: 12 }}>
                {t('crossingsTotal', { SUM: ferrySum })}
              </p>
            )}
          </div>
          {ferry && (
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="ferryWeightInp">{t('ferryWeightKg')}</label>
              <input
                type="number"
                min="0"
                step="500"
                id="ferryWeightInp"
                value={form.weightKg}
                placeholder="0"
                onChange={(e) => updateWeight(e.target.value)}
              />
              <p className="hint">{t('ferryWeightHint')}</p>
            </div>
          )}
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="customsCostInp">{t('customsCost')}</label>
            <input type="number" min="0" step="5" id="customsCostInp" value={form.customsCost} placeholder="0" onChange={(e) => update({ customsCost: e.target.value })} />
            <p className="hint">
              {crossesCustomsBorder(form.loading, form.unloading)
                ? t('customsHintCrosses', { N: suggestCustomsCost(form.loading, form.unloading) })
                : t('customsHintNone')}
            </p>
          </div>
        </fieldset>

        <p className="hint" style={{ textAlign: 'center', marginTop: 14, marginBottom: 0 }}>
          {t('liveCalcNote')}
        </p>
      </details>
    </>
  );
}
