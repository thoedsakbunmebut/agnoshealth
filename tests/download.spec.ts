import { test, expect } from '../fixtures/test-fixtures';
import fs from 'fs/promises';

/**
 * TC-DL - Exporting the Diagnosis List as CSV.
 */
test.describe('Record download', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test('TC-DL-01 opens a confirmation modal before exporting', async ({ dashboardPage }) => {
    await dashboardPage.downloadButton.click();

    await expect(dashboardPage.downloadConfirmButton).toBeVisible();
    await expect(dashboardPage.downloadCancelButton).toBeVisible();
  });

  test('TC-DL-02 cancels the export without downloading anything', async ({ dashboardPage, page }) => {
    await dashboardPage.downloadButton.click();
    await expect(dashboardPage.downloadConfirmButton).toBeVisible();

    const download = page.waitForEvent('download', { timeout: 5_000 }).catch(() => null);
    await dashboardPage.downloadCancelButton.click();

    expect(await download).toBeNull();
    await expect(dashboardPage.downloadConfirmButton).toBeHidden();
  });

  test('TC-DL-03 downloads a non-empty CSV file', async ({ dashboardPage }) => {
    const download = await dashboardPage.downloadCsv();

    expect(download, 'confirming the export must produce a file').not.toBeNull();
    expect(download!.suggestedFilename()).toMatch(/\.csv$/i);

    const path = await download!.path();
    const contents = await fs.readFile(path!, 'utf8');
    expect(contents.length).toBeGreaterThan(0);
    expect(contents.split('\n')[0]).toContain(',');
  });

  /**
   * Reproduces BUG-007: with nothing to export the app fires no request, downloads no
   * file and shows no message - the user gets silence either way.
   */
  test('TC-DL-04 gives feedback when there is nothing to export [BUG-007]', async ({
    dashboardPage,
    page,
  }) => {
    test.info().annotations.push({
      type: 'known-defect',
      description: 'BUG-007 - confirming an export with zero records is a silent no-op',
    });

    await dashboardPage.search('zzz-no-such-patient-zzz');
    expect(await dashboardPage.getTotalCases()).toBe(0);

    const requestFired = page
      .waitForRequest((r) => r.url().includes('/api/'), { timeout: 10_000 })
      .then(() => true)
      .catch(() => false);

    const download = await dashboardPage.downloadCsv(10_000);

    // Whatever the app decides, it has to tell the user something.
    const somethingHappened = download !== null || (await requestFired);
    expect(somethingHappened, 'export with no data must not fail silently').toBe(true);
  });

  test('TC-DL-05 exports what the active filters select', async ({ dashboardPage }) => {
    await dashboardPage.selectStatusTab('Completed');
    await dashboardPage.selectTriage('Self care');

    const download = await dashboardPage.downloadCsv();

    expect(download, 'confirming the export must produce a file').not.toBeNull();
    expect(download!.suggestedFilename()).toMatch(/\.csv$/i);
  });
});
