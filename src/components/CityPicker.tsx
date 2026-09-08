import { useState } from 'react';
import type { TFunc } from '../types';

const OTHER = '__other__';

interface CityPickerProps {
  t: TFunc;
  id: string;
  value: string;
  options: string[];
  onChange: (city: string) => void;
  /** Marks one option (the country's capital) with a ★ prefix — value is unaffected. */
  capital?: string;
  /** When true, omits the "— none —" option — used for city (always picked), not postcode (optional). */
  required?: boolean;
}

/** A real dropdown of known cities for the selected country, with an explicit
 *  "other" option that reveals a text field — so a city missing from the list
 *  can still be added, without making every pick a free-text guess. */
export default function CityPicker({ t, id, value, options, onChange, capital, required }: CityPickerProps) {
  const knownMatch = value === '' || options.includes(value);
  const [customMode, setCustomMode] = useState(!knownMatch);

  if (customMode) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <input id={id} value={value} placeholder={t('cityCustomPh')} onChange={(e) => onChange(e.target.value)} style={{ flex: 1 }} />
        <button
          type="button"
          className="icon-btn"
          title={t('cityBackToList')}
          onClick={() => {
            setCustomMode(false);
            onChange('');
          }}
        >
          &times;
        </button>
      </div>
    );
  }

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => {
        if (e.target.value === OTHER) {
          setCustomMode(true);
          onChange('');
        } else {
          onChange(e.target.value);
        }
      }}
    >
      {!required && <option value="">{t('cityNone')}</option>}
      {options.map((c) => (
        <option key={c} value={c}>
          {c === capital ? `★ ${c}` : c}
        </option>
      ))}
      <option value={OTHER}>{t('cityOther')}</option>
    </select>
  );
}
