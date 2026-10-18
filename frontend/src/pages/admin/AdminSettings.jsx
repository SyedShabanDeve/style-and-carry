import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';

import { saveSettings, selectSettings } from '../../store/settingsSlice';
import { changePassword, updateProfile } from '../../store/authSlice';
import { pushToast } from '../../store/uiSlice';
import { Alert, Check, Lock, Clock } from '../../components/ui/Icons';
import ImageField from '../../components/admin/ImageField';
import CurrencyPanel from '../../components/admin/CurrencyPanel';

export default function AdminSettings() {
  const dispatch = useDispatch();
  const settings = useSelector(selectSettings);
  const saving = useSelector((s) => s.settings.saving);

  const [form, setForm] = useState(settings);
  const [error, setError] = useState(null);

  const me = useSelector((s) => s.auth.user);
  const [name, setName] = useState(me?.name || '');
  const [nameBusy, setNameBusy] = useState(false);

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState(null);

  useEffect(() => setForm(settings), [settings]);

  /* "Change password" links land on that box. */
  const { hash } = useLocation();
  useEffect(() => {
    if (hash !== '#password') return;
    const t = setTimeout(() => document.getElementById('password')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    return () => clearTimeout(t);
  }, [hash]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggle = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.checked }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    const digits = String(form.phone).replace(/\D/g, '');
    if (!/^92\d{10}$/.test(digits) && !/^03\d{9}$/.test(digits)) {
      return setError('Enter the WhatsApp number like 0318 4051521 or 923184051521');
    }

    if (!form.codEnabled && !form.bankEnabled && !form.easypaisaEnabled && !form.jazzcashEnabled) {
      return setError('Keep at least one payment method switched on, or nobody can check out');
    }
    if (form.bankEnabled && !String(form.bankAccountNumber || '').trim()) {
      return setError('Add the bank account number before turning bank transfer on');
    }
    if (form.easypaisaEnabled && !String(form.easypaisaNumber || '').trim()) {
      return setError('Add the Easypaisa number before turning it on');
    }
    if (form.jazzcashEnabled && !String(form.jazzcashNumber || '').trim()) {
      return setError('Add the JazzCash number before turning it on');
    }

    const result = await dispatch(saveSettings({ ...form, phone: digits }));

    if (saveSettings.fulfilled.match(result)) {
      dispatch(pushToast({ message: 'Settings saved', kind: 'ok' }));
    } else {
      setError(result.payload || 'Could not save settings');
    }
  };

  const submitName = async (e) => {
    e.preventDefault();
    setNameBusy(true);
    const result = await dispatch(updateProfile({ name }));
    setNameBusy(false);
    if (updateProfile.fulfilled.match(result)) {
      dispatch(pushToast({ message: 'Your name has been updated', kind: 'ok' }));
    } else {
      dispatch(pushToast({ message: result.payload || 'Could not update your name', kind: 'bad' }));
    }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setPwError(null);

    if (pw.next.length < 8) return setPwError('New password must be at least 8 characters');
    if (pw.next !== pw.confirm) return setPwError('The two new passwords do not match');

    setPwBusy(true);
    const result = await dispatch(changePassword({ current: pw.current, next: pw.next }));
    setPwBusy(false);

    if (changePassword.fulfilled.match(result)) {
      dispatch(pushToast({ message: 'Password changed', kind: 'ok' }));
      setPw({ current: '', next: '', confirm: '' });
    } else {
      setPwError(result.payload || 'Could not change the password');
    }
  };

  return (
    /* The body is locked to the viewport, so the settings scroll in here and
       the page itself never gains a scrollbar. */
    <div className="a-scroll">
      <form onSubmit={submit} className="set-grid">
        {error && (
          <div className="alert alert-bad" role="alert">
            <Alert size={17} />
            <span>{error}</span>
          </div>
        )}

        <div className="a-panel">
          <div className="a-panel-head">
            <div>
              <h2>Store</h2>
              <p>Your store's name, logo and browser-tab line</p>
            </div>
          </div>
          <div className="a-panel-body">
            <div className="form-grid">
              <div className="inp">
                <label htmlFor="storeName">Store name</label>
                <input id="storeName" value={form.storeName || ''} onChange={set('storeName')} />
              </div>
              <div className="inp">
                <label htmlFor="tagline">Tagline</label>
                <input id="tagline" value={form.tagline || ''} onChange={set('tagline')} placeholder="Wallets, watches & more" />
                <span className="hint">Shown in the browser tab on your homepage</span>
              </div>
              <p className="full ed-note" style={{ marginTop: 0 }}>
                The announcement bar, banners and every page's text are in{' '}
                <Link to="/admin/homepage">Edit website</Link>.
              </p>
              <div className="inp full">
                <ImageField
                  kind="logo"
                  compact
                  optional
                  value={form.logo || ''}
                  onChange={(logo) => setForm((f) => ({ ...f, logo }))}
                />
                <span className="hint">Without a logo, the store name is shown as text. Press Save settings after uploading.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="a-panel">
          <div className="a-panel-head">
            <div>
              <h2>Contact</h2>
              <p>Where customers reach you</p>
            </div>
          </div>
          <div className="a-panel-body">
            <div className="form-grid">
              <div className="inp">
                <label htmlFor="phone">WhatsApp number</label>
                <input
                  id="phone"
                  value={form.phone || ''}
                  onChange={set('phone')}
                  placeholder="0318 4051521"
                  inputMode="numeric"
                />
                <span className="hint">Like 0318 4051521. Customers message you here.</span>
              </div>
              <div className="inp">
                <label htmlFor="phoneDisplay">Shown as</label>
                <input
                  id="phoneDisplay"
                  value={form.phoneDisplay || ''}
                  onChange={set('phoneDisplay')}
                  placeholder="0307 9415512"
                />
              </div>
              <div className="inp">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" value={form.email || ''} onChange={set('email')} />
              </div>
              <div className="inp">
                <label htmlFor="tiktok">TikTok link</label>
                <input id="tiktok" value={form.tiktok || ''} onChange={set('tiktok')} />
              </div>
              <div className="inp full">
                <label htmlFor="instagram">Instagram link (optional)</label>
                <input
                  id="instagram"
                  value={form.instagram || ''}
                  onChange={set('instagram')}
                  placeholder="https://instagram.com/…"
                />
              </div>
              <div className="inp full">
                <label htmlFor="address">Shop address (optional)</label>
                <input
                  id="address"
                  value={form.address || ''}
                  onChange={set('address')}
                  placeholder="Shop 12, Main Boulevard, Lahore"
                />
                <span className="hint">Shown in the footer. Leave empty if you only sell online.</span>
              </div>
              <div className="inp full">
                <label htmlFor="hours">Opening hours</label>
                <input id="hours" value={form.hours || ''} onChange={set('hours')} placeholder="Mon to Sat, 11am to 9pm" />
              </div>
            </div>
          </div>
        </div>

        <div className="a-panel">
          <div className="a-panel-head">
            <div>
              <h2>Delivery and returns</h2>
              <p>These drive the totals customers see at checkout</p>
            </div>
          </div>
          <div className="a-panel-body">
            <div className="form-grid">
              <div className="inp">
                <label htmlFor="deliveryFee">Delivery fee ({form.currency || 'Rs'})</label>
                <input
                  id="deliveryFee"
                  type="number"
                  min="0"
                  value={form.deliveryFee ?? ''}
                  onChange={set('deliveryFee')}
                />
              </div>
              <div className="inp">
                <label htmlFor="freeDeliveryOver">Free delivery over</label>
                <input
                  id="freeDeliveryOver"
                  type="number"
                  min="0"
                  value={form.freeDeliveryOver ?? ''}
                  onChange={set('freeDeliveryOver')}
                />
                <span className="hint">Set to 0 to make delivery always free</span>
              </div>
              <div className="inp">
                <label htmlFor="returnDays">Exchange window (days)</label>
                <input
                  id="returnDays"
                  type="number"
                  min="0"
                  value={form.returnDays ?? ''}
                  onChange={set('returnDays')}
                />
              </div>
              <div className="inp">
                <label htmlFor="currency">Currency symbol</label>
                <input id="currency" value={form.currency || ''} onChange={set('currency')} />
              </div>
            </div>
          </div>
        </div>

        <div className="a-panel">
          <div className="a-panel-head">
            <div>
              <h2>Payment methods</h2>
              <p>What customers can choose at checkout</p>
            </div>
          </div>
          <div className="a-panel-body">
            <label className="switch" style={{ marginBottom: 6 }}>
              <input type="checkbox" checked={!!form.codEnabled} onChange={toggle('codEnabled')} />
              <i />
              Cash on delivery
            </label>
            <p className="hint" style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 20 }}>
              The courier collects the money. Nothing else to fill in.
            </p>

            <label className="switch" style={{ marginBottom: 6 }}>
              <input
                type="checkbox"
                checked={!!form.bankEnabled}
                onChange={toggle('bankEnabled')}
              />
              <i />
              Bank transfer
            </label>
            {form.bankEnabled && (
              <div className="form-grid" style={{ marginBottom: 20 }}>
                <div className="inp">
                  <label htmlFor="bankName">Bank name</label>
                  <input
                    id="bankName"
                    value={form.bankName || ''}
                    onChange={set('bankName')}
                    placeholder="Meezan Bank"
                  />
                </div>
                <div className="inp">
                  <label htmlFor="bankAccountTitle">Account title</label>
                  <input
                    id="bankAccountTitle"
                    value={form.bankAccountTitle || ''}
                    onChange={set('bankAccountTitle')}
                    placeholder="Syed Shaban"
                  />
                </div>
                <div className="inp">
                  <label htmlFor="bankAccountNumber">Account number</label>
                  <input
                    id="bankAccountNumber"
                    value={form.bankAccountNumber || ''}
                    onChange={set('bankAccountNumber')}
                    placeholder="0123456789012"
                  />
                </div>
                <div className="inp">
                  <label htmlFor="bankIban">IBAN (optional)</label>
                  <input
                    id="bankIban"
                    value={form.bankIban || ''}
                    onChange={set('bankIban')}
                    placeholder="PK00MEZN0000000000000000"
                  />
                </div>
              </div>
            )}

            <label className="switch" style={{ marginBottom: 6 }}>
              <input
                type="checkbox"
                checked={!!form.easypaisaEnabled}
                onChange={toggle('easypaisaEnabled')}
              />
              <i />
              Easypaisa
            </label>
            {form.easypaisaEnabled && (
              <div className="form-grid" style={{ marginBottom: 20 }}>
                <div className="inp">
                  <label htmlFor="easypaisaName">Account title</label>
                  <input
                    id="easypaisaName"
                    value={form.easypaisaName || ''}
                    onChange={set('easypaisaName')}
                    placeholder="Syed Shaban"
                  />
                </div>
                <div className="inp">
                  <label htmlFor="easypaisaNumber">Easypaisa number</label>
                  <input
                    id="easypaisaNumber"
                    value={form.easypaisaNumber || ''}
                    onChange={set('easypaisaNumber')}
                    placeholder="0307 9415512"
                  />
                </div>
              </div>
            )}

            <label className="switch" style={{ marginBottom: 6 }}>
              <input
                type="checkbox"
                checked={!!form.jazzcashEnabled}
                onChange={toggle('jazzcashEnabled')}
              />
              <i />
              JazzCash
            </label>
            {form.jazzcashEnabled && (
              <div className="form-grid">
                <div className="inp">
                  <label htmlFor="jazzcashName">Account title</label>
                  <input
                    id="jazzcashName"
                    value={form.jazzcashName || ''}
                    onChange={set('jazzcashName')}
                    placeholder="Syed Shaban"
                  />
                </div>
                <div className="inp">
                  <label htmlFor="jazzcashNumber">JazzCash number</label>
                  <input
                    id="jazzcashNumber"
                    value={form.jazzcashNumber || ''}
                    onChange={set('jazzcashNumber')}
                    placeholder="0307 9415512"
                  />
                </div>
              </div>
            )}

            <div className="alert alert-warn" style={{ margin: '20px 0 0' }}>
              <Alert size={17} />
              <span>
                Transfers are confirmed by you, not automatically. The customer sends a
                receipt on WhatsApp and you mark the order paid on the Orders page.
              </span>
            </div>
          </div>
        </div>

        <CurrencyPanel form={form} setForm={setForm} />

        <div className="form-actions set-save">
          <button className="btn btn-primary btn-lg" type="submit" disabled={saving}>
            {saving ? (
              <>
                <span className="spin" /> Saving…
              </>
            ) : (
              <>
                <Check size={16} /> Save settings
              </>
            )}
          </button>
        </div>
      </form>

      {/* ---------- your name ---------- */}
      <form onSubmit={submitName} id="profile">
        <div className="a-panel">
          <div className="a-panel-head">
            <div>
              <h2>Your name</h2>
              <p>Shown in the dashboard and on the invitations you send</p>
            </div>
          </div>
          <div className="a-panel-body">
            <div className="form-grid">
              <div className="inp">
                <label htmlFor="my-name">Name</label>
                <input id="my-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
              </div>
              <div className="inp">
                <label>Email</label>
                <input value={me?.email || ''} disabled readOnly />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={nameBusy || name.trim().length < 2 || name.trim() === (me?.name || '')}>
                {nameBusy ? (<><span className="spin" /> Saving…</>) : (<><Check size={16} /> Save name</>)}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ---------- password ---------- */}
      <form onSubmit={submitPassword} id="password">
        <div className="a-panel">
          <div className="a-panel-head">
            <div>
              <h2>Change your password</h2>
              <p>Use something only you know</p>
            </div>
          </div>
          <div className="a-panel-body">
            {pwError && (
              <div className="alert alert-bad" role="alert">
                <Alert size={17} />
                <span>{pwError}</span>
              </div>
            )}

            <div className="form-grid">
              <div className="inp full">
                <label htmlFor="current">Current password</label>
                <input
                  id="current"
                  type="password"
                  value={pw.current}
                  onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="inp">
                <label htmlFor="next">New password</label>
                <input
                  id="next"
                  type="password"
                  value={pw.next}
                  onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                  autoComplete="new-password"
                  required
                />
                <span className="hint">At least 8 characters</span>
              </div>
              <div className="inp">
                <label htmlFor="confirm">Confirm new password</label>
                <input
                  id="confirm"
                  type="password"
                  value={pw.confirm}
                  onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                className="btn btn-primary"
                type="submit"
                disabled={pwBusy || !pw.current || !pw.next}
              >
                {pwBusy ? (
                  <>
                    <span className="spin" /> Changing…
                  </>
                ) : (
                  <>
                    <Lock size={15} /> Change password
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      <div className="alert alert-info">
        <Clock size={17} />
        <span>
          Admin sessions expire after 10 minutes. To change that, set{' '}
          <b>SESSION_MINUTES</b> in the backend's .env file and restart the server.
        </span>
      </div>
    </div>
  );
}
