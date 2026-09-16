import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Dashboard registration screen.
 *
 * Password and Confirm Password both carry id="password" (BUG-006), so they cannot be
 * told apart by id or by accessible name. Positional locators over `input[type=password]`
 * are the only option the markup leaves open.
 */
export class SignUpPage extends BasePage {
  protected readonly path = '/ai_dashboard/agnos/sign_up';

  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly confirmButton: Locator;

  /** Validation only runs on submit - none of these appear on blur or change. */
  readonly passwordPolicyError: Locator;
  readonly passwordMismatchError: Locator;
  readonly accountCreatedMessage: Locator;

  protected readonly readyLocator: Locator;

  constructor(page: Page) {
    super(page);
    const passwordInputs = page.locator('input[type=password]');

    this.emailInput = page.locator('#Email');
    this.passwordInput = passwordInputs.nth(0);
    this.confirmPasswordInput = passwordInputs.nth(1);
    this.confirmButton = page.getByRole('button', { name: 'Confirm' });

    // Substring string matching, not a regex: Playwright normalises whitespace for strings
    // but not for regexes, and this message is rendered as one text node next to the
    // "Confirm Password" label.
    this.passwordPolicyError = page.getByText('The password must be at least 8 characters long');
    this.passwordMismatchError = page.getByText('Confirm password does not match the password.');
    this.accountCreatedMessage = page.getByText('Your account has been created');

    this.readyLocator = this.emailInput;
  }

  async register(email: string, password: string, confirmPassword = password): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword);
    await expect(this.confirmButton).toBeEnabled();
    await this.confirmButton.click();
  }
}
