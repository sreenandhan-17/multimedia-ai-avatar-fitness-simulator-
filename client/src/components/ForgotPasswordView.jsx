import { useState } from 'react';
import Icon from './Icon';
import { isValidEmail } from '../utils/validators';

export default function ForgotPasswordView({ onBackToSignIn }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }

    setError('');
    // UI only for now: no real email is sent.
    setSent(true);
  }

  if (sent) {
    return (
      <div className="forgot-password-view">
        <p className="forgot-password-message">
          Reset link sent to your email. Check your inbox.
        </p>
        <button type="button" className="link-button back-link" onClick={onBackToSignIn}>
          <Icon name="arrow-left" size={16} />
          <span>Back to sign in</span>
        </button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="forgot-email">Email</label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'forgot-email-error' : undefined}
        />
        {error && (
          <p className="field-error" id="forgot-email-error">
            {error}
          </p>
        )}
      </div>

      <button type="submit" className="primary-button btn-md">
        Send reset link
      </button>

      <button type="button" className="link-button back-link" onClick={onBackToSignIn}>
        <Icon name="arrow-left" size={16} />
        <span>Back to sign in</span>
      </button>
    </form>
  );
}
