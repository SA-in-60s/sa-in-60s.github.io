// UC-7: Site generieren — JSON validation
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { validateConcepts, validatePaths, validateCrossReferences } from './validate.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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

    it('rejects invalid YouTube URL format', () => {
      const concepts = [
        {
          id: 'test',
          title_de: 'Test',
          title_en: 'Test',
          episode: 'ep001',
          path: 'stem',
          path_position: 1,
          requires: [],
          youtube_de: 'https://evil.com/shorts/abc',
        },
      ]
      const result = validateConcepts(concepts)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('invalid youtube_de URL')
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
          color: '#ffffff',
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
          color: '#ffffff',
          concepts: [],
        },
        {
          id: 'same',
          name_de: 'B',
          name_en: 'B',
          description_de: 'D',
          description_en: 'D',
          color: '#000000',
          concepts: [],
        },
      ]
      const result = validatePaths(paths)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('duplicate')
    })

    it('rejects invalid color format', () => {
      const paths = [
        {
          id: 'test',
          name_de: 'Test',
          name_en: 'Test',
          description_de: 'Desc',
          description_en: 'Desc',
          color: 'red; background: url(evil)',
          concepts: [],
        },
      ]
      const result = validatePaths(paths)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('invalid color')
    })
  })

  describe('cross-reference validation', () => {
    it('passes when all references are valid', () => {
      const concepts = [
        {
          id: 'a',
          title_de: 'A',
          title_en: 'A',
          episode: 'ep001',
          path: 'p1',
          path_position: 1,
        },
      ]
      const paths = [
        {
          id: 'p1',
          name_de: 'P1',
          name_en: 'P1',
          description_de: 'D',
          description_en: 'D',
          color: '#ffffff',
          concepts: ['a'],
        },
      ]
      const result = validateCrossReferences(concepts, paths)
      expect(result.valid).toBe(true)
    })

    it('detects path referencing non-existent concept', () => {
      const concepts = [
        {
          id: 'a',
          title_de: 'A',
          title_en: 'A',
          episode: 'ep001',
          path: 'p1',
          path_position: 1,
        },
      ]
      const paths = [
        {
          id: 'p1',
          name_de: 'P1',
          name_en: 'P1',
          description_de: 'D',
          description_en: 'D',
          color: '#ffffff',
          concepts: ['a', 'nonexistent'],
        },
      ]
      const result = validateCrossReferences(concepts, paths)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('nonexistent')
    })

    it('detects concept with unknown path', () => {
      const concepts = [
        {
          id: 'a',
          title_de: 'A',
          title_en: 'A',
          episode: 'ep001',
          path: 'unknown-path',
          path_position: 1,
        },
      ]
      const paths = []
      const result = validateCrossReferences(concepts, paths)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('unknown path')
    })

    it('accepts stem and intro as valid path values', () => {
      const concepts = [
        {
          id: 'a',
          title_de: 'A',
          title_en: 'A',
          episode: 'ep001',
          path: 'stem',
          path_position: 1,
        },
        {
          id: 'b',
          title_de: 'B',
          title_en: 'B',
          episode: 'ep002',
          path: 'intro',
          path_position: 1,
        },
      ]
      const result = validateCrossReferences(concepts, [])
      expect(result.valid).toBe(true)
    })
  })

  describe('integration: real data cross-references', () => {
    it('all path concept references exist in concepts.json', () => {
      const dataDir = resolve(__dirname, '..', 'data')
      const concepts = JSON.parse(readFileSync(resolve(dataDir, 'concepts.json'), 'utf-8'))
      const paths = JSON.parse(readFileSync(resolve(dataDir, 'paths.json'), 'utf-8'))

      const result = validateCrossReferences(concepts, paths)
      if (!result.valid) {
        throw new Error(`Cross-reference errors:\n${result.errors.join('\n')}`)
      }
      expect(result.valid).toBe(true)
    })

    it('all concepts have valid path references', () => {
      const dataDir = resolve(__dirname, '..', 'data')
      const concepts = JSON.parse(readFileSync(resolve(dataDir, 'concepts.json'), 'utf-8'))
      const paths = JSON.parse(readFileSync(resolve(dataDir, 'paths.json'), 'utf-8'))

      const result = validateCrossReferences(concepts, paths)
      expect(result.valid).toBe(true)
    })
  })
})
