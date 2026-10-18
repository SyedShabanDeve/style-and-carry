import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Modal from '../ui/Modal';
import { setCurrency, setLang, pushToast } from '../../store/uiSlice';
import { selectSettings } from '../../store/settingsSlice';
import { LANGUAGES, applyLanguage, languageName } from '../../lib/language';
import { enabledCurrencies, CURRENCY_NAMES, flagOf, formatIn } from '../../lib/currency';
import { Globe, Search, Check, Info } from '../ui/Icons';

/** Header button: current language and currency. */
export function LocaleButton({ onClick, className = '' }) {
  const settings = useSelector(selectSettings);
  const lang = useSelector((s) => s.ui.lang);
  const cur = useSelector((s) => s.ui.currency);
  const showLang = settings.showLanguagePicker !== false;
  const showCur = settings.showCurrencyPicker !== false && enabledCurrencies(settings).length > 1;
  if (!showLang && !showCur) return null;
  const code = enabledCurrencies(settings).some((c) => c.code === cur) ? cur : 'PKR';
  return (
    <button type="button" className={`loc-btn ${className}`} onClick={onClick} aria-label="Language and currency" translate="no">
      <Globe size={17} />
      {showLang && <span>{(lang || 'en').split('-')[0].toUpperCase()}</span>}
      {showLang && showCur && <i aria-hidden="true" />}
      {showCur && <span>{code}</span>}
    </button>
  );
}

/** The picker itself: every language, and the currencies the owner allows. */
export default function LocalePicker({ open, onClose }) {
  const dispatch = useDispatch();
  const settings = useSelector(selectSettings);
  const lang = useSelector((s) => s.ui.lang) || 'en';
  const chosenCur = useSelector((s) => s.ui.currency);
  const showLang = settings.showLanguagePicker !== false;
  const currencies = enabledCurrencies(settings);
  const showCur = settings.showCurrencyPicker !== false && currencies.length > 1;
  const [tab, setTab] = useState(showLang ? 'lang' : 'cur');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');

  const langs = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? LANGUAGES.filter(([c, en, nat]) => `${c} ${en} ${nat}`.toLowerCase().includes(t)) : LANGUAGES;
  }, [q]);

  const pickLang = async (code) => {
    if (code === lang) return onClose();
    setBusy(code);
    dispatch(setLang(code));
    try {
      await applyLanguage(code);
      dispatch(pushToast({ title: 'Language changed', message: `The site is now shown in ${languageName(code)[1]}.`, kind: 'ok' }));
      onClose();
    } catch (err) {
      dispatch(setLang('en'));
      dispatch(
        pushToast({
          title: 'Translation unavailable',
          message: 'We could not reach the translation service. Check your connection and try again.',
          kind: 'bad',
        })
      );
    } finally {
      setBusy('');
    }
  };

  const pickCur = (code) => {
    dispatch(setCurrency(code));
    dispatch(
      pushToast({
        title: 'Currency updated',
        message:
          code === 'PKR'
            ? 'Prices are shown in Pakistani rupees.'
            : `Prices are shown in ${CURRENCY_NAMES[code] || code}. Orders are still charged in Pakistani rupees.`,
        kind: 'ok',
      })
    );
    onClose();
  };

  const activeCur = currencies.some((c) => c.code === chosenCur) ? chosenCur : 'PKR';

  return (
    <Modal open={open} onClose={onClose} label="Language and currency" size="md" className="loc">
      <div className="loc-head" translate="no">
        <h2>Language &amp; currency</h2>
        {showLang && showCur && (
          <div className="loc-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'lang'} className={tab === 'lang' ? 'on' : undefined} onClick={() => setTab('lang')}>
              Language
            </button>
            <button type="button" role="tab" aria-selected={tab === 'cur'} className={tab === 'cur' ? 'on' : undefined} onClick={() => setTab('cur')}>
              Currency
            </button>
          </div>
        )}
      </div>

      {tab === 'lang' && showLang && (
        <div className="loc-body" translate="no">
          <label className="loc-search">
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${LANGUAGES.length} languages…`} aria-label="Search languages" data-autofocus />
          </label>
          <ul className="loc-list">
            {langs.map(([code, en, nat]) => (
              <li key={code}>
                <button type="button" className={code === lang ? 'on' : undefined} onClick={() => pickLang(code)} disabled={Boolean(busy)}>
                  <span className="loc-nat">{nat}</span>
                  <small>{en}</small>
                  {busy === code ? <span className="spin" /> : code === lang ? <Check size={15} /> : null}
                </button>
              </li>
            ))}
            {!langs.length && <li className="loc-none">No language matches “{q}”</li>}
          </ul>
          <p className="loc-note">
            <Info size={14} /> Translation is automatic, by Google Translate. Names and prices stay as they are.
          </p>
        </div>
      )}

      {tab === 'cur' && showCur && (
        <div className="loc-body" translate="no">
          <ul className="loc-list loc-cur">
            {currencies.map((c) => (
              <li key={c.code}>
                <button type="button" className={c.code === activeCur ? 'on' : undefined} onClick={() => pickCur(c.code)}>
                  <span className="loc-flag" aria-hidden="true">
                    {flagOf(c.code)}
                  </span>
                  <span className="loc-nat">
                    {c.code} <small>{CURRENCY_NAMES[c.code] || ''}</small>
                  </span>
                  <small className="loc-rate">{c.code === 'PKR' ? 'Default' : `Rs 1,000 ≈ ${formatIn(1000, c, settings)}`}</small>
                  {c.code === activeCur && <Check size={15} />}
                </button>
              </li>
            ))}
          </ul>
          <p className="loc-note">
            <Info size={14} /> Orders are charged and delivered in Pakistani rupees. Other currencies are shown for guidance, using
            recent exchange rates.
          </p>
        </div>
      )}
    </Modal>
  );
}
