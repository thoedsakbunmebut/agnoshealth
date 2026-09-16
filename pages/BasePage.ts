import { Page, Locator, expect } from '@playwright/test';

/**
 * Shared behaviour for every page object.
 *
 * The dashboard is a slow client-rendered SPA: navigating only resolves the HTML
 * shell, and the interactive content appears seconds later. Page objects therefore
 * never treat `goto` as "the page is ready" - each one exposes a `waitUntilReady()`
 * that waits on a real element.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Path this page lives at, relative to `baseURL`. */
  protected abstract readonly path: string;

  /** An element that only exists once the page is genuinely usable. */
  protected abstract readonly readyLocator: Locator;

  async goto(): Promise<this> {
    await this.page.goto(this.path, { waitUntil: 'domcontentloaded' });
    return this.waitUntilReady();
  }

  async waitUntilReady(): Promise<this> {
    await expect(this.readyLocator).toBeVisible();
    return this;
  }
}
