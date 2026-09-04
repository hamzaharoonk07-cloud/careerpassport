import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/primitives/Button.jsx';
import { api, apiError } from '../services/api.js';
import '../styles/hub.css';

/**
 * Forgot password, in two steps on one page.
 *
 * Step one asks for the address and step two takes the six-digit code, but
 * they share a screen — sending someone to a second page loses whoever
 * switched to their email app and came back.
 *
 * The first step always reports success, whether or not the address is
 * registered. That is deliberate on the server, and this page must not
 * contradict it by behaving differently for a known address.
 */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirm] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const request = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setNote(data.message);
      setStep('reset');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { email, code, password, confirmPassword });
      navigate('/login', { replace: true, state: { note: 'Password changed. Sign in with the new one.' } });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page wrap-narrow">
      <header className="page__head">
        <div>
          <p className="t-eyebrow">Passport control</p>
          <h1 className="t-h2 page__title">Lost your password</h1>
          <p className="t-lead" style={{ marginTop: 'var(--sp-4)' }}>
            We send a six-digit code to your email. It is valid for fifteen minutes.
          </p>
        </div>
      </header>

      {note && <p className="anotice" role="status">{note}</p>}
      {error && <div className="auth__alert" role="alert">{error}</div>}

      {step === 'request' ? (
        <form className="hub__form" onSubmit={request}>
          <label className="af">
            <span className="af__label">The email on your passport</span>
            <input
              className="af__input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          <div style={{ marginTop: 'var(--sp-4)' }}>
            <Button type="submit" size="lg" loading={busy} disabled={busy || !email.trim()}>
              Send me a code
            </Button>
          </div>
          <p className="af__hint" style={{ marginTop: 'var(--sp-4)' }}>
            Remembered it? <Link to="/login" className="hub__link">Sign in instead</Link>.
          </p>
        </form>
      ) : (
        <form className="hub__form" onSubmit={reset}>
          <label className="af">
            <span className="af__label">Six-digit code</span>
            <input
              className="af__input"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
            />
          </label>

          <label className="af">
            <span className="af__label">New password</span>
            <input
              className="af__input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
          </label>

          <label className="af">
            <span className="af__label">Confirm new password</span>
            <input
              className="af__input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </label>

          <div style={{ marginTop: 'var(--sp-4)' }}>
            <Button type="submit" size="lg" loading={busy} disabled={busy || code.length !== 6}>
              Change my password
            </Button>
          </div>

          <p className="af__hint" style={{ marginTop: 'var(--sp-4)' }}>
            Changing it signs out every device currently using this account.{' '}
            <button type="button" className="alink" onClick={() => { setStep('request'); setNote(''); }}>
              Send a new code
            </button>
          </p>
        </form>
      )}
    </div>
  );
}
