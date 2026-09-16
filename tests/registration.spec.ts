import { test, expect, anonymous } from '../fixtures/test-fixtures';
import { uniqueEmail, passwords } from '../utils/test-data';

/**
 * TC-REG - User registration.
 *
 * Registration creates real accounts on a shared dev environment, so every test uses a
 * unique address. New accounts land in a pending-approval state and cannot log in, so
 * these tests stop at the confirmation message rather than trying to sign in afterwards.
 */
test.describe('User registration', () => {
  test.use(anonymous);

  test.beforeEach(async ({ signUpPage }) => {
    await signUpPage.goto();
  });

  test('TC-REG-01 registers a new account with valid details', async ({ signUpPage, page }) => {
    await signUpPage.register(uniqueEmail(), passwords.valid);

    await expect(signUpPage.accountCreatedMessage).toBeVisible();
    await expect(page.getByText('account approval')).toBeVisible();
    await expect(page).toHaveURL(/\/ai_dashboard\/login/);
  });

  test('TC-REG-02 rejects mismatched password confirmation', async ({ signUpPage }) => {
    await signUpPage.register(uniqueEmail(), passwords.valid, 'Different1@');

    await expect(signUpPage.passwordMismatchError).toBeVisible();
    await expect(signUpPage.accountCreatedMessage).toBeHidden();
  });

  test('TC-REG-03 rejects a password shorter than 8 characters', async ({ signUpPage }) => {
    await signUpPage.register(uniqueEmail(), passwords.tooShort);

    await expect(signUpPage.passwordPolicyError).toBeVisible();
  });

  test('TC-REG-04 rejects a password with no uppercase letter', async ({ signUpPage }) => {
    await signUpPage.register(uniqueEmail(), passwords.noUppercase);

    await expect(signUpPage.passwordPolicyError).toBeVisible();
  });

  test('TC-REG-05 rejects a password with no digit', async ({ signUpPage }) => {
    await signUpPage.register(uniqueEmail(), passwords.noDigit);

    await expect(signUpPage.passwordPolicyError).toBeVisible();
  });

  test('TC-REG-06 rejects a password with no special character', async ({ signUpPage }) => {
    await signUpPage.register(uniqueEmail(), passwords.noSpecialChar);

    await expect(signUpPage.passwordPolicyError).toBeVisible();
  });

  /**
   * Reproduces BUG-005: "Passw0rd!" satisfies every rule the on-screen message states
   * - 8+ characters, an uppercase letter, a digit and a special character - but the
   * form rejects it, while the same password with "@" is accepted.
   */
  test('TC-REG-07 accepts "!" as a special character [BUG-005]', async ({ signUpPage }) => {
    test.info().annotations.push({
      type: 'known-defect',
      description: 'BUG-005 - "!" is rejected although the stated policy allows any special character',
    });

    await signUpPage.register(uniqueEmail(), passwords.rejectedSpecialChar);

    await expect(signUpPage.passwordPolicyError).toBeHidden();
  });

  test('TC-REG-08 rejects a malformed e-mail address', async ({ signUpPage }) => {
    await signUpPage.register('not-an-email', passwords.valid);

    await expect(signUpPage.accountCreatedMessage).toBeHidden();
  });

  test('TC-REG-09 keeps Confirm disabled until every field is filled', async ({ signUpPage }) => {
    await expect(signUpPage.confirmButton).toBeDisabled();

    await signUpPage.emailInput.fill(uniqueEmail());
    await expect(signUpPage.confirmButton).toBeDisabled();

    await signUpPage.passwordInput.fill(passwords.valid);
    await expect(signUpPage.confirmButton).toBeDisabled();

    await signUpPage.confirmPasswordInput.fill(passwords.valid);
    await expect(signUpPage.confirmButton).toBeEnabled();
  });
});
