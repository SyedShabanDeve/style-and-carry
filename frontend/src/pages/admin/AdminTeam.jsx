import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import api from '../../api/client';
import { pushToast } from '../../store/uiSlice';
import { formatDate } from '../../lib/format';
import { Users, Mail, Plus, Trash, Refresh, Check, Alert, Info, Lock, Phone, Eye } from '../../components/ui/Icons';

const BLANK_MAIL = { host: 'smtp.gmail.com', port: 587, secure: false, user: '', pass: '', from: '' };
const BLANK = { name: '', email: '', phone: '', password: '' };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** 12 easy-to-read characters, for a new admin's first password. */
function makePassword() {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '@#$%*!'];
  const all = sets.join('');
  const pick = (s) => s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length];
  const chars = [...sets.map(pick), ...Array.from({ length: 8 }, () => pick(all))];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function useCopy() {
  const dispatch = useDispatch();
  return async (text, what = 'Copied') => {
    try {
      await navigator.clipboard.writeText(text);
      dispatch(pushToast({ message: what, kind: 'ok' }));
    } catch {
      dispatch(pushToast({ message: 'Could not copy. Select the text and copy it by hand.', kind: 'bad' }));
    }
  };
}

/** A link the owner can copy when the invitation email could not be sent. */
function LinkBox({ link, onClose }) {
  const copy = useCopy();
  return (
    <div className="alert alert-warn team-link" role="status">
      <Alert size={17} />
      <div>
        <b>The invitation email could not be sent.</b> Set up email below, or send this one-time link to the new admin
        yourself (for example on WhatsApp). It works once and expires in 48 hours.
        <div className="team-link-row">
          <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Verification link" />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => copy(link, 'Link copied')}>
            Copy link
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/** Sign-in details to pass on to an admin, shown once after they are set. */
function DetailsBox({ details, onClose }) {
  const copy = useCopy();
  const text = `Style & Carry dashboard\n${window.location.origin}/admin\nEmail: ${details.email}\nPassword: ${details.password}`;
  return (
    <div className="alert alert-ok team-details" role="status">
      <Check size={17} />
      <div>
        <b>{details.title}</b> Send these sign-in details to {details.name}, for example on WhatsApp. For safety they are
        shown only now.
        <dl className="team-cred">
          <dt>Email</dt>
          <dd>{details.email}</dd>
          <dt>Password</dt>
          <dd className="mono">{details.password}</dd>
        </dl>
        <div className="team-link-row">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => copy(text, 'Sign-in details copied')}>
            Copy sign-in details
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminTeam() {
  const dispatch = useDispatch();
  const me = useSelector((s) => s.auth.user);
  const owner = me?.role === 'owner';
  const [users, setUsers] = useState(null);
  const [mailReady, setMailReady] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [showPw, setShowPw] = useState(false);
  const [viaEmail, setViaEmail] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(null);
  const [link, setLink] = useState('');
  const [details, setDetails] = useState(null);
  const [mail, setMail] = useState(null);
  const [mailOpen, setMailOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [pwFor, setPwFor] = useState(null); // { user, value }

  const load = async () => {
    try {
      const d = await api.get('/team', { auth: true });
      setUsers(d.users);
      setMailReady(Boolean(d.mailReady));
    } catch (err) {
      setUsers([]);
      dispatch(pushToast({ title: 'Could not load the team', message: err.message, kind: 'bad' }));
    }
  };
  const loadMail = async () => {
    try {
      const d = await api.get('/team/mail', { auth: true });
      setMail({ ...BLANK_MAIL, ...d.mail, host: d.mail.host || BLANK_MAIL.host, pass: '' });
    } catch {}
  };

  useEffect(() => {
    load();
    if (owner) loadMail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  /* ---------- add an admin with a password (owner and admins) ---------- */
  const addDirect = async (e) => {
    e.preventDefault();
    setError(null);
    const f = { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password };
    if (f.name.length < 2) return setError('Please enter the admin’s name');
    if (!EMAIL.test(f.email)) return setError('Please enter a valid email address');
    if (f.phone && !/^[0-9+ -]{7,20}$/.test(f.phone)) return setError('Please enter a valid phone number, like 0300 1234567');
    if (f.password.length < 8) return setError('The password needs at least 8 characters');
    setBusy('add');
    try {
      const d = await api.post('/team/direct', f, { auth: true });
      setDetails({ title: 'Admin added.', name: d.user.name, email: d.user.email, password: f.password });
      setForm(BLANK);
      setShowPw(false);
      dispatch(pushToast({ title: 'Admin added', message: `${d.user.name} can sign in now.`, kind: 'ok' }));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  /* ---------- or invite by email (owner) ---------- */
  const invite = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.name.trim().length < 2) return setError('Please enter the admin’s name');
    if (!EMAIL.test(form.email.trim())) return setError('Please enter a valid email address');
    setBusy('add');
    try {
      const d = await api.post('/team', { name: form.name.trim(), email: form.email.trim() }, { auth: true });
      setForm(BLANK);
      if (d.emailSent) {
        dispatch(pushToast({ title: 'Invitation sent', message: `A verification link was emailed to ${d.user.email}.`, kind: 'ok' }));
        setLink('');
      } else {
        setLink(d.link);
        dispatch(pushToast({ title: 'Admin added', message: 'The email could not be sent, so copy the link below.', kind: 'warn' }));
      }
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const resend = async (u) => {
    setBusy(u.id);
    try {
      const d = await api.post(`/team/${u.id}/resend`, {}, { auth: true });
      if (d.emailSent) dispatch(pushToast({ title: 'New link sent', message: `Emailed to ${u.email}.`, kind: 'ok' }));
      else {
        setLink(d.link);
        dispatch(pushToast({ title: 'New link created', message: 'Email is not working, so copy the link below.', kind: 'warn' }));
      }
      load();
    } catch (err) {
      dispatch(pushToast({ title: 'Could not create a new link', message: err.message, kind: 'bad' }));
    } finally {
      setBusy('');
    }
  };

  /* ---------- owner: new password, remove ---------- */
  const savePassword = async (e) => {
    e.preventDefault();
    const { user, value } = pwFor;
    if (value.length < 8) return dispatch(pushToast({ message: 'The password needs at least 8 characters', kind: 'bad' }));
    setBusy('pw');
    try {
      await api.put(`/team/${user.id}/password`, { password: value }, { auth: true });
      setPwFor(null);
      setDetails({ title: 'New password set.', name: user.name, email: user.email, password: value });
      dispatch(pushToast({ title: 'Password changed', message: `${user.name} signs in with the new password from now on.`, kind: 'ok' }));
      load();
    } catch (err) {
      dispatch(pushToast({ title: 'Could not change the password', message: err.message, kind: 'bad' }));
    } finally {
      setBusy('');
    }
  };

  const remove = async () => {
    const u = confirm;
    setConfirm(null);
    try {
      await api.del(`/team/${u.id}`, { auth: true });
      dispatch(pushToast({ title: 'Admin removed', message: `${u.name} can no longer sign in.`, kind: 'ok' }));
      load();
    } catch (err) {
      dispatch(pushToast({ title: 'Could not remove', message: err.message, kind: 'bad' }));
    }
  };

  /* ---------- email settings (owner) ---------- */
  const saveMail = async (e) => {
    e.preventDefault();
    setBusy('mail');
    try {
      const d = await api.put('/team/mail', mail, { auth: true });
      setMailReady(d.mailReady);
      setMail((m) => ({ ...m, pass: '', hasPassword: m.hasPassword || Boolean(m.pass) }));
      dispatch(pushToast({ title: 'Email settings saved', message: d.mailReady ? 'Send a test to check it works.' : 'Fill in every box to switch email on.', kind: 'ok' }));
    } catch (err) {
      dispatch(pushToast({ title: 'Could not save', message: err.message, kind: 'bad' }));
    } finally {
      setBusy('');
    }
  };

  const testMail = async () => {
    setBusy('test');
    try {
      const d = await api.post('/team/mail/test', {}, { auth: true });
      dispatch(pushToast({ title: 'Test email sent', message: `Check the inbox of ${d.to}.`, kind: 'ok' }));
    } catch (err) {
      dispatch(pushToast({ title: 'The test email failed', message: err.message, kind: 'bad', ms: 9000 }));
    } finally {
      setBusy('');
    }
  };

  const setM = (k) => (e) => setMail((m) => ({ ...m, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const byEmail = owner && viaEmail;

  return (
    <div className="a-scroll">
      <div className="team">
        {/* ---------- add ---------- */}
        <form className="a-panel" onSubmit={byEmail ? invite : addDirect}>
          <div className="a-panel-head">
            <div>
              <h2>Add an admin</h2>
              <p>
                {byEmail
                  ? 'They get an email to verify their address, then a second email with their password.'
                  : 'Give them a password here and they can sign in straight away.'}
              </p>
            </div>
            {owner && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setViaEmail((v) => !v)}>
                {byEmail ? <Lock size={14} /> : <Mail size={14} />} {byEmail ? 'Set a password instead' : 'Invite by email instead'}
              </button>
            )}
          </div>
          <div className="a-panel-body">
            {error && (
              <div className="alert alert-bad" role="alert">
                <Alert size={17} />
                <span>{error}</span>
              </div>
            )}
            <div className={`team-form${byEmail ? '' : ' team-form-4'}`}>
              <div className="inp">
                <label htmlFor="tm-name">Name</label>
                <input id="tm-name" value={form.name} maxLength={60} onChange={setF('name')} placeholder="Ali Raza" autoComplete="off" />
              </div>
              <div className="inp">
                <label htmlFor="tm-email">Email (Gmail)</label>
                <input id="tm-email" type="email" value={form.email} maxLength={120} onChange={setF('email')} placeholder="ali@gmail.com" autoComplete="off" />
              </div>
              {!byEmail && (
                <>
                  <div className="inp">
                    <label htmlFor="tm-phone">Phone number</label>
                    <input id="tm-phone" type="tel" value={form.phone} maxLength={20} onChange={setF('phone')} placeholder="0300 1234567" autoComplete="off" />
                  </div>
                  <div className="inp">
                    <label htmlFor="tm-pass">Password</label>
                    <div className="team-pw">
                      <input
                        id="tm-pass"
                        type={showPw ? 'text' : 'password'}
                        value={form.password}
                        onChange={setF('password')}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                      />
                      <button type="button" className="mini" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                        <Eye size={14} />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="link-btn team-gen"
                      onClick={() => {
                        setForm((f) => ({ ...f, password: makePassword() }));
                        setShowPw(true);
                      }}
                    >
                      Make a strong password for me
                    </button>
                  </div>
                </>
              )}
              <button type="submit" className="btn btn-primary" disabled={busy === 'add'}>
                {busy === 'add' ? <span className="spin" /> : <Plus size={15} />} {byEmail ? 'Send invitation' : 'Add admin'}
              </button>
            </div>
            {byEmail && !mailReady && (
              <p className="team-note">
                <Info size={14} /> Email is not set up yet. You can still invite: you will get a link to send them yourself.
              </p>
            )}
            {link && <LinkBox link={link} onClose={() => setLink('')} />}
            {details && <DetailsBox details={details} onClose={() => setDetails(null)} />}
          </div>
        </form>

        {/* ---------- team list ---------- */}
        <div className="a-panel">
          <div className="a-panel-head">
            <div>
              <h2>Your team</h2>
              <p>
                {owner
                  ? 'Admins can manage orders, products and the website, and add other admins. Only you can remove admins, and nobody can remove you.'
                  : 'Admins can manage orders, products and the website, and add other admins. Only the owner can remove admins.'}
              </p>
            </div>
          </div>
          {!users ? (
            <div className="page-load" style={{ minHeight: 160 }}>
              <div className="spin" />
            </div>
          ) : (
            <ul className="team-list">
              {users.map((u) => (
                <li key={u.id}>
                  <span className="team-av" aria-hidden="true">
                    {(u.name || u.email).slice(0, 1).toUpperCase()}
                  </span>
                  <div className="team-who">
                    <strong>
                      {u.name}
                      {u.id === me?.id && <small> (you)</small>}
                    </strong>
                    <span>{u.email}</span>
                    {(u.phone || u.addedByName) && (
                      <small className="team-meta">
                        {u.phone && (
                          <>
                            <Phone size={11} /> {u.phone}
                          </>
                        )}
                        {u.phone && u.addedByName && ' · '}
                        {u.addedByName && `added by ${u.addedByName}`}
                      </small>
                    )}
                  </div>
                  <span className={`pill ${u.role === 'owner' ? 'info' : 'mute'}`}>{u.role === 'owner' ? 'Owner' : 'Admin'}</span>
                  {u.status === 'pending' ? (
                    <span className="pill warn" title={u.linkExpires ? `Link expires ${formatDate(u.linkExpires)}` : undefined}>
                      Waiting for verification
                    </span>
                  ) : (
                    <span className="pill ok">
                      <Check size={12} /> Active
                    </span>
                  )}
                  {owner && (
                    <div className="row-act">
                      {u.status === 'pending' && (
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => resend(u)} disabled={busy === u.id}>
                          {busy === u.id ? <span className="spin" /> : <Refresh size={13} />} Resend link
                        </button>
                      )}
                      {u.role !== 'owner' && (
                        <>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPwFor({ user: u, value: makePassword() })}>
                            <Lock size={13} /> <span className="hide-sm">Set password</span>
                          </button>
                          <button type="button" className="mini danger" onClick={() => setConfirm(u)} aria-label={`Remove ${u.name}`}>
                            <Trash size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ---------- email settings (owner) ---------- */}
        {owner && (
          <form className="a-panel" onSubmit={saveMail}>
            <div className="a-panel-head">
              <div>
                <h2>
                  Email settings{' '}
                  <span className={`pill ${mailReady ? 'ok' : 'warn'}`}>{mailReady ? 'Working' : 'Not set up'}</span>
                </h2>
                <p>Used to send invitations and passwords. Works with Gmail, Outlook or your host's email.</p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMailOpen((o) => !o)}>
                <Mail size={14} /> {mailOpen ? 'Hide' : 'Set up email'}
              </button>
            </div>
            {mailOpen && mail && (
              <div className="a-panel-body">
                {mail.fromEnv && (
                  <p className="team-note">
                    <Info size={14} /> Email is set in the server's .env file, which takes priority over these boxes.
                  </p>
                )}
                <div className="team-gmail">
                  <b>Using Gmail?</b> Turn on 2-Step Verification on the Google account, then create an <b>App password</b> at
                  myaccount.google.com/apppasswords and paste the 16 letters below. Your normal Gmail password will not work.
                </div>
                <div className="form-grid">
                  <div className="inp">
                    <label htmlFor="ml-host">SMTP server</label>
                    <input id="ml-host" value={mail.host} onChange={setM('host')} placeholder="smtp.gmail.com" />
                  </div>
                  <div className="inp">
                    <label htmlFor="ml-port">Port</label>
                    <input id="ml-port" type="number" value={mail.port} onChange={setM('port')} placeholder="587" />
                    <span className="hint">587 for most, 465 for SSL</span>
                  </div>
                  <div className="inp">
                    <label htmlFor="ml-user">Email address (login)</label>
                    <input id="ml-user" type="email" value={mail.user} onChange={setM('user')} placeholder="you@gmail.com" autoComplete="off" />
                  </div>
                  <div className="inp">
                    <label htmlFor="ml-pass">
                      <Lock size={12} /> App password
                    </label>
                    <input
                      id="ml-pass"
                      type="password"
                      value={mail.pass}
                      onChange={setM('pass')}
                      placeholder={mail.hasPassword ? 'Saved. Type to replace it' : '16-letter app password'}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="inp">
                    <label htmlFor="ml-from">Send as (optional)</label>
                    <input id="ml-from" type="email" value={mail.from} onChange={setM('from')} placeholder="Same as the login" />
                  </div>
                  <div className="inp" style={{ justifyContent: 'flex-end' }}>
                    <label className="switch" style={{ marginBottom: 10 }}>
                      <input type="checkbox" checked={Boolean(mail.secure)} onChange={setM('secure')} />
                      <i />
                      Use SSL (port 465)
                    </label>
                  </div>
                </div>
                <div className="team-mail-act">
                  <button type="button" className="btn btn-outline" onClick={testMail} disabled={!mailReady || busy === 'test'}>
                    {busy === 'test' ? <span className="spin" /> : <Mail size={14} />} Send a test to {me?.email}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={busy === 'mail'}>
                    {busy === 'mail' ? <span className="spin" /> : <Check size={14} />} Save email settings
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>

      {confirm && (
        <div className="confirm">
          <div className="confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="tm-del-t">
            <div className="ring">
              <Users size={22} />
            </div>
            <h3 id="tm-del-t">Remove {confirm.name}?</h3>
            <p>They will be signed out and can no longer open the dashboard. You can add them again later.</p>
            <div className="confirm-act">
              <button className="btn btn-outline" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={remove}>
                Remove admin
              </button>
            </div>
          </div>
        </div>
      )}

      {pwFor && (
        <div className="confirm">
          <form className="confirm-box" role="dialog" aria-modal="true" aria-labelledby="tm-pw-t" onSubmit={savePassword}>
            <div className="ring">
              <Lock size={22} />
            </div>
            <h3 id="tm-pw-t">New password for {pwFor.user.name}</h3>
            <p>Their old password stops working. You will see the new one once, to send it to them.</p>
            <div className="inp" style={{ textAlign: 'left' }}>
              <label htmlFor="tm-newpw">New password</label>
              <input id="tm-newpw" value={pwFor.value} onChange={(e) => setPwFor((p) => ({ ...p, value: e.target.value }))} autoComplete="new-password" />
              <button type="button" className="link-btn team-gen" onClick={() => setPwFor((p) => ({ ...p, value: makePassword() }))}>
                Make another one
              </button>
            </div>
            <div className="confirm-act">
              <button type="button" className="btn btn-outline" onClick={() => setPwFor(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy === 'pw'}>
                {busy === 'pw' ? <span className="spin" /> : <Check size={14} />} Set password
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
