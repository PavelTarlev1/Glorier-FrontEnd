import { Logo, SunIcon, MoonIcon } from '../icons';
import type { Lang, TFunc } from '../types';

export type ThemeMode = 'light' | 'dark';

interface HeaderProps {
  t: TFunc;
  lang: Lang;
  setLang: (lang: Lang) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  onHow: () => void;
}

export default function Header({ t, lang, setLang, theme, setTheme, onHow }: HeaderProps) {
  return (
    <header className="top">
      <div className="top-inner">
        <div className="brand">
          <Logo />
          <div className="brand-text">
            <h1>Navlo</h1>
            <p>{t('tagline')}</p>
          </div>
        </div>

        <button className="how-btn" onClick={onHow}>
          &#9432; {t('how')}
        </button>

        <div className="theme-switch">
          <button className={theme === 'light' ? 'active' : ''} title={t('themeLight')} onClick={() => setTheme('light')}>
            <SunIcon />
          </button>
          <button className={theme === 'dark' ? 'active' : ''} title={t('themeDark')} onClick={() => setTheme('dark')}>
            <MoonIcon />
          </button>
        </div>

        <div className="lang-switch">
          <button className={lang === 'bg' ? 'active' : ''} onClick={() => setLang('bg')}>
            BG
          </button>
          <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
            EN
          </button>
        </div>
      </div>
    </header>
  );
}
