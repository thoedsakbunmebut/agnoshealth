import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Dashboard login screen.
 *
 * The e-mail and password inputs have no <label for> and no aria-label (see BUG-006),
 * so they expose no accessible name and `getByLabel` cannot reach them. Their DOM ids
 * are the only stable hooks the application offers, so the locators below use them
 * deliberately rather than by preference.
 */
export class LoginPage extends BasePage {
  protected readonly path = '/ai_dashboard/login';

  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly errorMessage: Locator;

  protected readonly readyLocator: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('#Email');
    this.passwordInput = page.locator('#password');
    this.signInButton = page.getByRole('button', { name: 'Sign in' });
    this.errorMessage = page.getByText('Wrong email or password. Please try again');
    this.readyLocator = this.emailInput;
  }

  async fillCredentials(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async login(email: string, password: string): Promise<void> {
    await this.fillCredentials(email, password);
    await expect(this.signInButton).toBeEnabled();
    await this.signInButton.click();
  }

  async expectSignInDisabled(): Promise<void> {
    await expect(this.signInButton).toBeDisabled();
  }

  async expectInvalidCredentialsError(): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
  }
}
