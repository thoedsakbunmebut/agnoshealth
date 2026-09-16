import { test, expect } from '../fixtures/test-fixtures';
import { searchTerms } from '../utils/test-data';
import { generateDiagnosisRecord } from '../utils/record-generator';

/**
 * TC-SRCH - Searching the Diagnosis List.
 *
 * The environment is shared, so nothing here assumes a particular row exists. The
 * round-trip test mints its own record through the consumer app first.
 */
test.describe('Record search', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test('TC-SRCH-01 searches for a record created during the run', async ({ dashboardPage, page }) => {
    test.slow(); // the consumer questionnaire takes a few minutes end to end

    const record = await generateDiagnosisRecord(page);

    await dashboardPage.goto();
    await dashboardPage.search(record.diagnosis);

    await expect(dashboardPage.totalCases).toBeVisible();
    expect(await dashboardPage.getTotalCases()).toBeGreaterThan(0);

    const diagnoses = await dashboardPage.getColumnValues('Diagnosis');
    expect(diagnoses.some((d) => d.includes(record.diagnosis))).toBe(true);
  });

  test('TC-SRCH-02 returns an empty result for an unknown term', async ({ dashboardPage }) => {
    await dashboardPage.search(searchTerms.noResults);

    expect(await dashboardPage.getTotalCases()).toBe(0);
    await expect(dashboardPage.emptyStateMessage).toBeVisible();
  });

  test('TC-SRCH-03 restores the full list when the search is cleared', async ({ dashboardPage }) => {
    const baseline = await dashboardPage.getTotalCases();

    await dashboardPage.search(searchTerms.noResults);
    expect(await dashboardPage.getTotalCases()).toBe(0);

    await dashboardPage.clearSearch();
    expect(await dashboardPage.getTotalCases()).toBe(baseline);
  });

  test('TC-SRCH-04 handles a SQL-injection style term safely', async ({ dashboardPage, page }) => {
    await dashboardPage.search(searchTerms.sqlInjection);

    // The app must stay up and must not dump the whole table in response.
    await expect(dashboardPage.recordsTable).toBeVisible();
    await expect(page.getByText(/error|exception|syntax/i)).toBeHidden();
  });

  test('TC-SRCH-05 does not execute script injected through the search box', async ({
    dashboardPage,
    page,
  }) => {
    let dialogFired = false;
    page.on('dialog', async (d) => {
      dialogFired = true;
      await d.dismiss();
    });

    await dashboardPage.search(searchTerms.xss);

    expect(dialogFired, 'an injected <script> must never execute').toBe(false);
    await expect(dashboardPage.recordsTable).toBeVisible();
  });

  test('TC-SRCH-06 treats a whitespace-only term as an empty search', async ({ dashboardPage }) => {
    const baseline = await dashboardPage.getTotalCases();

    await dashboardPage.search(searchTerms.whitespace);

    expect(await dashboardPage.getTotalCases()).toBe(baseline);
  });

  test('TC-SRCH-07 keeps the typed term visible after searching', async ({ dashboardPage }) => {
    await dashboardPage.search('Somchai');

    await expect(dashboardPage.searchInput).toHaveValue('Somchai');
  });
});
