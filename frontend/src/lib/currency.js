import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { money } from './format';

/**
 * Display currencies.
 *
 * Every price is stored, charged and delivered in Pakistani rupees. Other
 * currencies only change how prices are SHOWN, converted at the rates the
 * owner keeps in Dashboard -> Settings. Checkout always states the rupee
 * amount that will actually be paid.
 */
export const CURRENCY_NAMES = {
  PKR: 'Pakistani rupee',
  USD: 'US dollar',
  EUR: 'Euro',
  GBP: 'British pound',
  AED: 'UAE dirham',
  SAR: 'Saudi riyal',
  CAD: 'Canadian dollar',
  AUD: 'Australian dollar',
  QAR: 'Qatari riyal',
  KWD: 'Kuwaiti dinar',
  OMR: 'Omani rial',
  BHD: 'Bahraini dinar',
  INR: 'Indian rupee',
  BDT: 'Bangladeshi taka',
  CNY: 'Chinese yuan',
  MYR: 'Malaysian ringgit',
  TRY: 'Turkish lira',
  JPY: 'Japanese yen',
};

const FLAGS = {
  PKR: '🇵🇰',
  USD: '🇺🇸',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  AED: '🇦🇪',
  SAR: '🇸🇦',
  CAD: '🇨🇦',
  AUD: '🇦🇺',
  QAR: '🇶🇦',
  KWD: '🇰🇼',
  OMR: '🇴🇲',
  BHD: '🇧🇭',
  INR: '🇮🇳',
  BDT: '🇧🇩',
  CNY: '🇨🇳',
  MYR: '🇲🇾',
  TRY: '🇹🇷',
  JPY: '🇯🇵',
};
export const flagOf = (code) => FLAGS[code] || '💱';

const KEY = 'sc_currency';
export const loadCurrency = () => {
  try {
    return localStorage.getItem(KEY) || 'PKR';
  } catch {
    return 'PKR';
  }
};
export const saveCurrency = (code) => {
  try {
    localStorage.setItem(KEY, code);
  } catch {}
};

/** The currencies shoppers may pick from, with rupees always first. */
export function enabledCurrencies(settings) {
  const list = (settings?.currencies || []).filter((c) => c.enabled && c.rate > 0);
  if (!list.some((c) => c.code === 'PKR')) list.unshift({ code: 'PKR', rate: 1, enabled: true });
  return list.sort((a, b) => (a.code === 'PKR' ? -1 : b.code === 'PKR' ? 1 : 0));
}

const cache = new Map();
const formatter = (code) => {
  if (!cache.has(code)) {
    try {
      cache.set(code, new Intl.NumberFormat('en', { style: 'currency', currency: code }));
    } catch {
      cache.set(code, null);
    }
  }
  return cache.get(code);
};

/** Formats a rupee amount in `code`. Rupees keep the familiar "Rs 1,190". */
export function formatIn(amountPkr, cur, settings) {
  const n = Number(amountPkr) || 0;
  if (!cur || cur.code === 'PKR') return money(n, settings?.currency || 'Rs');
  const f = formatter(cur.code);
  const v = n * cur.rate;
  return f ? f.format(v) : `${cur.code} ${v.toFixed(2)}`;
}

/**
 * useMoney() -> fmt
 *   fmt(n)       the amount in the shopper's currency
 *   fmt.pkr(n)   always rupees, for what is actually paid
 *   fmt.both(n)  "$4.29 (Rs 1,190)" when not in rupees, else "Rs 1,190"
 *   fmt.code     the current code, fmt.isPkr
 */
export function useMoney() {
  const settings = useSelector((s) => s.settings.data);
  const chosen = useSelector((s) => s.ui.currency);
  return useMemo(() => {
    const list = enabledCurrencies(settings);
    const cur = list.find((c) => c.code === chosen) || list[0];
    const fmt = (n) => formatIn(n, cur, settings);
    fmt.pkr = (n) => money(n, settings?.currency || 'Rs');
    fmt.both = (n) => (cur.code === 'PKR' ? fmt.pkr(n) : `${fmt(n)} (${fmt.pkr(n)})`);
    fmt.code = cur.code;
    fmt.isPkr = cur.code === 'PKR';
    return fmt;
  }, [settings, chosen]);
}
