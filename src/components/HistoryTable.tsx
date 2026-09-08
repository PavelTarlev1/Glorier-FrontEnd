import { useRef, useState, useEffect, useCallback } from 'react';
import { matchingHistory } from '../calc';
import type { Lang, TFunc, RatesData, EstimateResult } from '../types';

interface HistoryTableProps {
  t: TFunc;
  lang: Lang;
  rates: RatesData;
  result: EstimateResult | null;
}

// Fixed row height (matches table.hist td's padding + font-size in styles.css) —
// needed to compute which rows are actually in view without measuring the DOM
// on every scroll event.
const ROW_HEIGHT = 34;
// Extra rows rendered above/below the visible window so a fast scroll or a
// screen-reader jump doesn't show a blank flash before the next paint catches up.
const OVERSCAN = 6;

export default function HistoryTable({ t, lang, rates, result }: HistoryTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(320);

  const onScroll = useCallback(() => {
    if (scrollRef.current) setScrollTop(scrollRef.current.scrollTop);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setViewportH(el.clientHeight);
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!result) return null;
  // Real historical matches for this route+category — capped well above what's
  // ever visible at once (the scroll box only shows ~9 rows), since with the
  // windowing below only the in-view rows actually touch the DOM regardless of
  // how many total matches there are.
  const matches = matchingHistory(rates, result.lc, result.uc, result.cat);
  const shown = matches.slice(0, 100);

  const firstVisible = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const lastVisible = Math.min(shown.length, Math.ceil((scrollTop + viewportH) / ROW_HEIGHT) + OVERSCAN);
  const windowed = shown.slice(firstVisible, lastVisible);
  const topSpacer = firstVisible * ROW_HEIGHT;
  const bottomSpacer = (shown.length - lastVisible) * ROW_HEIGHT;

  return (
    <div className="panel">
      <p className="eyebrow">{lang === 'bg' ? 'Данни' : 'Data'}</p>
      <h2>{t('histTitle')}</h2>
      {matches.length === 0 ? (
        <div className="hist-empty">{t('histEmpty')}</div>
      ) : (
        <>
          <p className="hist-meta">{t('histMeta', { SHOWN: shown.length, TOTAL: matches.length })}</p>
          <div className="hist-scroll" ref={scrollRef} onScroll={onScroll}>
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
                {topSpacer > 0 && (
                  <tr aria-hidden="true">
                    <td colSpan={5} style={{ height: topSpacer, padding: 0, border: 0 }} />
                  </tr>
                )}
                {windowed.map((h, i) => (
                  <tr key={firstVisible + i}>
                    <td>{h[0] || '—'}</td>
                    <td className="route">
                      {h[1]}→{h[2]}
                    </td>
                    <td>{h[3]}</td>
                    <td>{h[4]} km</td>
                    <td className="price">{Math.round(h[5]).toLocaleString(lang === 'bg' ? 'bg-BG' : 'en-GB')} €</td>
                  </tr>
                ))}
                {bottomSpacer > 0 && (
                  <tr aria-hidden="true">
                    <td colSpan={5} style={{ height: bottomSpacer, padding: 0, border: 0 }} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
