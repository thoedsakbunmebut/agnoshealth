/**
 * Test-data helpers.
 *
 * Tests run against a shared dev environment that other people are also using, so
 * anything a test creates must be unique per run and nothing may assume a fixed row
 * already exists.
 */

/** Credentials for the shared dashboard account, from .env. */
export const credentials = {
  email: process.env.TEST_EMAIL ?? 'test@gmail.com',
  password: process.env.TEST_PASSWORD ?? '12345',
};

export const apiUrl = process.env.API_URL ?? 'https://dev.api.agnoshealth.com';

/** A unique address per run, so registration tests never collide with each other. */
export function uniqueEmail(prefix = 'qa.auto'): string {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return `${prefix}.${stamp}@example.com`;
}

/**
 * Passwords the sign-up form accepts and rejects.
 *
 * `!` is rejected while `@` is accepted, although the on-screen policy mentions only
 * "one special character" - see BUG-005. `valid` is therefore the `@` variant.
 */
export const passwords = {
  valid: 'Passw0rd@',
  /** Meets every stated rule but is still rejected - the BUG-005 reproduction. */
  rejectedSpecialChar: 'Passw0rd!',
  tooShort: 'Ab1@',
  noUppercase: 'passw0rd@',
  noDigit: 'Password@',
  noSpecialChar: 'Passw0rd1',
};

/** Search terms that should return nothing rather than error or leak data. */
export const searchTerms = {
  noResults: 'zzz-no-such-patient-zzz',
  sqlInjection: "' OR 1=1 --",
  xss: '<script>alert(1)</script>',
  whitespace: '   ',
};
