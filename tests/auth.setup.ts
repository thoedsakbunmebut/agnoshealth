import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { credentials } from '../utils/test-data';
import { STORAGE_STATE } from '../playwright.config';

/**
 * Logs in once per run and caches the session, so the other specs do not each pay the
 * 25-30 s cold-load and login round trip.
 */
setup('authenticate as the shared dashboard user', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await loginPage.goto();
  await loginPage.login(credentials.email, credentials.password);

  await expect(dashboardPage.logoutButton).toBeVisible();
  await expect(page).toHaveURL(/\/ai_dashboard\/?$/);

  await page.context().storageState({ path: STORAGE_STATE });
});
