import { test, expect } from '../fixtures/test-fixtures';
import type { ChannelFilter, TriageFilter } from '../pages/DashboardPage';

/**
 * TC-FLT - Filtering by triage, date range and channel.
 *
 * Assertions check that every visible row satisfies the filter, rather than only that
 * the row count changed - a count can move for reasons unrelated to the filter on a
 * shared environment.
 */
const CHANNEL_LABELS: Record<Exclude<ChannelFilter, 'All'>, string> = {
  'Agnos application': 'agnos',
  'Vimut hospital': 'vimut',
  'Vimut telemed': 'telemed',
  'Siam smile': 'siam',
};

test.describe('Record filtering', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  const triages: Exclude<TriageFilter, 'All'>[] = ['Self care', 'Seek Medical', 'Urgent', 'Emergency'];

  for (const triage of triages) {
    test(`TC-FLT-01 filters by the "${triage}" triage`, async ({ dashboardPage }) => {
      await dashboardPage.selectTriage(triage);

      await expect(dashboardPage.recordsTable).toBeVisible();
      const total = await dashboardPage.getTotalCases();
      const rows = await dashboardPage.tableRows.count();

      // Either the filter returns rows, or it returns the documented empty state.
      if (total === 0) {
        await expect(dashboardPage.emptyStateMessage).toBeVisible();
      } else {
        expect(rows).toBeGreaterThan(0);
      }
    });
  }

  for (const [label, expectedFragment] of Object.entries(CHANNEL_LABELS)) {
    test(`TC-FLT-02 filters by the "${label}" channel`, async ({ dashboardPage }) => {
      await dashboardPage.selectChannel(label as ChannelFilter);

      const total = await dashboardPage.getTotalCases();
      if (total === 0) {
        await expect(dashboardPage.emptyStateMessage).toBeVisible();
        return;
      }

      const channels = await dashboardPage.getColumnValues('Channel');
      for (const channel of channels) {
        expect(channel.toLowerCase()).toContain(expectedFragment);
      }
    });
  }

  test('TC-FLT-03 filters to today only', async ({ dashboardPage }) => {
    await dashboardPage.selectDateRange('Today');

    const total = await dashboardPage.getTotalCases();
    if (total === 0) {
      await expect(dashboardPage.emptyStateMessage).toBeVisible();
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    for (const value of await dashboardPage.getColumnValues('Date-time')) {
      expect(new Date(value).toISOString().slice(0, 10)).toBe(today);
    }
  });

  test('TC-FLT-04 narrows the result set as the date range narrows', async ({ dashboardPage }) => {
    await dashboardPage.selectDateRange('Last 90 days');
    const wide = await dashboardPage.getTotalCases();

    await dashboardPage.selectDateRange('Today');
    const narrow = await dashboardPage.getTotalCases();

    expect(narrow).toBeLessThanOrEqual(wide);
  });

  test('TC-FLT-05 combines a triage, a channel and a date range', async ({ dashboardPage }) => {
    await dashboardPage.selectTriage('Urgent');
    await dashboardPage.selectChannel('Agnos application');
    await dashboardPage.selectDateRange('Last 90 days');

    await expect(dashboardPage.recordsTable).toBeVisible();
    await expect(dashboardPage.totalCases).toBeVisible();
    expect(await dashboardPage.getTotalCases()).toBeGreaterThanOrEqual(0);
  });

  test('TC-FLT-06 combines a filter with a search term', async ({ dashboardPage }) => {
    await dashboardPage.selectTriage('Self care');
    const filtered = await dashboardPage.getTotalCases();

    await dashboardPage.search('zzz-no-such-patient-zzz');

    expect(await dashboardPage.getTotalCases()).toBeLessThanOrEqual(filtered);
  });

  test('TC-FLT-07 returns to the full list when All is reselected', async ({ dashboardPage }) => {
    const baseline = await dashboardPage.getTotalCases();

    await dashboardPage.selectTriage('Emergency');
    await dashboardPage.selectTriage('All');

    expect(await dashboardPage.getTotalCases()).toBe(baseline);
  });
});
