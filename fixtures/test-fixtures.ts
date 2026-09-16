import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { SignUpPage } from '../pages/SignUpPage';
import { DashboardPage } from '../pages/DashboardPage';

/**
 * Injects page objects so specs never construct them by hand, and so a locator change
 * only has to be made in one place.
 *
 * Use `test` from here rather than from '@playwright/test' anywhere in tests/.
 */
type Pages = {
  loginPage: LoginPage;
  signUpPage: SignUpPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  signUpPage: async ({ page }, use) => {
    await use(new SignUpPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});

export { expect };

/**
 * Opts a test out of the saved session, so it starts logged out.
 * Registration and login specs need this; everything else inherits the storage state.
 */
export const anonymous = { storageState: { cookies: [], origins: [] } };
