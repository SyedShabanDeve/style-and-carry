import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

import api from '../../api/client';
import { pushToast } from '../../store/uiSlice';
import { formatDate } from '../../lib/format';
import { Users, Mail, Plus, Trash, Refresh, Check, Alert, Info, Lock } from '../../components/ui/Icons';

const BLANK_MAIL = { host: 'smtp.gmail.com', port: 587, secure: false, user: '', pass: '', from: '' };

/** A link the owner can copy when the invitation email could not be sent. */
function LinkBox({ link, onClose }) {
  const dispatch = useDispatch();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      dispatch(pushToast({ message: 'Link copied', kind: 'ok' }));
    } catch {
      dispatch(pushToast({ message: 'Could not copy. Select the link and copy it by hand.', kind: 'bad' }));
    }
  };
  return (
    <div className="alert alert-warn team-link" role="status">
      <Alert size={17} />
      <div>
        <b>The invitation email could not be sent.</b> Set up email below, or send this one-time link to the new admin
        yourself (for example on WhatsApp). It works once and expires in 48 hours.
        <div className="team-link-row">
          <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Verification link" />
          <button type="button" className="btn btn-primary btn-sm" onClick={copy}>
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

export default function AdminTeam() {
  const dispatch = useDispatch();
  const me = useSelector((s) => s.auth.user);
  const [users, setUsers] = useState(null);
  const [mailReady, setMailReady] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(null);
  const [link, setLink] = useState('');
  const [mail, setMail] = useState(null);
  const [mailOpen, setMailOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    try {
      const d = await api.get('/team', { auth: true });
      setUsers(d.users);
      setMailReady(d.mailReady);
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
    if (me?.role !== 'owner') return;
    load();
    loadMail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (me && me.role !== 'owner') return <Navigate to="/admin" replace />;

  const invite = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.name.trim().length < 2) return setError('Please enter the admin’s name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) return setError('Please enter a valid email address');
    setBusy('invite');
    try {
      const d = await api.post('/team', { name: form.name.trim(), email: form.email.trim() }, { auth: true });
      setForm({ name: '', email: '' });
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

  return (
    <div className="a-scroll">
      <div className="team">
        {/* ---------- invite ---------- */}
        <form className="a-panel" onSubmit={invite}>
          <div className="a-panel-head">
            <div>
              <h2>Add an admin</h2>
              <p>They get an email to verify their address, then a second email with their password.</p>
            </div>
          </div>
          <div className="a-panel-body">
            {error && (
              <div className="alert alert-bad" role="alert">
                <Alert size={17} />
                <span>{error}</span>
              </div>
            )}
            <div className="team-form">
              <div className="inp">
                <label htmlFor="tm-name">Name</label>
                <input id="tm-name" value={form.name} maxLength={60} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ali Raza" autoComplete="off" />
              </div>
              <div className="inp">
                <label htmlFor="tm-email">Email</label>
                <input id="tm-email" type="email" value={form.email} maxLength={120} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="ali@example.com" autoComplete="off" />
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy === 'invite'}>
                {busy === 'invite' ? <span className="spin" /> : <Plus size={15} />} Send invitation
              </button>
            </div>
            {!mailReady && (
              <p className="team-note">
                <Info size={14} /> Email is not set up yet. You can still add admins: you will get a link to send them yourself.
              </p>
            )}
            {link && <LinkBox link={link} onClose={() => setLink('')} />}

            <ol className="team-how">
              <li>
                <b>1</b> You add their name and email
              </li>
              <li>
                <b>2</b> They click the link in their email to verify it
              </li>
              <li>
                <b>3</b> They receive their password by email and sign in
              </li>
            </ol>
          </div>
        </form>

        {/* ---------- team list ---------- */}
        <div className="a-panel">
          <div className="a-panel-head">
            <div>
              <h2>Your team</h2>
              <p>Admins can manage orders, products and the website. Only you, the owner, can add or remove admins.</p>
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
                  </div>
                  <span className={`pill ${u.role === 'owner' ? 'info' : 'mute'}`}>{u.role === 'owner' ? 'Owner' : 'Admin'}</span>
                  {u.status === 'pending' ? (
                    <span className="pill warn" title={u.linkExpires ? `Link expires ${formatDate(u.linkExpires)}` : undefined}>
                      Waiting for verification
                    </span>
                  ) : (
                    <span className="pill ok">
                      <Check size={12} /> Verified
                    </span>
                  )}
                  <div className="row-act">
                    {u.status === 'pending' && (
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => resend(u)} disabled={busy === u.id}>
                        {busy === u.id ? <span className="spin" /> : <Refresh size={13} />} Resend link
                      </button>
                    )}
                    {u.role !== 'owner' && (
                      <button type="button" className="mini danger" onClick={() => setConfirm(u)} aria-label={`Remove ${u.name}`}>
                        <Trash size={14} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ---------- email settings ---------- */}
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
      </div>

      {confirm && (
        <div className="confirm">
          <div className="confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="tm-del-t">
            <div className="ring">
              <Users size={22} />
            </div>
            <h3 id="tm-del-t">Remove {confirm.name}?</h3>
            <p>They will be signed out and can no longer open the dashboard. You can invite them again later.</p>
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
    </div>
  );
}
