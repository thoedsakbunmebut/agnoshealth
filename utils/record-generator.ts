import { Page, Locator, expect } from '@playwright/test';

/**
 * Creates a fresh AI diagnosis record through the consumer app at `/`, so that
 * dashboard tests have data of their own rather than depending on rows someone else
 * left behind.
 *
 * The questionnaire is AI-driven and branches differently on every run, so this cannot
 * follow a fixed click path. Instead it answers generically: read whatever options are
 * on screen, prefer a negative answer to keep the branch shallow, and click through
 * until the app leaves the question step.
 */

/** Interstitials that can appear at any point and block the flow. */
const DISMISSIBLE = [
  'ไว้คราวหลัง', // "maybe later" on the referral survey
  'รับทราบ', // "understood" on the medical disclaimer
];

/** Answers that end a branch instead of opening more questions. */
const NEGATIVE_ANSWERS = ['ไม่มีอาการใดในนี้', 'ไม่มี', 'ไม่ใช่', 'ไม่ทราบ ไม่แน่ใจ'];

export interface GeneratedRecord {
  /** Top diagnosis shown on the results page, e.g. "คอหอยอักเสบ". */
  diagnosis: string;
  /** Symptom the record was seeded with. */
  symptom: string;
}

export async function generateDiagnosisRecord(
  page: Page,
  symptom = 'คอแดง',
): Promise<GeneratedRecord> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await dismissInterstitials(page);
  await page.getByRole('button', { name: 'เข้าใช้งานแอพพลิเคชั่น' }).first().click().catch(() => {});
  await page.waitForURL('**/home', { timeout: 90_000 });

  await clickPastInterstitials(page, page.getByText('ตรวจโรคด้วยตัวเอง').first());
  await page.waitForURL('**/user_selection', { timeout: 90_000 });

  await page.getByRole('button', { name: 'ตัวเอง', exact: true }).click();
  await page.waitForURL('**/main', { timeout: 90_000 });

  await clickPastInterstitials(page, page.getByRole('button', { name: symptom, exact: true }).first());
  // The "next" control on the symptom picker is a styled div, not a button - unlike the
  // identically-labelled control inside the questionnaire.
  await page.getByText('ต่อไป', { exact: false }).last().click();
  await page.waitForURL('**/question', { timeout: 90_000 });

  await answerQuestionnaire(page);

  await page.waitForURL('**/summary', { timeout: 120_000 });
  await page.getByText('เสร็จสิ้น', { exact: true }).click();

  // The nurse chat is optional and adds minutes to the run - skip it.
  await page.waitForURL('**/nurse-ai', { timeout: 90_000 });
  await page.getByText('ข้าม', { exact: true }).first().click();
  await page.getByText('ยืนยัน', { exact: true }).first().click();

  await page.waitForURL('**/results', { timeout: 120_000 });
  const diagnosis = await page.locator('text=/%/').first().locator('..').innerText();

  return { diagnosis: diagnosis.replace(/\d+%\s*/, '').split('\n')[0].trim(), symptom };
}

/**
 * Clicks a target, dismissing any interstitial that gets in the way first.
 *
 * The promotional modal appears a few seconds after `/home` settles, so dismissing once up
 * front is not enough - it can land between the dismissal and the click.
 */
async function clickPastInterstitials(page: Page, target: Locator, attempts = 5): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    await dismissInterstitials(page);
    try {
      await target.click({ timeout: 15_000 });
      return;
    } catch {
      // An interstitial almost certainly intercepted the click - dismiss it and try again.
    }
  }
  throw new Error(`Could not click past the interstitials after ${attempts} attempts`);
}

async function dismissInterstitials(page: Page): Promise<void> {
  // A promotional modal renders as a Semantic UI dimmer that swallows every click on the
  // page beneath it. It carries no stable text or test id, so it is closed the way the
  // library intends: by clicking the dimmer outside the modal box.
  const dimmer = page.locator('.modals.dimmer.visible');
  if (await dimmer.isVisible().catch(() => false)) {
    await dimmer.click({ position: { x: 10, y: 10 }, force: true }).catch(() => {});
    await expect(dimmer).toBeHidden({ timeout: 10_000 }).catch(() => {});
  }

  for (const label of DISMISSIBLE) {
    const button = page.getByText(label, { exact: true }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click().catch(() => {});
      await expect(button).toBeHidden({ timeout: 10_000 }).catch(() => {});
    }
  }
}

/**
 * Clicks through the adaptive questionnaire until the app navigates away from
 * `/question`. Options are the wide buttons below the progress header; the narrow chip
 * at the top is the answer history, not a choice.
 */
async function answerQuestionnaire(page: Page, maxQuestions = 80): Promise<void> {
  for (let i = 0; i < maxQuestions && page.url().includes('/question'); i++) {
    const options = await readOptions(page);
    if (!options.length) return;

    const isMultiSelect = options.includes('ต่อไป');
    const choices = options.filter((o) => o !== 'ต่อไป');
    const answer = NEGATIVE_ANSWERS.find((n) => choices.includes(n)) ?? choices[choices.length - 1];

    // A failed click means the question moved on underneath us - the next iteration
    // re-reads the page rather than retrying a label that no longer exists.
    if (!(await clickAnswer(page, answer))) continue;

    if (isMultiSelect) {
      await clickAnswer(page, 'ต่อไป');
    }
  }
}

/**
 * Clicks one answer, waiting out the slide transition between questions first - the
 * outgoing question's wrapper stays in the DOM mid-animation and swallows the click.
 */
async function clickAnswer(page: Page, label: string): Promise<boolean> {
  await page
    .locator('.next-exit-active, .next-enter-active')
    .waitFor({ state: 'detached', timeout: 10_000 })
    .catch(() => {});

  const option = page.getByRole('button', { name: label, exact: true }).first();
  if (!(await option.isVisible().catch(() => false))) return false;

  return option
    .click({ timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
}

/** Polls for the current question's options, which render a beat after the previous click. */
async function readOptions(page: Page, attempts = 20): Promise<string[]> {
  for (let i = 0; i < attempts; i++) {
    if (!page.url().includes('/question')) return [];
    const options = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .filter((b) => {
          const rect = b.getBoundingClientRect();
          return b.innerText.trim() !== '' && rect.width > 500 && rect.height > 20 && rect.top > 250;
        })
        .map((b) => b.innerText.trim()),
    );
    if (options.length) return options;
    await page.waitForTimeout(700);
  }
  return [];
}
