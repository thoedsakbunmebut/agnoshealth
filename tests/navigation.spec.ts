import { test, expect } from '../fixtures/test-fixtures';
import type { StatusTab, TriageFilter } from '../pages/DashboardPage';

/**
 * TC-NAV - Moving around the dashboard.
 *
 * The sidebar has exactly one destination, so "navigate through different tabs/pages"
 * means the three workflow tabs, the triage chips and the toolbar surfaces rather than
 * a multi-page menu.
 */
const STATUS_TABS: StatusTab[] = ['Open', 'In progress', 'Completed'];
const TRIAGE_CHIPS: TriageFilter[] = ['All', 'Self care', 'Seek Medical', 'Urgent', 'Emergency'];

test.describe('Dashboard navigation', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test('TC-NAV-01 shows the signed-in user and the Diagnosis List destination', async ({
    dashboardPage,
    page,
  }) => {
    await expect(dashboardPage.diagnosisListNav).toBeVisible();
    await expect(dashboardPage.logoutButton).toBeVisible();
    await expect(page.getByText('Diagnosis List').first()).toBeVisible();
  });

  test('TC-NAV-02 renders every toolbar control', async ({ dashboardPage }) => {
    await expect(dashboardPage.downloadButton).toBeVisible();
    await expect(dashboardPage.dateRangeTrigger).toBeVisible();
    await expect(dashboardPage.channelDropdownTrigger).toBeVisible();
    await expect(dashboardPage.searchInput).toBeVisible();
    await expect(dashboardPage.searchButton).toBeVisible();
    await expect(dashboardPage.totalCases).toBeVisible();
  });

  // Data-driven rather than one copy-pasted block per tab.
  for (const tab of STATUS_TABS) {
    test(`TC-NAV-03 opens the "${tab}" tab and keeps the table rendered`, async ({ dashboardPage, page }) => {
      await dashboardPage.selectStatusTab(tab);

      await expect(page.getByText(tab, { exact: true }).first()).toBeVisible();
      await expect(dashboardPage.recordsTable).toBeVisible();
      await expect(dashboardPage.totalCases).toBeVisible();
    });
  }

  test('TC-NAV-04 adds a "Completed by" column on the Completed tab only', async ({ dashboardPage }) => {
    await dashboardPage.selectStatusTab('Open');
    let headers = await dashboardPage.recordsTable.locator('thead th').allInnerTexts();
    expect(headers.map((h) => h.trim())).toEqual(['Date-time', 'Name', 'Diagnosis', 'Channel']);

    await dashboardPage.selectStatusTab('Completed');
    headers = await dashboardPage.recordsTable.locator('thead th').allInnerTexts();
    expect(headers.map((h) => h.trim())).toEqual([
      'Date-time',
      'Name',
      'Diagnosis',
      'Channel',
      'Completed by',
    ]);
  });

  for (const triage of TRIAGE_CHIPS) {
    test(`TC-NAV-05 exposes the "${triage}" triage chip`, async ({ page }) => {
      await expect(page.getByText(triage, { exact: true }).first()).toBeVisible();
    });
  }

  test('TC-NAV-06 opens and closes the channel dropdown', async ({ dashboardPage, page }) => {
    await dashboardPage.channelDropdownTrigger.click();

    for (const channel of ['Agnos application', 'Vimut hospital', 'Vimut telemed', 'Siam smile']) {
      await expect(page.getByText(channel, { exact: true })).toBeVisible();
    }

    // The dropdown is a click-toggle - it does not respond to Escape.
    await dashboardPage.channelDropdownTrigger.click();
    await expect(page.getByText('Vimut telemed', { exact: true })).toBeHidden();
  });

  test('TC-NAV-07 offers the documented date-range presets', async ({ dashboardPage, page }) => {
    await dashboardPage.dateRangeTrigger.click();

    for (const preset of ['Today', 'This week', 'This month', 'This year', 'Last 14 days', 'Last 90 days']) {
      await expect(page.getByText(preset, { exact: true })).toBeVisible();
    }
  });

  /**
   * Switching tabs leaves the URL untouched, so a refresh or a shared link always
   * returns the user to the default tab. Raised as an observation in the report:
   * the selected tab should survive a reload.
   */
  test('TC-NAV-08 restores the selected tab after a reload', async ({ dashboardPage, page }) => {
    test.info().annotations.push({
      type: 'known-defect',
      description: 'Tab state is not reflected in the URL, so it cannot survive a reload or be deep-linked',
    });

    await dashboardPage.selectStatusTab('Completed');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await dashboardPage.waitUntilReady();

    const headers = await dashboardPage.recordsTable.locator('thead th').allInnerTexts();
    expect(headers.map((h) => h.trim())).toContain('Completed by');
  });
});
