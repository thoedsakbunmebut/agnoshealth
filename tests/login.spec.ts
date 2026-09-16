import { test, expect, anonymous } from '../fixtures/test-fixtures';
import { credentials, uniqueEmail, passwords } from '../utils/test-data';

/**
 * TC-LOGIN - Authentication, session and logout.
 *
 * These run logged out, so they opt out of the cached storage state.
 */
test.describe('Login, logout and session handling', () => {
  test.use(anonymous);

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('TC-LOGIN-01 signs in with valid credentials', async ({ loginPage, dashboardPage, page }) => {
    await loginPage.login(credentials.email, credentials.password);

    await expect(dashboardPage.logoutButton).toBeVisible();
    await expect(page).toHaveURL(/\/ai_dashboard\/?$/);
    await expect(dashboardPage.searchInput).toBeVisible();
  });

  test('TC-LOGIN-02 rejects a valid user with the wrong password', async ({ loginPage, dashboardPage }) => {
    await loginPage.login(credentials.email, 'definitely-the-wrong-password');

    await loginPage.expectInvalidCredentialsError();
    await expect(dashboardPage.logoutButton).toBeHidden();
  });

  test('TC-LOGIN-03 rejects an unknown user', async ({ loginPage, dashboardPage }) => {
    await loginPage.login(uniqueEmail('no.such.user'), passwords.valid);

    await loginPage.expectInvalidCredentialsError();
    await expect(dashboardPage.logoutButton).toBeHidden();
  });

  test('TC-LOGIN-04 keeps Sign in disabled while either field is empty', async ({ loginPage }) => {
    await loginPage.expectSignInDisabled();

    await loginPage.emailInput.fill(credentials.email);
    await loginPage.expectSignInDisabled();

    await loginPage.passwordInput.fill(credentials.password);
    await expect(loginPage.signInButton).toBeEnabled();

    await loginPage.emailInput.fill('');
    await loginPage.expectSignInDisabled();
  });

  test('TC-LOGIN-05 rejects a malformed e-mail address', async ({ loginPage, dashboardPage }) => {
    await loginPage.login('not-an-email', passwords.valid);

    await expect(dashboardPage.logoutButton).toBeHidden();
  });

  /**
   * The API answers a rejected credential with 500 rather than 401 (BUG-004), which makes
   * a real outage indistinguishable from a typo'd password.
   */
  test('TC-LOGIN-06 returns 401 for bad credentials, not 500 [BUG-004]', async ({ loginPage, page }) => {
    test.info().annotations.push({
      type: 'known-defect',
      description: 'BUG-004 - failed login responds 500 internal_server_error instead of 401',
    });

    const response = page.waitForResponse((r) => r.url().includes('/api/ai_dashboard/login'));
    await loginPage.login(credentials.email, 'definitely-the-wrong-password');

    expect((await response).status()).toBe(401);
  });

  test('TC-LOGIN-07 logs out and returns to the login screen', async ({ loginPage, dashboardPage, page }) => {
    await loginPage.login(credentials.email, credentials.password);
    await expect(dashboardPage.logoutButton).toBeVisible();

    await dashboardPage.logout();

    await expect(page).toHaveURL(/\/ai_dashboard\/login/);
    await expect(loginPage.emailInput).toBeVisible();
  });

  /**
   * Reproduces BUG-002: after logout the JWT and the patient's personal details are
   * still readable from localStorage, which matters on a shared hospital workstation.
   */
  test('TC-LOGIN-08 clears session and personal data on logout [BUG-002]', async ({
    loginPage,
    dashboardPage,
    page,
  }) => {
    test.info().annotations.push({
      type: 'known-defect',
      description: 'BUG-002 - logout leaves the access token and patient PII in localStorage',
    });

    await loginPage.login(credentials.email, credentials.password);
    await expect(dashboardPage.logoutButton).toBeVisible();
    await dashboardPage.logout();

    const leftovers = await page.evaluate(() => ({
      session: localStorage.getItem('session'),
      user: localStorage.getItem('user'),
      persistRoot: localStorage.getItem('persist:root'),
    }));

    expect(leftovers.session, 'access token must not survive logout').toBeNull();
    expect(leftovers.user, 'patient details must not survive logout').toBeNull();
    expect(leftovers.persistRoot, 'persisted store must not survive logout').toBeNull();
  });

  test('TC-LOGIN-09 keeps the session across a page reload', async ({ loginPage, dashboardPage, page }) => {
    await loginPage.login(credentials.email, credentials.password);
    await expect(dashboardPage.logoutButton).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(dashboardPage.logoutButton).toBeVisible();
    await expect(loginPage.emailInput).toBeHidden();
  });

  test('TC-LOGIN-10 sends an unauthenticated visitor to the login screen', async ({ loginPage, page }) => {
    await page.goto('/ai_dashboard', { waitUntil: 'domcontentloaded' });

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.signInButton).toBeVisible();
  });
});
