import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FlashcardsService } from '../flashcards.service'
import { createClient } from '@/utils/supabase/server'
import { faker } from '@faker-js/faker'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('FlashcardsService', () => {
  let service: FlashcardsService
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      })),
    }
    
    vi.mocked(createClient).mockResolvedValue(mockSupabase)
    service = new FlashcardsService()
  })

  describe('getAll', () => {
    it('should fetch all flashcards for current user', async () => {
      const mockFlashcards = [
        {
          id: faker.string.uuid(),
          front: faker.lorem.sentence(),
          back: faker.lorem.paragraph(),
          state: 0,
          due: new Date().toISOString(),
          stability: 2.5,
          difficulty: 0.3,
          elapsed_days: 0,
          scheduled_days: 0,
          reps: 0,
          lapses: 0,
        },
      ]

      mockSupabase.from().select().order.mockResolvedValue({
        data: mockFlashcards,
        error: null,
      })

      const result = await service.getAll()

      expect(result).toEqual(mockFlashcards)
      expect(mockSupabase.from).toHaveBeenCalledWith('flashcards')
      expect(mockSupabase.from().select).toHaveBeenCalledWith('*')
      expect(mockSupabase.from().order).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('should throw error when fetch fails', async () => {
      const errorMessage = 'Database error'
      mockSupabase.from().select().order.mockResolvedValue({
        data: null,
        error: { message: errorMessage },
      })

      await expect(service.getAll()).rejects.toThrow(`Failed to fetch flashcards: ${errorMessage}`)
    })
  })

  describe('create', () => {
    it('should create a new flashcard with FSRS initial state', async () => {
      const createData = {
        front: faker.lorem.sentence(),
        back: faker.lorem.paragraph(),
      }

      const mockCreatedCard = {
        id: faker.string.uuid(),
        ...createData,
        state: 0,
        due: expect.any(String),
        stability: 2.5,
        difficulty: 0.3,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
      }

      mockSupabase.from().insert().single.mockResolvedValue({
        data: mockCreatedCard,
        error: null,
      })

      const result = await service.create(createData)

      expect(result).toEqual(mockCreatedCard)
      expect(mockSupabase.from).toHaveBeenCalledWith('flashcards')
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          front: createData.front,
          back: createData.back,
          state: 0,
          stability: 2.5,
          difficulty: 0.3,
        })
      )
    })
  })

  describe('getDueCards', () => {
    it('should fetch only cards that are due for review', async () => {
      const dueCards = [
        {
          id: faker.string.uuid(),
          front: faker.lorem.sentence(),
          back: faker.lorem.paragraph(),
          state: 2,
          due: faker.date.past().toISOString(),
        },
      ]

      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: dueCards,
        error: null,
      })

      const result = await service.getDueCards()

      expect(result).toEqual(dueCards)
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('due', expect.any(String))
    })
  })
})