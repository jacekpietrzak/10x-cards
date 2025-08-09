import { test, expect } from '@playwright/test'

test.describe('Flashcards E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display landing page', async ({ page }) => {
    await expect(page).toHaveTitle(/10x Cards/)
    await expect(page.locator('h1')).toContainText(/10x/)
  })

  test('should navigate to sign-in page', async ({ page }) => {
    await page.click('text=Sign in')
    await expect(page).toHaveURL(/\/sign-in/)
    await expect(page.locator('h1')).toContainText(/Sign in/)
  })

  test('should navigate to sign-up page', async ({ page }) => {
    await page.click('text=Sign up')
    await expect(page).toHaveURL(/\/sign-up/)
    await expect(page.locator('h1')).toContainText(/Sign up/)
  })

  test('should display features section', async ({ page }) => {
    await expect(page.locator('text=Generate flashcards')).toBeVisible()
    await expect(page.locator('text=Learn effectively')).toBeVisible()
    await expect(page.locator('text=Track your progress')).toBeVisible()
  })
})

test.describe('Authenticated Flashcards Flow', () => {
  test.use({ storageState: 'tests/.auth/user.json' })

  test('should create a new flashcard', async ({ page }) => {
    await page.goto('/flashcards')
    
    await page.click('text=Create flashcard')
    
    await page.fill('input[name="front"]', 'What is TypeScript?')
    await page.fill('textarea[name="back"]', 'TypeScript is a typed superset of JavaScript')
    
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=What is TypeScript?')).toBeVisible()
  })

  test('should review a flashcard', async ({ page }) => {
    await page.goto('/flashcards/learning')
    
    const card = page.locator('.flashcard').first()
    await card.click()
    
    await expect(card).toContainText(/Answer|Back/)
    
    await page.click('button:has-text("Good")')
    
    await expect(page.locator('text=Card reviewed')).toBeVisible()
  })

  test('should generate flashcards with AI', async ({ page }) => {
    await page.goto('/flashcards/generate')
    
    await page.fill('textarea[name="input"]', 'Create 3 flashcards about React hooks')
    
    await page.click('button:has-text("Generate")')
    
    await page.waitForSelector('text=Generated flashcards', { timeout: 30000 })
    
    const cards = page.locator('.generated-card')
    await expect(cards).toHaveCount(3)
  })
})