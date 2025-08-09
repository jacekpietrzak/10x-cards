import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateFlashcards } from '../generation.service'
import { faker } from '@faker-js/faker'
import type { FlashcardProposalDto } from '@/lib/types'

// Mock OpenRouterService to prevent initialization errors
vi.mock('../openrouter.service', () => ({
  OpenRouterService: vi.fn().mockImplementation(() => ({}))
}))

describe('GenerationService', () => {
  describe('validateFlashcards', () => {
    describe('Valid inputs', () => {
      it('should validate correct flashcards array', () => {
        const validCards = [
          { front: 'Question 1', back: 'Answer 1' },
          { front: 'Question 2', back: 'Answer 2' },
          { front: 'Question 3', back: 'Answer 3' }
        ]
        
        const result = validateFlashcards(validCards)
        
        expect(result).toHaveLength(3)
        expect(result[0]).toEqual({
          front: 'Question 1',
          back: 'Answer 1',
          source: 'ai-full'
        })
      })

      it('should accept exactly 3 flashcards', () => {
        const cards = Array.from({ length: 3 }, (_, i) => ({
          front: `Question ${i + 1}`,
          back: `Answer ${i + 1}`
        }))
        
        const result = validateFlashcards(cards)
        expect(result).toHaveLength(3)
      })

      it('should accept up to 7 flashcards', () => {
        const cards = Array.from({ length: 7 }, (_, i) => ({
          front: `Question ${i + 1}`,
          back: `Answer ${i + 1}`
        }))
        
        const result = validateFlashcards(cards)
        expect(result).toHaveLength(7)
      })

      it('should trim whitespace from fields', () => {
        const cards = [
          { front: '  Question 1  ', back: '  Answer 1  ' },
          { front: '\nQuestion 2\n', back: '\tAnswer 2\t' },
          { front: '   Question 3   ', back: '   Answer 3   ' }
        ]
        
        const result = validateFlashcards(cards)
        
        expect(result[0].front).toBe('Question 1')
        expect(result[0].back).toBe('Answer 1')
        expect(result[1].front).toBe('Question 2')
        expect(result[1].back).toBe('Answer 2')
      })

      it('should handle maximum allowed text length', () => {
        const cards = [
          { front: 'a'.repeat(200), back: 'b'.repeat(500) },
          { front: 'Short question?', back: 'Short answer.' },
          { front: 'Another question?', back: 'Another answer.' }
        ]
        
        const result = validateFlashcards(cards)
        expect(result).toHaveLength(3)
        expect(result[0].front).toHaveLength(200)
        expect(result[0].back).toHaveLength(500)
      })
    })

    describe('Invalid inputs - Type errors', () => {
      it('should throw error for non-array input', () => {
        expect(() => validateFlashcards('not an array'))
          .toThrow('Flashcards must be an array')
        
        expect(() => validateFlashcards({}))
          .toThrow('Flashcards must be an array')
        
        expect(() => validateFlashcards(null))
          .toThrow('Flashcards must be an array')
        
        expect(() => validateFlashcards(undefined))
          .toThrow('Flashcards must be an array')
      })

      it('should throw error for non-object items in array', () => {
        const cards = [
          { front: 'Question 1', back: 'Answer 1' },
          'not an object',
          { front: 'Question 3', back: 'Answer 3' }
        ]
        
        expect(() => validateFlashcards(cards))
          .toThrow('Flashcard at index 1 must be an object')
      })

      it('should throw error for null items in array', () => {
        const cards = [
          { front: 'Question 1', back: 'Answer 1' },
          null,
          { front: 'Question 3', back: 'Answer 3' }
        ]
        
        expect(() => validateFlashcards(cards))
          .toThrow('Flashcard at index 1 must be an object')
      })

      it('should throw error for non-string field values', () => {
        const cards = [
          { front: 'Question 1', back: 'Answer 1' },
          { front: 123, back: 'Answer 2' },
          { front: 'Question 3', back: 'Answer 3' }
        ]
        
        expect(() => validateFlashcards(cards))
          .toThrow('Flashcard at index 1 must have string values for front and back')
      })
    })

    describe('Invalid inputs - Missing fields', () => {
      it('should throw error for missing front field', () => {
        const cards = [
          { front: 'Question 1', back: 'Answer 1' },
          { back: 'Answer 2' },
          { front: 'Question 3', back: 'Answer 3' }
        ]
        
        expect(() => validateFlashcards(cards))
          .toThrow('Flashcard at index 1 missing required fields (front, back)')
      })

      it('should throw error for missing back field', () => {
        const cards = [
          { front: 'Question 1', back: 'Answer 1' },
          { front: 'Question 2' },
          { front: 'Question 3', back: 'Answer 3' }
        ]
        
        expect(() => validateFlashcards(cards))
          .toThrow('Flashcard at index 1 missing required fields (front, back)')
      })

      it('should throw error for missing both fields', () => {
        const cards = [
          { front: 'Question 1', back: 'Answer 1' },
          {},
          { front: 'Question 3', back: 'Answer 3' }
        ]
        
        expect(() => validateFlashcards(cards))
          .toThrow('Flashcard at index 1 missing required fields (front, back)')
      })
    })

    describe('Invalid inputs - Empty content', () => {
      it('should throw error for empty front text', () => {
        const cards = [
          { front: 'Question 1', back: 'Answer 1' },
          { front: '', back: 'Answer 2' },
          { front: 'Question 3', back: 'Answer 3' }
        ]
        
        expect(() => validateFlashcards(cards))
          .toThrow('Flashcard at index 1 has empty front text')
      })

      it('should throw error for empty back text', () => {
        const cards = [
          { front: 'Question 1', back: 'Answer 1' },
          { front: 'Question 2', back: '' },
          { front: 'Question 3', back: 'Answer 3' }
        ]
        
        expect(() => validateFlashcards(cards))
          .toThrow('Flashcard at index 1 has empty back text')
      })

      it('should throw error for whitespace-only strings', () => {
        const cards = [
          { front: 'Question 1', back: 'Answer 1' },
          { front: '   ', back: 'Answer 2' },
          { front: 'Question 3', back: 'Answer 3' }
        ]
        
        expect(() => validateFlashcards(cards))
          .toThrow('Flashcard at index 1 has empty front text')
      })
    })

    describe('Invalid inputs - Array size', () => {
      it('should throw error for less than 3 flashcards', () => {
        const cards = [
          { front: 'Question 1', back: 'Answer 1' },
          { front: 'Question 2', back: 'Answer 2' }
        ]
        
        expect(() => validateFlashcards(cards))
          .toThrow('At least 3 flashcards are required')
      })

      it('should throw error for empty array', () => {
        expect(() => validateFlashcards([]))
          .toThrow('At least 3 flashcards are required')
      })

      it('should throw error for more than 7 flashcards', () => {
        const cards = Array.from({ length: 8 }, (_, i) => ({
          front: `Question ${i + 1}`,
          back: `Answer ${i + 1}`
        }))
        
        expect(() => validateFlashcards(cards))
          .toThrow('Maximum 7 flashcards allowed')
      })
    })

    describe('Invalid inputs - Text length', () => {
      it('should throw error for front text exceeding 200 characters', () => {
        const cards = [
          { front: 'Question 1', back: 'Answer 1' },
          { front: 'a'.repeat(201), back: 'Answer 2' },
          { front: 'Question 3', back: 'Answer 3' }
        ]
        
        expect(() => validateFlashcards(cards))
          .toThrow('Flashcard at index 1 front text exceeds 200 characters (201)')
      })

      it('should throw error for back text exceeding 500 characters', () => {
        const cards = [
          { front: 'Question 1', back: 'Answer 1' },
          { front: 'Question 2', back: 'b'.repeat(501) },
          { front: 'Question 3', back: 'Answer 3' }
        ]
        
        expect(() => validateFlashcards(cards))
          .toThrow('Flashcard at index 1 back text exceeds 500 characters (501)')
      })
    })

    describe('Sanitization', () => {
      it('should remove HTML tags from text', () => {
        const cards = [
          { front: '<b>Question 1</b>', back: '<i>Answer 1</i>' },
          { front: 'Question <script>alert("xss")</script>2', back: 'Answer 2' },
          { front: '<div>Question 3</div>', back: '<span>Answer 3</span>' }
        ]
        
        const result = validateFlashcards(cards)
        
        expect(result[0].front).toBe('Question 1')
        expect(result[0].back).toBe('Answer 1')
        expect(result[1].front).toBe('Question alert("xss") 2')
        expect(result[1].back).toBe('Answer 2')
        expect(result[2].front).toBe('Question 3')
        expect(result[2].back).toBe('Answer 3')
      })

      it('should normalize multiple spaces', () => {
        const cards = [
          { front: 'Question   with   spaces', back: 'Answer   with   spaces' },
          { front: 'Question\n\nwith\nnewlines', back: 'Answer\twith\ttabs' },
          { front: 'Normal question', back: 'Normal answer' }
        ]
        
        const result = validateFlashcards(cards)
        
        expect(result[0].front).toBe('Question with spaces')
        expect(result[0].back).toBe('Answer with spaces')
        expect(result[1].front).toBe('Question with newlines')
        expect(result[1].back).toBe('Answer with tabs')
      })

      it('should handle complex HTML structures', () => {
        const cards = [
          { 
            front: '<p class="test">Question <b>with</b> <i>formatting</i></p>', 
            back: 'Simple answer' 
          },
          { 
            front: 'Question 2', 
            back: '<ul><li>Item 1</li><li>Item 2</li></ul>' 
          },
          { 
            front: 'Question 3', 
            back: 'Answer 3' 
          }
        ]
        
        const result = validateFlashcards(cards)
        
        expect(result[0].front).toBe('Question with formatting')
        expect(result[1].back).toBe('Item 1 Item 2')
      })
    })

    describe('Duplicate handling', () => {
      it('should remove exact duplicates', () => {
        const cards = [
          { front: 'Question 1', back: 'Answer 1' },
          { front: 'Question 1', back: 'Answer 1' },
          { front: 'Question 2', back: 'Answer 2' },
          { front: 'Question 3', back: 'Answer 3' }
        ]
        
        const result = validateFlashcards(cards)
        
        expect(result).toHaveLength(3)
        expect(result.map(c => c.front)).toEqual(['Question 1', 'Question 2', 'Question 3'])
      })

      it('should remove duplicates case-insensitively', () => {
        const cards = [
          { front: 'Question 1', back: 'Answer 1' },
          { front: 'QUESTION 1', back: 'ANSWER 1' },
          { front: 'question 1', back: 'answer 1' },
          { front: 'Question 2', back: 'Answer 2' },
          { front: 'Question 3', back: 'Answer 3' }
        ]
        
        const result = validateFlashcards(cards)
        
        expect(result).toHaveLength(3)
        expect(result[0].front).toBe('Question 1')
        expect(result[1].front).toBe('Question 2')
        expect(result[2].front).toBe('Question 3')
      })

      it('should throw error if less than 3 unique cards after deduplication', () => {
        const cards = [
          { front: 'Question 1', back: 'Answer 1' },
          { front: 'Question 1', back: 'Answer 1' },
          { front: 'Question 2', back: 'Answer 2' },
          { front: 'Question 2', back: 'Answer 2' }
        ]
        
        expect(() => validateFlashcards(cards))
          .toThrow('Only 2 unique flashcards after removing duplicates (minimum 3 required)')
      })

      it('should handle duplicates with different spacing', () => {
        const cards = [
          { front: 'Question 1', back: 'Answer 1' },
          { front: '  Question 1  ', back: '  Answer 1  ' },
          { front: 'Question   1', back: 'Answer   1' },
          { front: 'Question 2', back: 'Answer 2' },
          { front: 'Question 3', back: 'Answer 3' }
        ]
        
        const result = validateFlashcards(cards)
        
        expect(result).toHaveLength(3)
      })
    })

    describe('Edge cases', () => {
      it('should handle special characters and emojis', () => {
        const cards = [
          { front: 'Question with émojis 🎉', back: 'Answer with émojis 🎊' },
          { front: 'Question with "quotes"', back: 'Answer with \'quotes\'' },
          { front: 'Question with & special < chars >', back: 'Answer with @#$%' }
        ]
        
        const result = validateFlashcards(cards)
        
        expect(result).toHaveLength(3)
        expect(result[0].front).toContain('🎉')
        expect(result[1].front).toContain('"quotes"')
        expect(result[2].back).toContain('@#$%')
      })

      it('should handle cards with only special characters after sanitization', () => {
        const cards = [
          { front: 'Valid Question 1', back: 'Valid Answer 1' },
          { front: 'Valid Question 2', back: 'Valid Answer 2' },
          { front: '<><><>', back: '   Text with spaces   ' }
        ]
        
        expect(() => validateFlashcards(cards))
          .toThrow('Flashcard at index 2 has empty front text after sanitization')
      })

      it('should handle mixed valid and invalid cards correctly', () => {
        const cards = [
          { front: 'Valid 1', back: 'Answer 1' },
          { front: 'Valid 2', back: 'Answer 2' },
          { front: 'Valid 3', back: 'Answer 3' },
          { front: '', back: 'Invalid - empty front' },
          { front: 'Valid 4', back: 'Answer 4' }
        ]
        
        expect(() => validateFlashcards(cards))
          .toThrow('Flashcard at index 3 has empty front text')
      })

      it('should preserve international characters', () => {
        const cards = [
          { front: 'Pytanie po polsku ąćęłńóśźż', back: 'Odpowiedź po polsku ĄĆĘŁŃÓŚŹŻ' },
          { front: '中文问题', back: '中文答案' },
          { front: 'السؤال بالعربية', back: 'الجواب بالعربية' }
        ]
        
        const result = validateFlashcards(cards)
        
        expect(result).toHaveLength(3)
        expect(result[0].front).toContain('ąćęłńóśźż')
        expect(result[1].front).toContain('中文')
        expect(result[2].front).toContain('السؤال')
      })
    })

    describe('Integration with AI response format', () => {
      it('should handle typical AI response structure', () => {
        const aiResponse = [
          { front: 'What is TypeScript?', back: 'A typed superset of JavaScript' },
          { front: 'What are React Hooks?', back: 'Functions that let you use state in functional components' },
          { front: 'What is Next.js?', back: 'A React framework for production' }
        ]
        
        const result = validateFlashcards(aiResponse)
        
        expect(result).toHaveLength(3)
        expect(result[0].source).toBe('ai-full')
        expect(result[1].source).toBe('ai-full')
        expect(result[2].source).toBe('ai-full')
      })

      it('should handle AI response with extra fields', () => {
        const aiResponse = [
          { front: 'Q1', back: 'A1', extra: 'ignored', id: 123 },
          { front: 'Q2', back: 'A2', metadata: { foo: 'bar' } },
          { front: 'Q3', back: 'A3' }
        ]
        
        const result = validateFlashcards(aiResponse)
        
        expect(result).toHaveLength(3)
        expect(result[0]).not.toHaveProperty('extra')
        expect(result[0]).not.toHaveProperty('id')
        expect(result[1]).not.toHaveProperty('metadata')
      })
    })
  })
})