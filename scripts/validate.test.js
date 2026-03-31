// UC-7: Site generieren — JSON validation
import { describe, it, expect } from 'vitest'
import { validateConcepts, validatePaths } from './validate.js'

describe('UC-7: JSON data validation', () => {
  describe('concepts.json validation', () => {
    it('accepts a valid concept', () => {
      const concepts = [
        {
          id: 'abstraktion',
          title_de: 'Abstraktion',
          title_en: 'Abstraction',
          episode: 'ep002',
          path: 'stem',
          path_position: 1,
          requires: [],
        },
      ]
      const result = validateConcepts(concepts)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('rejects a concept without id', () => {
      const concepts = [{ title_de: 'Test', title_en: 'Test' }]
      const result = validateConcepts(concepts)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('id')
    })

    it('rejects a concept without title_de', () => {
      const concepts = [{ id: 'test', title_en: 'Test' }]
      const result = validateConcepts(concepts)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('title_de')
    })

    it('rejects a concept without title_en', () => {
      const concepts = [{ id: 'test', title_de: 'Test' }]
      const result = validateConcepts(concepts)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('title_en')
    })

    it('rejects duplicate ids', () => {
      const concepts = [
        {
          id: 'same',
          title_de: 'A',
          title_en: 'A',
          episode: 'ep001',
          path: 'stem',
          path_position: 1,
          requires: [],
        },
        {
          id: 'same',
          title_de: 'B',
          title_en: 'B',
          episode: 'ep002',
          path: 'stem',
          path_position: 2,
          requires: [],
        },
      ]
      const result = validateConcepts(concepts)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('duplicate')
    })

    it('rejects a requires reference to non-existent concept', () => {
      const concepts = [
        {
          id: 'child',
          title_de: 'Kind',
          title_en: 'Child',
          episode: 'ep002',
          path: 'stem',
          path_position: 1,
          requires: ['nonexistent'],
        },
      ]
      const result = validateConcepts(concepts)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('nonexistent')
    })

    it('accepts missing youtube URLs with warnings', () => {
      const concepts = [
        {
          id: 'test',
          title_de: 'Test',
          title_en: 'Test',
          episode: 'ep001',
          path: 'stem',
          path_position: 1,
          requires: [],
        },
      ]
      const result = validateConcepts(concepts)
      expect(result.valid).toBe(true)
      expect(result.warnings).toContain('test has no YouTube URLs')
    })

    it('no warning when youtube URLs are present', () => {
      const concepts = [
        {
          id: 'test',
          title_de: 'Test',
          title_en: 'Test',
          episode: 'ep001',
          path: 'stem',
          path_position: 1,
          requires: [],
          youtube_de: 'https://youtube.com/shorts/abc',
          youtube_en: 'https://youtube.com/shorts/def',
        },
      ]
      const result = validateConcepts(concepts)
      expect(result.warnings).not.toContain('test has no YouTube URLs')
    })
  })

  describe('paths.json validation', () => {
    it('accepts a valid path', () => {
      const paths = [
        {
          id: 'microservices',
          name_de: 'Microservices',
          name_en: 'Microservices',
          description_de: 'Entwickler die weg vom Monolith wollen',
          description_en: 'Developers moving away from monoliths',
          color: '#6495ED',
          concepts: ['monolith', 'service'],
        },
      ]
      const result = validatePaths(paths)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('rejects a path without id', () => {
      const paths = [{ name_de: 'Test', name_en: 'Test' }]
      const result = validatePaths(paths)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('id')
    })

    it('rejects a path without concepts array', () => {
      const paths = [
        {
          id: 'test',
          name_de: 'Test',
          name_en: 'Test',
          description_de: 'Desc',
          description_en: 'Desc',
          color: '#fff',
        },
      ]
      const result = validatePaths(paths)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('concepts')
    })

    it('rejects duplicate path ids', () => {
      const paths = [
        {
          id: 'same',
          name_de: 'A',
          name_en: 'A',
          description_de: 'D',
          description_en: 'D',
          color: '#fff',
          concepts: [],
        },
        {
          id: 'same',
          name_de: 'B',
          name_en: 'B',
          description_de: 'D',
          description_en: 'D',
          color: '#000',
          concepts: [],
        },
      ]
      const result = validatePaths(paths)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('duplicate')
    })
  })
})
