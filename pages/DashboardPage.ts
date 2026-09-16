import { Page, Locator, expect, Download } from '@playwright/test';
import { BasePage } from './BasePage';

/** The three workflow tabs above the records table. */
export type StatusTab = 'Open' | 'In progress' | 'Completed';

/** Triage chips. The API enum carries three further values the UI never exposes. */
export type TriageFilter = 'All' | 'Self care' | 'Seek Medical' | 'Urgent' | 'Emergency';

/** Options in the Channel dropdown, as labelled in the UI. */
export type ChannelFilter =
  | 'All'
  | 'Agnos application'
  | 'Vimut hospital'
  | 'Vimut telemed'
  | 'Siam smile';

/** Presets offered by the date-range picker. */
export type DateRangePreset =
  | 'Today'
  | 'This week'
  | 'This month'
  | 'This year'
  | 'Last week'
  | 'Last 14 days'
  | 'Last month'
  | 'Last 60 days'
  | 'Last 90 days'
  | 'Last year';

/**
 * The Diagnosis List - the only destination in the dashboard's sidebar.
 *
 * Status tabs and triage chips are plain divs, not `role="tab"` / `role="checkbox"`,
 * so they are addressed by exact text. Switching tabs does not change the URL, which is
 * why no navigation assertion is made around tab clicks.
 */
export class DashboardPage extends BasePage {
  protected readonly path = '/ai_dashboard';

  readonly userDisplayName: Locator;
  readonly diagnosisListNav: Locator;
  readonly logoutButton: Locator;

  readonly downloadButton: Locator;
  readonly dateRangeTrigger: Locator;
  readonly channelDropdownTrigger: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly totalCases: Locator;

  readonly recordsTable: Locator;
  readonly tableRows: Locator;
  readonly emptyStateMessage: Locator;

  /** Download confirmation modal. Its Thai title is misspelled - see BUG-008. */
  readonly downloadConfirmButton: Locator;
  readonly downloadCancelButton: Locator;

  protected readonly readyLocator: Locator;

  constructor(page: Page) {
    super(page);

    this.userDisplayName = page.locator('aside, complementary').first();
    this.diagnosisListNav = page.getByRole('button', { name: /Diagnosis List/ });
    this.logoutButton = page.getByRole('button', { name: /Log Out/ });

    this.downloadButton = page.getByRole('button', { name: /^download Download$|^Download$/ });
    // The clickable trigger is the label beside the calendar icon, and its text changes from
    // "Select date" to the chosen preset once a range is picked - so it cannot be located by
    // that text. The icon's own wrapper carries no handler, hence the sibling hop.
    this.dateRangeTrigger = page
      .getByRole('img', { name: 'calendar' })
      .locator('xpath=../preceding-sibling::div[1]');
    this.channelDropdownTrigger = page.getByRole('button', { name: /Channel/ });
    this.searchInput = page.getByPlaceholder('Patient name, Patient contact, Record ID, Record code');
    this.searchButton = page.getByRole('button', { name: 'Search', exact: true });
    this.totalCases = page.getByText(/Total cases\s*:\s*\d+/);

    this.recordsTable = page.locator('table');
    this.tableRows = this.recordsTable.locator('tbody tr');
    this.emptyStateMessage = page.getByText('ยังไม่มีข้อมูลการวินิจฉัย');

    this.downloadConfirmButton = page.getByRole('button', { name: 'ยืนยัน', exact: true });
    this.downloadCancelButton = page.getByText('ยกเลิก', { exact: true });

    this.readyLocator = this.logoutButton;
  }

  // --- navigation -----------------------------------------------------------

  async selectStatusTab(tab: StatusTab): Promise<void> {
    await this.page.getByText(tab, { exact: true }).first().click();
    await this.waitForRecordsRequest();
  }

  async selectTriage(triage: TriageFilter): Promise<void> {
    await this.page.getByText(triage, { exact: true }).first().click();
    await this.waitForRecordsRequest();
  }

  async selectChannel(channel: ChannelFilter): Promise<void> {
    await this.channelDropdownTrigger.click();
    await this.page.getByText(channel, { exact: true }).first().click();
    await this.waitForRecordsRequest();
  }

  async selectDateRange(preset: DateRangePreset): Promise<void> {
    await this.dateRangeTrigger.click();
    await this.page.getByText(preset, { exact: true }).first().click();
    await this.waitForRecordsRequest();
  }

  // --- search ---------------------------------------------------------------

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchButton.click();
    await this.waitForRecordsRequest();
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.fill('');
    await this.searchButton.click();
    await this.waitForRecordsRequest();
  }

  // --- reading state --------------------------------------------------------

  async getTotalCases(): Promise<number> {
    const text = await this.totalCases.innerText();
    return Number(text.replace(/\D/g, ''));
  }

  async getColumnValues(column: 'Date-time' | 'Name' | 'Diagnosis' | 'Channel'): Promise<string[]> {
    const headers = await this.recordsTable.locator('thead th').allInnerTexts();
    const index = headers.findIndex((h) => h.trim() === column);
    if (index === -1) throw new Error(`Column "${column}" not found in [${headers.join(', ')}]`);

    const rowCount = await this.tableRows.count();
    const values: string[] = [];
    for (let i = 0; i < rowCount; i++) {
      values.push((await this.tableRows.nth(i).locator('td').nth(index).innerText()).trim());
    }
    return values;
  }

  async isEmpty(): Promise<boolean> {
    return this.emptyStateMessage.isVisible();
  }

  // --- download -------------------------------------------------------------

  /**
   * Opens the export modal, confirms it, and returns the download.
   * Returns null when the app produces no file - which is what currently happens
   * with an empty result set (BUG-007).
   */
  async downloadCsv(timeout = 30_000): Promise<Download | null> {
    await this.downloadButton.click();
    await expect(this.downloadConfirmButton).toBeVisible();

    const pending = this.page
      .waitForEvent('download', { timeout })
      .catch(() => null);
    await this.downloadConfirmButton.click();
    return pending;
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
    await this.page.waitForURL(/\/ai_dashboard\/login/);
  }

  /**
   * Waits for the listing call the dashboard fires after any filter or search change.
   * Resolves on any response - including the 500 the endpoint currently returns
   * (BUG-001) - so tests can assert on the outcome rather than hang.
   */
  private async waitForRecordsRequest(): Promise<void> {
    await this.page
      .waitForResponse((r) => r.url().includes('/api/ai_dashboard/dashboard'), { timeout: 12_000 })
      .catch(() => undefined);
  }
}
