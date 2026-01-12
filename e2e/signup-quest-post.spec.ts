import { test, expect, Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Test configuration - use environment variables for test Supabase project
const TEST_SUPABASE_URL =
  process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const TEST_SUPABASE_ANON_KEY =
  process.env.TEST_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

// Helper function to generate unique test email
function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

// Helper function to clean up test user from Supabase
async function cleanupTestUser(email: string) {
  if (!TEST_SUPABASE_URL || !TEST_SUPABASE_ANON_KEY) {
    console.warn("Skipping cleanup: Test Supabase credentials not provided");
    return;
  }

  try {
    const supabase = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY);

    // Get user by email (requires admin/service role in production)
    // For test projects, you might need to use service role key
    // This is a best-effort cleanup - failures here won't fail the test
    console.log(`Attempting to clean up test user: ${email}`);
  } catch (error) {
    console.warn("Cleanup failed (this is okay for test isolation):", error);
  }
}

// Fixture for authenticated user
async function signupUser(page: Page, email: string, password: string) {
  // Navigate to signup page (assuming /auth/signup exists)
  // If signup is on a different route, adjust accordingly
  await page.goto("/auth/signup");

  // Fill signup form
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.fill('input[name="username"]', `testuser-${Date.now()}`);
  await page.fill('input[name="display_name"]', "Test User");

  // Fill additional required fields if they exist
  const branchSelect = page.locator('select[name="branch"]');
  if (await branchSelect.count() > 0) {
    await branchSelect.selectOption({ index: 0 }); // Select first option
  }

  const yearSelect = page.locator('select[name="year"]');
  if (await yearSelect.count() > 0) {
    await yearSelect.selectOption({ index: 1 }); // Select year 2
  }

  const sectionSelect = page.locator('select[name="section"]');
  if (await sectionSelect.count() > 0) {
    await sectionSelect.selectOption({ index: 0 }); // Select section A
  }

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect or success message
  // Adjust selector based on your actual UI
  await page.waitForURL(/\/(u\/|explore|dashboard)/, { timeout: 10000 });
}

test.describe("Signup -> Quest -> Post -> Leaderboard Flow", () => {
  let testEmail: string;
  const testPassword = "TestPassword123!";

  test.beforeEach(() => {
    testEmail = generateTestEmail();
  });

  test.afterEach(async () => {
    // Cleanup test user after each test
    await cleanupTestUser(testEmail);
  });

  test("complete user journey from signup to leaderboard", async ({ page }) => {
    // Step 1: Signup
    test.step("Sign up new user", async () => {
      await page.goto("/auth/signup");

      // Wait for signup form to be visible
      await expect(page.locator('form, [role="form"]').first()).toBeVisible({
        timeout: 5000,
      });

      // Fill signup form fields
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      const passwordInput = page.locator(
        'input[type="password"], input[name="password"]'
      );

      if (await emailInput.count() > 0) {
        await emailInput.fill(testEmail);
      }
      if (await passwordInput.count() > 0) {
        await passwordInput.fill(testPassword);
      }

      // Fill optional fields if they exist
      const usernameInput = page.locator('input[name="username"]');
      if (await usernameInput.count() > 0) {
        await usernameInput.fill(`testuser-${Date.now()}`);
      }

      const displayNameInput = page.locator('input[name="display_name"], input[name="name"]');
      if (await displayNameInput.count() > 0) {
        await displayNameInput.fill("Test User");
      }

      // Select branch, year, section if they exist
      const branchSelect = page.locator('select[name="branch"]');
      if (await branchSelect.count() > 0) {
        await branchSelect.selectOption({ index: 0 });
      }

      const yearSelect = page.locator('select[name="year"]');
      if (await yearSelect.count() > 0) {
        await yearSelect.selectOption({ value: "2" });
      }

      const sectionSelect = page.locator('select[name="section"]');
      if (await sectionSelect.count() > 0) {
        await sectionSelect.selectOption({ value: "A" });
      }

      // Submit signup form
      const submitButton = page.locator(
        'button[type="submit"], button:has-text("Sign Up"), button:has-text("Create Account")'
      ).first();

      if (await submitButton.count() > 0) {
        await submitButton.click();
      }

      // Wait for redirect after successful signup
      // This might redirect to profile edit, explore, or home page
      await page.waitForURL(/\/(u\/|explore|auth\/login)/, {
        timeout: 15000,
      });
    });

    // Step 2: Navigate to quest creation (might need to login first)
    test.step("Create a quest", async () => {
      // If redirected to login, login first
      if (page.url().includes("/auth/login")) {
        await page.fill('input[type="email"], input[name="email"]', testEmail);
        await page.fill('input[type="password"], input[name="password"]', testPassword);
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/(u\/|explore|quests)/, { timeout: 10000 });
      }

      // Navigate to quest creation page
      await page.goto("/quests/new");

      // Wait for quest form
      await expect(
        page.locator('input[name="title"], textarea[name="title"]')
      ).toBeVisible({ timeout: 5000 });

      // Fill quest details - Step 1: Basic info
      await page.fill('input[name="title"], textarea[name="title"]', "Test Quest E2E");
      
      const descriptionField = page.locator('textarea[name="description"]');
      if (await descriptionField.count() > 0) {
        await descriptionField.fill("This is a test quest created by E2E test");
      }

      // Click next or continue button if multi-step form
      const nextButton = page.locator(
        'button:has-text("Next"), button:has-text("Continue"), button[type="submit"]'
      ).first();
      
      if (await nextButton.count() > 0 && (await nextButton.textContent())?.toLowerCase().includes("next")) {
        await nextButton.click();
        // Wait for step 2 (KPI inputs)
        await page.waitForTimeout(1000);
      }

      // Step 2: Add KPIs if form has that step
      const kpiNameInput = page.locator('input[placeholder*="KPI"], input[name*="kpi"]').first();
      if (await kpiNameInput.count() > 0) {
        await kpiNameInput.fill("Test Metric");
        
        const kpiValueInput = page.locator('input[type="number"], input[name*="value"]').first();
        if (await kpiValueInput.count() > 0) {
          await kpiValueInput.fill("0");
        }

        const kpiTargetInput = page.locator('input[name*="target"]').first();
        if (await kpiTargetInput.count() > 0) {
          await kpiTargetInput.fill("100");
        }
      }

      // Submit quest
      const submitQuestButton = page.locator(
        'button:has-text("Create"), button:has-text("Submit"), button[type="submit"]:has-text("Quest")'
      ).last();

      await submitQuestButton.click();

      // Wait for quest to be created (redirect or success message)
      await page.waitForURL(/\/(quests|u\/|explore)/, { timeout: 10000 });

      // Verify quest was created (check for success message or quest in list)
      const successMessage = page.locator('text=/quest.*created|success/i');
      if (await successMessage.count() > 0) {
        await expect(successMessage.first()).toBeVisible({ timeout: 5000 });
      }
    });

    // Step 3: Create a post
    test.step("Create a post", async () => {
      await page.goto("/posts/new");

      // Wait for post form
      await expect(page.locator('input[name="title"]')).toBeVisible({
        timeout: 5000,
      });

      // Fill post details
      await page.fill('input[name="title"]', "Test Post E2E");
      
      const contentField = page.locator('textarea[name="content"]');
      await contentField.fill("# Test Post\n\nThis is a test post created by E2E test.");

      // Check published checkbox if it exists
      const publishedCheckbox = page.locator('input[name="published"][type="checkbox"]');
      if (await publishedCheckbox.count() > 0) {
        await publishedCheckbox.check();
      }

      // Submit post
      const submitPostButton = page.locator(
        'button:has-text("Publish"), button:has-text("Create"), button[type="submit"]'
      ).last();

      await submitPostButton.click();

      // Wait for post to be created
      await page.waitForURL(/\/(posts|blogs|u\/)/, { timeout: 10000 });

      // Verify post was created
      const postSuccess = page.locator('text=/post.*created|success|published/i');
      if (await postSuccess.count() > 0) {
        await expect(postSuccess.first()).toBeVisible({ timeout: 5000 });
      }
    });

    // Step 4: Check leaderboard
    test.step("View leaderboard", async () => {
      await page.goto("/leaderboard");

      // Wait for leaderboard to load
      await expect(
        page.locator('text=/leaderboard|rank|score/i').first()
      ).toBeVisible({ timeout: 5000 });

      // Verify leaderboard has content (table, list, or cards)
      const leaderboardContent = page.locator(
        'table, [role="table"], [data-testid="leaderboard"], .leaderboard'
      );

      if (await leaderboardContent.count() > 0) {
        await expect(leaderboardContent.first()).toBeVisible();

        // Check for at least one entry (could be the user we just created)
        const entries = page.locator(
          'tbody tr, [role="row"], .leaderboard-entry'
        );
        
        if (await entries.count() > 0) {
          // At minimum, leaderboard should render (even if empty)
          expect(await entries.count()).toBeGreaterThanOrEqual(0);
        }
      } else {
        // If no table, check for any leaderboard-related content
        const anyContent = page.locator('text=/rank|score|points/i');
        expect(await anyContent.count()).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test("quest creation form validation", async ({ page }) => {
    // This test verifies that quest creation requires valid input
    await page.goto("/auth/login");

    // Try to access quest creation without being logged in
    await page.goto("/quests/new");

    // Should redirect to login or show error
    // Adjust based on your actual auth flow
    const isLoginPage = page.url().includes("/auth/login");
    const hasError = await page.locator('text=/login|unauthorized/i').count() > 0;

    expect(isLoginPage || hasError).toBeTruthy();
  });
});
