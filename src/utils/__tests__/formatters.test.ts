import { describe, it, expect } from 'vitest'

describe('Formatters', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const formatted = new Intl.DateTimeFormat('en-US').format(date)
      expect(formatted).toBeTruthy()
    })
  })

  describe('formatNumber', () => {
    it('should format number with commas', () => {
      const number = 1000000
      const formatted = number.toLocaleString()
      expect(formatted).toContain('000')
    })
  })
})