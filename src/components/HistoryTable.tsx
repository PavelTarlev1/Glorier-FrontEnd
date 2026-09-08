import { matchingHistory } from '../calc';
import type { Lang, TFunc, RatesData, EstimateResult } from '../types';

interface HistoryTableProps {
  t: TFunc;
  lang: Lang;
  rates: RatesData;
  result: EstimateResult | null;
}

export default function HistoryTable({ t, lang, rates, result }: HistoryTableProps) {
  if (!result) return null;
  const matches = matchingHistory(rates, result.lc, result.uc, result.cat);
  const shown = matches.slice(0, 25);

  return (
    <div className="panel">
      <p className="eyebrow">{lang === 'bg' ? 'Данни' : 'Data'}</p>
      <h2>{t('histTitle')}</h2>
      {matches.length === 0 ? (
        <div className="hist-empty">{t('histEmpty')}</div>
      ) : (
        <>
          <p className="hist-meta">{t('histMeta', { SHOWN: shown.length, TOTAL: matches.length })}</p>
          <div className="hist-scroll">
            <table className="hist">
              <thead>
                <tr>
                  <th>{t('colDate')}</th>
                  <th>{t('colRoute')}</th>
                  <th>{t('colVehicle')}</th>
                  <th>{t('colDist')}</th>
                  <th>{t('colPrice')}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((h, i) => (
                  <tr key={i}>
                    <td>{h[0] || '—'}</td>
                    <td className="route">
                      {h[1]}→{h[2]}
                    </td>
                    <td>{h[3]}</td>
                    <td>{h[4]} km</td>
                    <td className="price">{Math.round(h[5]).toLocaleString(lang === 'bg' ? 'bg-BG' : 'en-GB')} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
