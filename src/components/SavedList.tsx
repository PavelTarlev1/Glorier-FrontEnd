import { useState } from 'react';
import { COUNTRIES } from '../i18n';
import { TrashIcon } from '../icons';
import type { Lang, TFunc, Calculation } from '../types';

function fmt(n: number, lang: Lang): string {
  return Math.round(n).toLocaleString(lang === 'bg' ? 'bg-BG' : 'en-GB') + ' €';
}
function fmtDate(iso: string, lang: Lang): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === 'bg' ? 'bg-BG' : 'en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
function fmtDateTime(iso: string, hhmm: string, lang: Lang): string {
  const date = fmtDate(iso, lang);
  if (date === '—' || !hhmm) return date;
  return `${date}, ${hhmm}`;
}

interface SavedListProps {
  t: TFunc;
  lang: Lang;
  calculations: Calculation[];
  onDelete: (id: number) => void;
  onReuse: (c: Calculation) => void;
}

export default function SavedList({ t, lang, calculations, onDelete, onReuse }: SavedListProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="panel">
      <p className="eyebrow">{lang === 'bg' ? 'История' : 'History'}</p>
      <h2>{t('savedTitle')}</h2>
      {calculations.length === 0 ? (
        <p className="saved-empty">{t('savedEmpty')}</p>
      ) : (
        <div className="saved-list">
          {calculations.map((c) => {
            const expanded = expandedId === c.id;
            const dateStr = fmtDate(c.created_at.slice(0, 10), lang);
            return (
              <div className="saved-item" key={c.id}>
                <div className="row-head" onClick={() => setExpandedId(expanded ? null : c.id)}>
                  <div>
                    <div className="r">
                      {c.lc} → {c.uc} &middot; {c.cat}{' '}
                      <span className="transit-badge">{t(c.transit_type === 'own' ? 'transitOwn' : 'transitSold')}</span>
                    </div>
                    <div className="m">
                      {dateStr} &middot; {Math.round(c.distance)} km
                      {(c.company_from || c.company_to) && ` · ${c.company_from || '—'} → ${c.company_to || '—'}`}
                    </div>
                  </div>
                  <div className="p">{fmt(c.total, lang)}</div>
                  <button
                    className="del"
                    title="delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(c.id);
                    }}
                  >
                    <TrashIcon />
                  </button>
                </div>

                {expanded && (
                  <div className="saved-detail">
                    <div className="d-line">
                      <span>{t('savedRouteLabel')}</span>
                      <span>
                        {[c.city_from, COUNTRIES[c.lc]?.[lang] || c.lc].filter(Boolean).join(', ')} → {[c.city_to, COUNTRIES[c.uc]?.[lang] || c.uc].filter(Boolean).join(', ')}
                      </span>
                    </div>
                    {(c.company_from || c.company_to) && (
                      <div className="d-line">
                        <span>{t('savedCompanyLabel')}</span>
                        <span>{c.company_from || '—'} → {c.company_to || '—'}</span>
                      </div>
                    )}
                    <div className="d-line">
                      <span>{t('shippedLabel')}</span>
                      <span>{fmtDateTime(c.ship_date, c.ship_time, lang)}</span>
                    </div>
                    <div className="d-line">
                      <span>{t('arrivalLabel')}</span>
                      <span>{fmtDateTime(c.arrival_date, c.arrival_time, lang)}</span>
                    </div>
                    <div className="d-line">
                      <span>{t('pricePerKm')}</span>
                      <span>{c.price_per_km.toFixed(2)} €/km</span>
                    </div>
                    {c.toll_cost > 0 && (
                      <div className="d-line">
                        <span>{t('lineToll')}</span>
                        <span>{fmt(c.toll_cost, lang)}</span>
                      </div>
                    )}
                    {c.bridge_cost > 0 && (
                      <div className="d-line">
                        <span>{t('lineBridge')}</span>
                        <span>{fmt(c.bridge_cost, lang)}</span>
                      </div>
                    )}
                    {c.ferry_cost > 0 && (
                      <div className="d-line">
                        <span>{t('lineFerry')}</span>
                        <span>{fmt(c.ferry_cost, lang)}</span>
                      </div>
                    )}
                    {c.customs_cost > 0 && (
                      <div className="d-line">
                        <span>{t('lineCustoms')}</span>
                        <span>{fmt(c.customs_cost, lang)}</span>
                      </div>
                    )}
                    <button
                      className="btn-secondary reuse-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReuse(c);
                      }}
                    >
                      {t('reuseBtn')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="saved-hint">{t('savedShared')}</p>
    </div>
  );
}
