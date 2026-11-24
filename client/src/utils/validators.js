// Shared validation rules for the login and create-account forms.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidPassword(value) {
  return value.length >= 6;
}
