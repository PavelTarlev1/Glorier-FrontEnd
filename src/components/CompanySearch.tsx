import { useEffect, useMemo, useState } from 'react';
import { searchHistory } from '../calc';
import { api } from '../api';
import type { Lang, TFunc, RatesData, Calculation } from '../types';

function fmt(n: number, lang: Lang): string {
  return Math.round(n).toLocaleString(lang === 'bg' ? 'bg-BG' : 'en-GB') + ' €';
}

interface CompanySearchProps {
  t: TFunc;
  lang: Lang;
  rates: RatesData;
}

export default function CompanySearch({ t, lang, rates }: CompanySearchProps) {
  const [query, setQuery] = useState('');
  const [savedResults, setSavedResults] = useState<Calculation[]>([]);
  const [tab, setTab] = useState<'hist' | 'saved'>('hist');

  const histResults = useMemo(() => searchHistory(rates, query), [rates, query]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSavedResults([]);
      return;
    }
    const handle = setTimeout(() => {
      api
        .getCalculations(q)
        .then(setSavedResults)
        .catch(() => setSavedResults([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  const hasQuery = query.trim().length > 0;

  return (
    <div className="panel">
      <p className="eyebrow">{lang === 'bg' ? 'Търсене' : 'Search'}</p>
      <h2 style={{ marginBottom: 12 }}>{t('companySearchTitle')}</h2>
      <input
        className="search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('companySearchPh')}
      />

      {hasQuery && (
        <>
          <div className="nav-tabs" style={{ marginTop: 14, marginRight: 0, width: 'fit-content' }}>
            <button className={tab === 'hist' ? 'active' : ''} onClick={() => setTab('hist')}>
              {t('companySearchHistTab', { N: histResults.length })}
            </button>
            <button className={tab === 'saved' ? 'active' : ''} onClick={() => setTab('saved')}>
              {t('companySearchSavedTab', { N: savedResults.length })}
            </button>
          </div>

          {tab === 'hist' &&
            (histResults.length === 0 ? (
              <div className="hist-empty">{t('companySearchNoResults')}</div>
            ) : (
              <div className="hist-scroll" style={{ marginTop: 12 }}>
                <table className="hist">
                  <thead>
                    <tr>
                      <th>{t('colDate')}</th>
                      <th>{t('colRoute')}</th>
                      <th>{t('colCompanyFrom')}</th>
                      <th>{t('colCompanyTo')}</th>
                      <th>{t('colVehicle')}</th>
                      <th>{t('colDist')}</th>
                      <th>{t('colPrice')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {histResults.slice(0, 50).map((h, i) => (
                      <tr key={i}>
                        <td>{h[0] || '—'}</td>
                        <td className="route">
                          {h[1]}→{h[2]}
                        </td>
                        <td>{h[6] || '—'}</td>
                        <td>{h[7] || '—'}</td>
                        <td>{h[3]}</td>
                        <td>{h[4]} km</td>
                        <td className="price">{Math.round(h[5]).toLocaleString(lang === 'bg' ? 'bg-BG' : 'en-GB')} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {tab === 'saved' &&
            (savedResults.length === 0 ? (
              <div className="hist-empty">{t('companySearchNoResults')}</div>
            ) : (
              <div className="saved-list" style={{ marginTop: 12 }}>
                {savedResults.map((c) => (
                  <div className="saved-item" key={c.id}>
                    <div className="row-head">
                      <div>
                        <div className="r">
                          {c.lc} → {c.uc} &middot; {c.cat}
                        </div>
                        <div className="m">
                          {c.company_from || '—'} → {c.company_to || '—'} &middot; {Math.round(c.distance)} km
                        </div>
                      </div>
                      <div className="p">{fmt(c.total, lang)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
        </>
      )}

      {!hasQuery && <p className="hist-empty">{t('companySearchEmpty')}</p>}
    </div>
  );
}
