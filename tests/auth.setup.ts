import { test as setup } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '.auth/user.json')

setup('authenticate', async ({ page }) => {
  await page.goto('/sign-in')
  
  await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com')
  await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpassword123')
  
  await page.click('button[type="submit"]')
  
  await page.waitForURL('/flashcards')
  
  await page.context().storageState({ path: authFile })
})