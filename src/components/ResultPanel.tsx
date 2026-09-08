import { useState } from 'react';
import { COUNTRIES, SERVICE_TAG_LABELS, flagEmoji } from '../i18n';
import { EmptyIcon, CopyIcon, SaveIcon, CheckIcon, ArrowIcon, EditIcon, RevertIcon } from '../icons';
import RouteMap from './RouteMap';
import type { Lang, TFunc, EstimateResult, FormState } from '../types';

function fmt(n: number, lang: Lang): string {
  return Math.round(n).toLocaleString(lang === 'bg' ? 'bg-BG' : 'en-GB') + ' €';
}
function fmtKm(n: number, lang: Lang): string {
  return Math.round(n).toLocaleString(lang === 'bg' ? 'bg-BG' : 'en-GB') + ' km';
}
function fmtDate(iso: string, lang: Lang): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === 'bg' ? 'bg-BG' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtDateTime(iso: string, hhmm: string, lang: Lang): string {
  const date = fmtDate(iso, lang);
  if (date === '—' || !hhmm) return date;
  return `${date}, ${hhmm}`;
}

interface ResultPanelProps {
  t: TFunc;
  lang: Lang;
  result: EstimateResult | null;
  form: FormState;
  setForm: (updater: (f: FormState) => FormState) => void;
  onSave: () => void;
  saving: boolean;
  saveError?: string | null;
}

export default function ResultPanel({ t, lang, result, form, setForm, onSave, saving, saveError }: ResultPanelProps) {
  const [copied, setCopied] = useState(false);
  // Distance and €/km are editable via an explicit edit button, not a
  // click-anywhere input — the total price is deliberately not editable at
  // all: it's always derived from distance × rate (or the rate override).
  const [editingField, setEditingField] = useState<'distance' | 'rate' | null>(null);

  if (!result) {
    return (
      <div className="panel">
        <div className="result-empty">
          <EmptyIcon />
          <h2 style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15 }}>
            {t('emptyTitle')}
          </h2>
          <p style={{ fontSize: 13, maxWidth: 320 }}>{t('emptySub')}</p>
        </div>
      </div>
    );
  }

  const span = result.priceHi - result.priceLo || 1;
  let midPct = ((result.priceAvg - result.priceLo) / span) * 100;
  midPct = Math.max(2, Math.min(98, midPct));

  const srcKey =
    result.level === 'routeCat' ? 'srcRouteCat' : result.level === 'route' ? 'srcRoute' : result.level === 'cat' ? 'srcCat' : 'srcOverall';

  const originLabel = [result.cityLoading, COUNTRIES[result.lc][lang]].filter(Boolean).join(', ');
  const destLabel = [result.cityUnloading, COUNTRIES[result.uc][lang]].filter(Boolean).join(', ');

  const copy = () => {
    let text =
      `${originLabel} (${result.lc}) → ${destLabel} (${result.uc}) · ${result.cat}\n` +
      (result.companyLoading || result.companyUnloading ? `${result.companyLoading || '—'} → ${result.companyUnloading || '—'}\n` : '') +
      `${t('shippedLabel')}: ${fmtDateTime(result.shipDate, result.shipTime, lang)}  →  ${t('arrivalLabel')}: ${fmtDateTime(result.arrivalDate, result.arrivalTime, lang)}\n` +
      `${t('distance')}: ${fmtKm(result.distance, lang)}\n` +
      `${t('estPrice')}: ${fmt(result.priceAvg, lang)} (${fmt(result.priceLo, lang)}–${fmt(result.priceHi, lang)})\n` +
      `${t('pricePerKm')}: ${result.effectivePricePerKm.toFixed(2)} €/km`;
    if (result.total !== result.priceAvg) text += `\n${t('lineTotal')}: ${fmt(result.total, lang)}`;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };

  return (
    <div className="panel">
      <div className="result-top">
        <div className="route-bubbles">
          <div className="route-bubble from">
            <span className="rb-flag">{flagEmoji(result.lc)}</span>
            <p className="rb-label">{t('loading')}</p>
            <p className="rb-place">
              {COUNTRIES[result.lc][lang]} <span className="flag-chip">{result.lc}</span>
            </p>
            {(result.cityLoading || result.postLoading) && (
              <p className="rb-city">{[result.cityLoading, result.postLoading].filter(Boolean).join(' · ')}</p>
            )}
            {result.companyLoading && <p className="rb-company">{result.companyLoading}</p>}
          </div>
          <div className="route-bubble-arrow">
            <ArrowIcon />
          </div>
          <div className="route-bubble to">
            <span className="rb-flag">{flagEmoji(result.uc)}</span>
            <p className="rb-label">{t('unloading')}</p>
            <p className="rb-place">
              {COUNTRIES[result.uc][lang]} <span className="flag-chip">{result.uc}</span>
            </p>
            {(result.cityUnloading || result.postUnloading) && (
              <p className="rb-city">{[result.cityUnloading, result.postUnloading].filter(Boolean).join(' · ')}</p>
            )}
            {result.companyUnloading && <p className="rb-company">{result.companyUnloading}</p>}
          </div>
        </div>
      </div>

      <RouteMap result={result} />

      <div className="stat-row">
        <div className="stat">
          <div className="label">
            {t('distance')}
            {result.isManualDistance && <span className="manual-badge">{t('manualBadge')}</span>}
            {!result.isManualDistance && result.isRoadDistance && <span className="road-badge">{t('roadBadge')}</span>}
          </div>
          {editingField === 'distance' ? (
            <div className="value-edit">
              <input
                type="number"
                min="0"
                step="10"
                autoFocus
                className="stat-input"
                value={form.manualDistanceKm}
                placeholder={String(Math.round(result.autoDistance))}
                onChange={(e) => setForm((f) => ({ ...f, manualDistanceKm: e.target.value }))}
                onBlur={() => setEditingField(null)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
              />
              <small>km</small>
              {result.isManualDistance && (
                <button type="button" className="edit-btn" onClick={() => setForm((f) => ({ ...f, manualDistanceKm: '' }))} aria-label={t('revertBtn')} title={t('revertBtn')}>
                  <RevertIcon />
                </button>
              )}
            </div>
          ) : (
            <div className="value-display">
              <div className="value">{fmtKm(result.distance, lang)}</div>
              {result.isManualDistance && (
                <button type="button" className="edit-btn" onClick={() => setForm((f) => ({ ...f, manualDistanceKm: '' }))} aria-label={t('revertBtn')} title={t('revertBtn')}>
                  <RevertIcon />
                </button>
              )}
              <button type="button" className="edit-btn" onClick={() => setEditingField('distance')} aria-label={t('editBtn')}>
                <EditIcon />
              </button>
            </div>
          )}
          {(editingField === 'distance' || result.isManualDistance) && <p className="stat-model">{t('statModel', { V: fmtKm(result.autoDistance, lang) })}</p>}
        </div>
        <div className="stat">
          <div className="label">
            {t('pricePerKm')}
            {result.isManualPrice && <span className="manual-badge">{t('manualBadge')}</span>}
          </div>
          {editingField === 'rate' ? (
            <div className="value-edit">
              <input
                type="number"
                min="0"
                step="0.05"
                autoFocus
                className="stat-input"
                value={form.manualPricePerKm}
                placeholder={result.rate.avg.toFixed(2)}
                onChange={(e) => setForm((f) => ({ ...f, manualPricePerKm: e.target.value }))}
                onBlur={() => setEditingField(null)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
              />
              <small>€/km</small>
              {result.isManualPrice && (
                <button type="button" className="edit-btn" onClick={() => setForm((f) => ({ ...f, manualPricePerKm: '' }))} aria-label={t('revertBtn')} title={t('revertBtn')}>
                  <RevertIcon />
                </button>
              )}
            </div>
          ) : (
            <div className="value-display">
              <div className="value">
                {result.effectivePricePerKm.toFixed(2)}
                <small>€/km</small>
              </div>
              {result.isManualPrice && (
                <button type="button" className="edit-btn" onClick={() => setForm((f) => ({ ...f, manualPricePerKm: '' }))} aria-label={t('revertBtn')} title={t('revertBtn')}>
                  <RevertIcon />
                </button>
              )}
              <button type="button" className="edit-btn" onClick={() => setEditingField('rate')} aria-label={t('editBtn')}>
                <EditIcon />
              </button>
            </div>
          )}
          {(editingField === 'rate' || result.isManualPrice) && <p className="stat-model">{t('statModel', { V: `${result.rate.avg.toFixed(2)} €/km` })}</p>}
        </div>
        <div className="stat price">
          <div className="label">
            {t('estPrice')}
            {result.isManualPrice && <span className="manual-badge">{t('manualBadge')}</span>}
          </div>
          <div className="value">{fmt(result.priceAvg, lang)}</div>
        </div>
      </div>

      <div className="range-bar-wrap">
        <div className="label">{t('priceRange')}</div>
        <div className="range-bar">
          <div className="fill" />
          <div className="tick" style={{ left: midPct + '%' }} />
        </div>
        <div className="range-labels">
          <span>{fmt(result.priceLo, lang)}</span>
          <span className="mid">{fmt(result.priceAvg, lang)}</span>
          <span>{fmt(result.priceHi, lang)}</span>
        </div>
      </div>

      <div className="source-note">{t(srcKey, { N: result.rate.n })}</div>


      {(result.tailLift || result.serviceTags.length > 0) && (
        <div className="tag-badges">
          {result.serviceTags.map((key) => (
            <span key={key} className="transit-badge">
              {SERVICE_TAG_LABELS[key as keyof typeof SERVICE_TAG_LABELS]?.[lang] || key}
            </span>
          ))}
          {result.tailLift && <span className="transit-badge">{t('tailLift')}</span>}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <p className="eyebrow">{t('drivingTitle')}</p>
        <div className="extra-line">
          <span>{t('shippedLabel')}</span>
          <span>{fmtDateTime(result.shipDate, result.shipTime, lang)}</span>
        </div>
        <div className="extra-line">
          <span>{t('arrivalLabel')}</span>
          <span>{fmtDateTime(result.arrivalDate, result.arrivalTime, lang)}</span>
        </div>
      </div>
      <div className="source-note" style={{ marginTop: 10 }}>
        {t('drivingHoursLabel', { H: Math.round(result.drivingHours), SPEED: 65 })}
        {' — '}
        {result.overnightRests === 0 ? t('drivingSameDay') : t('drivingNeedsRest', { N: result.overnightRests, DAYS: result.drivingDays })}
        {result.ferry && <> · {t(result.ferry.noteKey, { H: result.ferry.hours })}</>}
      </div>

      {(result.emptyCost > 0 || result.extraCost > 0 || result.tollCost > 0 || result.bridgeCost > 0 || result.ferryCost > 0 || result.customsCost > 0) && (
        <div style={{ marginTop: 20 }}>
          <p className="eyebrow">{t('breakdown')}</p>
          <div className="extra-line">
            <span>
              {t('lineFreight')}
              {result.isManualPrice && <span className="manual-badge">{t('manualBadge')}</span>}
            </span>
            <span>{fmt(result.priceAvg, lang)}</span>
          </div>
          {result.isManualPrice && (
            <div className="extra-line sub">
              <span>{t('lineFreightModel')}</span>
              <span>{fmt(result.autoPriceAvg, lang)}</span>
            </div>
          )}
          {result.emptyCost > 0 && (
            <div className="extra-line">
              <span>{t('lineEmpty')}</span>
              <span>{fmt(result.emptyCost, lang)}</span>
            </div>
          )}
          {result.tollCost > 0 && (
            <div className="extra-line">
              <span>
                <span aria-hidden="true">🛣️ </span>
                {t('lineToll')}
              </span>
              <span>{fmt(result.tollCost, lang)}</span>
            </div>
          )}
          {result.bridgeCost > 0 && (
            <>
              <div className="extra-line">
                <span>
                  <span aria-hidden="true">🌉 </span>
                  {t('lineBridge')}
                </span>
                <span>{fmt(result.bridgeCost, lang)}</span>
              </div>
              {result.bridgeItems.length > 1 &&
                result.bridgeItems.map((it, i) => (
                  <div className="extra-line sub" key={i}>
                    <span>{it.label || t('bridgeCost')}</span>
                    <span>{fmt(it.amount, lang)}</span>
                  </div>
                ))}
            </>
          )}
          {result.ferryCost > 0 && (
            <>
              <div className="extra-line">
                <span>
                  <span aria-hidden="true">⛴️ </span>
                  {t('lineFerry')}
                </span>
                <span>{fmt(result.ferryCost, lang)}</span>
              </div>
              {result.ferryItems.length > 1 &&
                result.ferryItems.map((it, i) => (
                  <div className="extra-line sub" key={i}>
                    <span>{it.label || t('ferryCost')}</span>
                    <span>{fmt(it.amount, lang)}</span>
                  </div>
                ))}
              {result.ferry && (
                <div className="ferry-detail">
                  {result.weightKg > 0 && (
                    <div className="extra-line sub">
                      <span>{t('ferryWeightNote')}</span>
                      <span>{Math.round(result.weightKg).toLocaleString(lang === 'bg' ? 'bg-BG' : 'en-GB')} kg</span>
                    </div>
                  )}
                  <div className="extra-line sub">
                    <span>{t('ferryWaitLine')}</span>
                    <span>{result.ferry.waitHours}h</span>
                  </div>
                  <div className="extra-line sub">
                    <span>{t('ferryCrossingLine')}</span>
                    <span>{result.ferry.crossingHours}h</span>
                  </div>
                </div>
              )}
            </>
          )}
          {result.customsCost > 0 && (
            <div className="extra-line">
              <span>{t('lineCustoms')}</span>
              <span>{fmt(result.customsCost, lang)}</span>
            </div>
          )}
          {result.extraCost > 0 && (
            <div className="extra-line">
              <span>{t('lineExtra')}</span>
              <span>{fmt(result.extraCost, lang)}</span>
            </div>
          )}
          <div className="extra-line total">
            <span>{t('lineTotal')}</span>
            <span>{fmt(result.total, lang)}</span>
          </div>
        </div>
      )}

      <div className="actions-row">
        <button className={`btn-secondary ${copied ? 'copied' : ''}`} onClick={copy}>
          {copied ? <CheckIcon /> : <CopyIcon />} {copied ? t('copiedBtn') : t('copyBtn')}
        </button>
        <button className="btn-secondary" onClick={onSave} disabled={saving}>
          <SaveIcon /> {saving ? t('savingBtn') : t('saveBtn')}
        </button>
      </div>
      {saveError && <p className="save-error">{saveError}</p>}
    </div>
  );
}
