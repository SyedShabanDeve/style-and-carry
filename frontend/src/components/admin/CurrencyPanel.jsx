import { useState } from 'react';
import { useDispatch } from 'react-redux';

import api from '../../api/client';
import { fetchSettings } from '../../store/settingsSlice';
import { pushToast } from '../../store/uiSlice';
import { CURRENCY_NAMES, flagOf, formatIn } from '../../lib/currency';
import { formatDate } from '../../lib/format';
import { Refresh, Globe } from '../ui/Icons';

/**
 * Settings panel for the shop's language and currency pickers.
 * `form` / `setForm` are the Settings page's own state; saving happens with
 * the rest of Settings. "Update rates" saves straight away.
 */
export default function CurrencyPanel({ form, setForm }) {
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);
  const list = form.currencies || [];

  const setCur = (code, patch) =>
    setForm((f) => ({ ...f, currencies: (f.currencies || []).map((c) => (c.code === code ? { ...c, ...patch } : c)) }));

  const refresh = async () => {
    setBusy(true);
    try {
      const d = await api.post('/settings/rates', {}, { auth: true });
      setForm((f) => ({ ...f, currencies: d.settings.currencies, ratesUpdatedAt: d.settings.ratesUpdatedAt }));
      dispatch(fetchSettings());
      dispatch(pushToast({ message: 'Exchange rates updated', kind: 'ok' }));
    } catch (err) {
      dispatch(pushToast({ message: err.message, kind: 'bad' }));
    } finally {
      setBusy(false);
    }
  };

  const on = list.filter((c) => c.enabled).length;

  return (
    <div className="a-panel set-wide">
      <div className="a-panel-head">
        <div>
          <h2>Languages &amp; currencies</h2>
          <p>The globe button in your shop's header. Orders are always charged in rupees.</p>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={refresh} disabled={busy}>
          {busy ? <span className="spin" /> : <Refresh size={14} />} Update rates now
        </button>
      </div>
      <div className="a-panel-body">
        <div className="cur-switches">
          <label className="switch">
            <input type="checkbox" checked={form.showLanguagePicker !== false} onChange={(e) => setForm((f) => ({ ...f, showLanguagePicker: e.target.checked }))} />
            <i />
            <span>
              <Globe size={14} /> Language picker <small>(98 languages, by Google Translate)</small>
            </span>
          </label>
          <label className="switch">
            <input type="checkbox" checked={form.showCurrencyPicker !== false} onChange={(e) => setForm((f) => ({ ...f, showCurrencyPicker: e.target.checked }))} />
            <i />
            <span>
              Currency picker <small>({on} switched on)</small>
            </span>
          </label>
        </div>

        <p className="cur-updated">
          Rates last updated {form.ratesUpdatedAt ? formatDate(form.ratesUpdatedAt) : 'never'}. Each rate is how much of
          that currency one rupee buys.
        </p>

        <div className="cur-grid">
          {list.map((c) => (
            <div className={`cur-row${c.enabled ? ' on' : ''}`} key={c.code}>
              <label className="switch" title={c.code === 'PKR' ? 'Rupees are always on' : 'Offer this currency'}>
                <input type="checkbox" checked={c.enabled} disabled={c.code === 'PKR'} onChange={(e) => setCur(c.code, { enabled: e.target.checked })} />
                <i />
              </label>
              <span className="cur-flag" aria-hidden="true">
                {flagOf(c.code)}
              </span>
              <span className="cur-name">
                <b>{c.code}</b>
                <small>{CURRENCY_NAMES[c.code] || ''}</small>
              </span>
              {c.code === 'PKR' ? (
                <span className="cur-base">Main currency</span>
              ) : (
                <span className="cur-rate">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={c.rate}
                    onChange={(e) => setCur(c.code, { rate: e.target.value })}
                    aria-label={`${c.code} per rupee`}
                  />
                  <small>Rs 1,000 = {formatIn(1000, { code: c.code, rate: Number(c.rate) || 0 }, form)}</small>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
