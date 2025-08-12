import { test as teardown } from '@playwright/test';
import { cleanupTestData } from './helpers/supabase-test-client';

teardown('cleanup test database', async () => {
  console.log('🧹 Starting database cleanup for E2E test user...');
  
  // Use E2E_USERNAME_ID as per .env.example format
  const testUserId = process.env.E2E_USERNAME_ID;
  const testEmail = process.env.E2E_USERNAME;
  
  if (!testUserId || !testEmail) {
    console.warn('⚠️ E2E_USERNAME_ID or E2E_USERNAME not set, skipping cleanup');
    return;
  }
  
  console.log(`🔍 Cleaning up data for E2E test user: ${testEmail} (ID: ${testUserId})`);
  console.log('🔐 Using SUPABASE_PUBLIC_KEY with RLS policies for safe cleanup');
  
  const result = await cleanupTestData(testUserId);
  
  if (result.success && 'flashcards' in result) {
    const totalDeleted = result.flashcards + result.generations + result.errorLogs;
    if (totalDeleted > 0) {
      console.log('✅ Database cleanup completed successfully:');
      if (result.flashcards > 0) console.log(`   - Deleted ${result.flashcards} flashcards`);
      if (result.generations > 0) console.log(`   - Deleted ${result.generations} generations`);
      if (result.errorLogs > 0) console.log(`   - Deleted ${result.errorLogs} error logs`);
    } else {
      console.log('✅ No test data to clean up');
    }
  } else {
    if (result.message === 'Test credentials not configured') {
      console.error('❌ E2E_USERNAME and E2E_PASSWORD must be set in .env.test');
    } else if (result.message === 'Authentication failed') {
      console.error('❌ Failed to authenticate for cleanup - check E2E credentials');
    } else if (result.errors && result.errors.length > 0) {
      console.warn('⚠️ Cleanup completed with warnings:');
      result.errors.forEach(error => console.warn(`   - ${error}`));
      console.log('   Note: RLS policies ensure only test user data can be deleted');
    }
  }
  
  console.log('🏁 Teardown complete');
});