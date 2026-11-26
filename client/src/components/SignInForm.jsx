import { useState } from 'react';
import Icon from './Icon';
import { isValidEmail, isValidPassword } from '../utils/validators';
import { getAuthErrorMessage, signIn } from '../services/auth';

export default function SignInForm({ onSuccess, onForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (!isValidEmail(email)) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (!isValidPassword(password)) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }
    setErrors(nextErrors);

    setFormError('');

    const hasErrors = Object.keys(nextErrors).length > 0;
    if (hasErrors) {
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email, password);
      onSuccess();
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    }
    setSubmitting(false);
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="signin-email">Email</label>
        <input
          id="signin-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'signin-email-error' : undefined}
        />
        {errors.email && (
          <p className="field-error" id="signin-email-error">
            {errors.email}
          </p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="signin-password">Password</label>
        <div className="password-input-row">
          <input
            id="signin-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'signin-password-error' : undefined}
          />
          <button
            type="button"
            className="show-hide-button btn-secondary btn-md"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} />
          </button>
        </div>
        {errors.password && (
          <p className="field-error" id="signin-password-error">
            {errors.password}
          </p>
        )}
      </div>

      <button type="button" className="link-button" onClick={onForgotPassword}>
        Forgot password?
      </button>

      {formError && (
        <p className="field-error" role="alert">
          {formError}
        </p>
      )}

      <button type="submit" className="primary-button btn-md" disabled={submitting}>
        {submitting ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
