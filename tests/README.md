# E2E Tests with Playwright

## Overview

This directory contains end-to-end tests for the 10x Cards application using Playwright.

## Test Structure

```
tests/
├── e2e/                      # E2E test specs
│   ├── pages/               # Page Object Model classes
│   │   ├── components/      # Component-specific page objects
│   │   └── *.ts            # Page classes
│   └── *.spec.ts           # Test specifications
├── helpers/                 # Test helper utilities
│   └── supabase-test-client.ts  # Database cleanup utilities
├── auth.setup.ts           # Authentication setup (runs before tests)
├── global.teardown.ts      # Database cleanup (runs after tests)
└── .auth/                  # Stored authentication state (gitignored)
```

## Setup and Teardown Flow

1. **Authentication Setup** (`auth.setup.ts`)
   - Runs once before all tests
   - Logs in with test user credentials
   - Saves authentication state for reuse

2. **Test Execution**
   - All test specs run with saved authentication
   - Tests can create data in the database

3. **Database Cleanup** (`global.teardown.ts`)
   - Runs once after all tests complete
   - Cleans up test data from database
   - Removes: flashcards, generations, error logs

## Configuration

### Environment Variables (.env.test)

```bash
# Supabase Configuration (Public keys only!)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key  # Public key - safe to use

# Test User Credentials
TEST_USER_ID=test_user_uuid        # UUID of your test user
TEST_USER_EMAIL=test@example.com   # Test user email
TEST_USER_PASSWORD=test_password   # Test user password

# Environment
NODE_ENV=test
```

### Security Features

✅ **Safe approach using public keys only**:
- Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public key)
- Authenticates as test user for cleanup
- RLS policies ensure only test user's data is deleted
- No service role key needed!

## Running Tests

```bash
# Run all tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/e2e/flashcard-generation.spec.ts

# Run without cleanup (skip teardown)
npx playwright test --no-deps
```

## Test Data Cleanup

The teardown process automatically cleans up data for the E2E test user:

- **flashcards** - All flashcards created by the test user (filtered by user_id)
- **generations** - All AI generation records (filtered by user_id)
- **generation_error_logs** - Any error logs from failed generations (filtered by user_id)

### How Cleanup Works

1. **Authentication**: Logs in as the test user using TEST_USER_EMAIL and TEST_USER_PASSWORD
2. **RLS Protection**: Uses public anon key - RLS policies ensure only test user's own data can be deleted
3. **Filtered Deletion**: All DELETE operations include `eq('user_id', TEST_USER_ID)` filter
4. **Safe Operation**: Cannot accidentally delete other users' data

### Manual Cleanup

You can also trigger cleanup manually:

1. Log into Supabase Dashboard
2. Navigate to Table Editor
3. Filter tables by `user_id = 'your_test_user_id'`
4. Delete test records

## Writing New Tests

### Page Object Model

Create page objects for new features:

```typescript
// tests/e2e/pages/NewFeaturePage.ts
import { Page, Locator } from '@playwright/test';

export class NewFeaturePage {
  readonly page: Page;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.submitButton = page.locator('[data-test-id="submit-button"]');
  }

  async doSomething() {
    await this.submitButton.click();
  }
}
```

### Test Spec

Write tests using page objects:

```typescript
// tests/e2e/new-feature.spec.ts
import { test, expect } from '@playwright/test';
import { NewFeaturePage } from './pages/NewFeaturePage';

test.describe('New Feature', () => {
  let page: NewFeaturePage;

  test.beforeEach(async ({ page: playwrightPage }) => {
    page = new NewFeaturePage(playwrightPage);
    await page.goto();
  });

  test('should do something', async () => {
    await page.doSomething();
    // Add assertions
  });
});
```

## Troubleshooting

### Tests fail with authentication errors
- Check TEST_USER_EMAIL and TEST_USER_PASSWORD in .env.test
- Ensure the test user exists in your Supabase instance
- Delete `tests/.auth/` folder and run tests again

### Database cleanup not working
- Verify SUPABASE_SERVICE_ROLE_KEY is set correctly
- Check that TEST_USER_ID matches your test user
- Look for cleanup logs in test output

### Tests timeout
- Increase timeout in playwright.config.ts
- Check if the dev server is running properly
- Verify network connectivity to Supabase

## Best Practices

1. **Use data-test-id attributes** for reliable element selection
2. **Follow Page Object Model** for maintainable tests
3. **Keep tests independent** - each test should work in isolation
4. **Clean up after tests** - use the teardown to remove test data
5. **Use meaningful test names** that describe what is being tested
6. **Avoid hard-coded waits** - use Playwright's built-in waiting mechanisms