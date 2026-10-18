import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import api from '../../api/client';
import { CheckCircle, Alert, Mail, Lock, ArrowRight } from '../../components/ui/Icons';

/**
 * The page behind the link in an admin invitation. Verifies the email once,
 * then tells the new admin their sign-in details are on the way by email
 * (or shows them here if the email could not be sent).
 */
export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState({ status: 'working' });
  const [copied, setCopied] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    // Links are single use: make sure strict mode cannot spend it twice.
    if (ran.current) return;
    ran.current = true;
    document.title = 'Verify your email';
    api
      .post('/team/verify', { token })
      .then((d) => setState({ status: 'done', ...d }))
      .catch((err) => setState({ status: 'error', error: err.message }));
  }, [token]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.password);
      setCopied(true);
    } catch {}
  };

  return (
    <div className="login-page">
      <div className="login-card verify-card">
        {state.status === 'working' && (
          <div className="verify-state">
            <span className="spin verify-spin" />
            <h1>Verifying your email…</h1>
            <p>This only takes a moment.</p>
          </div>
        )}

        {state.status === 'done' && (
          <div className="verify-state">
            <span className="verify-ico ok">
              <CheckCircle size={30} />
            </span>
            <h1>Your email is verified</h1>
            {state.emailSent ? (
              <>
                <p>
                  We have emailed your sign-in details to <b>{state.email}</b>. Check your inbox, and the spam folder
                  if it is not there within a few minutes.
                </p>
                <div className="verify-steps">
                  <div>
                    <Mail size={16} /> Open the email with the subject “sign-in details”
                  </div>
                  <div>
                    <Lock size={16} /> Sign in, then change your password in Settings
                  </div>
                </div>
              </>
            ) : (
              <>
                <p>We could not send the email, so here are your sign-in details. Please save them now; they are shown only once.</p>
                <dl className="verify-creds">
                  <div>
                    <dt>Email</dt>
                    <dd>{state.email}</dd>
                  </div>
                  <div>
                    <dt>Password</dt>
                    <dd>
                      <code>{state.password}</code>
                      <button type="button" className="btn btn-outline btn-sm" onClick={copy}>
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </dd>
                  </div>
                </dl>
                <p className="verify-small">Change this password after you sign in (Settings → Change your password).</p>
              </>
            )}
            <Link to="/admin/login" className="btn btn-primary btn-lg btn-block">
              Go to sign in <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {state.status === 'error' && (
          <div className="verify-state">
            <span className="verify-ico bad">
              <Alert size={30} />
            </span>
            <h1>This link did not work</h1>
            <p>{state.error}</p>
            <Link to="/admin/login" className="btn btn-outline btn-block">
              Go to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
