import { useState } from 'react';
import Icon from './Icon';
import { isValidEmail, isValidPassword } from '../utils/validators';

export default function CreateAccountForm({ onSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (name.trim().length === 0) {
      nextErrors.name = 'Enter your name.';
    }
    if (!isValidEmail(email)) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (!isValidPassword(password)) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }
    setErrors(nextErrors);

    const hasErrors = Object.keys(nextErrors).length > 0;
    if (!hasErrors) {
      onSuccess();
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="create-name">Name</label>
        <input
          id="create-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'create-name-error' : undefined}
        />
        {errors.name && (
          <p className="field-error" id="create-name-error">
            {errors.name}
          </p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="create-email">Email</label>
        <input
          id="create-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'create-email-error' : undefined}
        />
        {errors.email && (
          <p className="field-error" id="create-email-error">
            {errors.email}
          </p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="create-password">Password</label>
        <div className="password-input-row">
          <input
            id="create-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'create-password-error' : undefined}
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
          <p className="field-error" id="create-password-error">
            {errors.password}
          </p>
        )}
      </div>

      <button type="submit" className="primary-button btn-md">
        Create account
      </button>
    </form>
  );
}
