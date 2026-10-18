import { useState, useEffect } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

import { login, clearError, clearExpiredNotice, selectIsAuthed } from '../../store/authSlice';
import { pushToast } from '../../store/uiSlice';
import { LogoImage } from '../../components/layout/Logo';
import { Lock, Alert, Clock, ArrowRight } from '../../components/ui/Icons';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const authed = useSelector(selectIsAuthed);
  const status = useSelector((s) => s.auth.status);
  const error = useSelector((s) => s.auth.error);
  const expiredNotice = useSelector((s) => s.auth.expiredNotice);
  const storeLogo = useSelector((s) => s.settings.data.logo);
  const storeName = useSelector((s) => s.settings.data.storeName) || 'Style & Carry';
  const sessionMinutes = useSelector((s) => Math.round((s.auth.sessionSeconds || 600) / 60));

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    document.title = 'Store login — Style & Carry';
    return () => {
      dispatch(clearError());
      document.title = 'Style & Carry — Wallets that carry well';
    };
  }, [dispatch]);

  if (authed) {
    return <Navigate to={location.state?.from || '/admin'} replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    dispatch(clearExpiredNotice());
    const result = await dispatch(login({ username: username.trim(), password }));

    if (login.fulfilled.match(result)) {
      dispatch(pushToast({ message: `Welcome back, ${result.payload.user.name}`, kind: 'ok' }));
      navigate(location.state?.from || '/admin', { replace: true });
    }
  };

  const busy = status === 'loading';

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <Link to="/" className={`logo${storeLogo ? ' has-img' : ''}`} aria-label={`${storeName} home`}>
          {storeLogo ? (
            <LogoImage logo={storeLogo} alt={storeName} />
          ) : (
            <>
              <span className="logo-mark">S&amp;C</span>
              <span>
                Style <em>&amp;</em> Carry
              </span>
            </>
          )}
        </Link>

        <h1>Store login</h1>
        <p>Sign in to manage orders, products and settings.</p>

        {expiredNotice && (
          <div className="alert alert-warn" role="status">
            <Clock size={17} />
            <span>
              Your session expired after {sessionMinutes} minute
              {sessionMinutes === 1 ? '' : 's'}. Please sign in again.
            </span>
          </div>
        )}

        {error && (
          <div className="alert alert-bad" role="alert">
            <Alert size={17} />
            <span>{error}</span>
          </div>
        )}

        <div className="inp">
          <label htmlFor="username">Email</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="you@example.com"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoFocus
            required
          />
        </div>

        <div className="inp">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>

        <div className="session-note">
          <Clock size={15} />
          <span>
            For safety, a sign-in lasts <b>{sessionMinutes} minutes</b>. You can extend it
            from inside the dashboard at any time.
          </span>
        </div>

        <button
          className="btn btn-primary btn-block btn-lg"
          type="submit"
          disabled={busy || !username.trim() || !password}
        >
          {busy ? (
            <>
              <span className="spin" /> Signing in…
            </>
          ) : (
            <>
              <Lock size={16} /> Sign in
            </>
          )}
        </button>

        <div className="login-foot">
          <Link to="/">
            Back to the storefront <ArrowRight size={13} />
          </Link>
        </div>
      </form>
    </div>
  );
}
