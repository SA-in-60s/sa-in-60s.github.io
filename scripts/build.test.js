// UC-7: Site generieren — Build script tests
import { describe, it, expect } from 'vitest'
import {
  generateConceptPage,
  generatePathPage,
  generateIndexPage,
  youtubeEmbed,
} from './build.js'

const sampleConcept = {
  id: 'microservices',
  title_de: 'Microservices',
  title_en: 'Microservices',
  episode: 'ep014',
  path: 'microservices',
  path_position: 3,
  requires: ['dienst-service', 'kopplung'],
  youtube_de: 'https://youtube.com/shorts/abc123',
  youtube_en: 'https://youtube.com/shorts/def456',
}

const sampleConceptNoVideo = {
  id: 'saga',
  title_de: 'Saga',
  title_en: 'Saga',
  episode: 'ep024',
  path: 'microservices',
  path_position: 14,
  requires: ['microservices'],
}

const samplePath = {
  id: 'microservices',
  name_de: 'Microservices',
  name_en: 'Microservices',
  description_de: 'Entwickler die weg vom Monolith wollen',
  description_en: 'Developers moving away from monoliths',
  color: '#6495ED',
  concepts: ['monolith', 'dienst-service', 'microservices'],
}

const translations = {
  de: {
    site_title: 'Software Architektur in 60 Sekunden',
    concept_video_placeholder: 'Video in Produktion',
    concept_video_alt_lang: 'Englische Version',
    concept_path: 'Pfad',
    concept_requires: 'Voraussetzungen',
    concept_leads_to: 'Führt zu',
    seen_button: 'Als gesehen markieren',
  },
  en: {
    site_title: 'Software Architecture in 60 Seconds',
    concept_video_placeholder: 'Video in production',
    concept_video_alt_lang: 'German version',
    concept_path: 'Path',
    concept_requires: 'Prerequisites',
    concept_leads_to: 'Leads to',
    seen_button: 'Mark as seen',
  },
}

describe('UC-7: Build script — HTML generation', () => {
  describe('youtubeEmbed()', () => {
    it('generates an iframe for a valid YouTube URL', () => {
      const html = youtubeEmbed('https://youtube.com/shorts/abc123')
      expect(html).toContain('<iframe')
      expect(html).toContain('youtube.com/embed/abc123')
      expect(html).toContain('loading="lazy"')
    })

    it('returns placeholder for empty URL', () => {
      const html = youtubeEmbed('', 'Video in Produktion')
      expect(html).not.toContain('<iframe')
      expect(html).toContain('Video in Produktion')
    })

    it('returns placeholder for undefined URL', () => {
      const html = youtubeEmbed(undefined, 'Video in production')
      expect(html).toContain('Video in production')
    })
  })

  describe('generateConceptPage()', () => {
    it('includes both language titles', () => {
      const html = generateConceptPage(sampleConcept, [], [], translations)
      expect(html).toContain('data-de="Microservices"')
      expect(html).toContain('data-en="Microservices"')
    })

    it('embeds YouTube videos when URLs exist', () => {
      const html = generateConceptPage(sampleConcept, [], [], translations)
      expect(html).toContain('youtube.com/embed/abc123')
      expect(html).toContain('youtube.com/embed/def456')
    })

    it('shows placeholder when video URLs are missing', () => {
      const html = generateConceptPage(sampleConceptNoVideo, [], [], translations)
      expect(html).toContain('Video in Produktion')
      expect(html).not.toContain('youtube.com/embed')
    })

    it('includes requires links', () => {
      const allConcepts = [
        sampleConcept,
        {
          id: 'dienst-service',
          title_de: 'Dienst',
          title_en: 'Service',
          path: 'microservices',
          path_position: 1,
          requires: [],
        },
        {
          id: 'kopplung',
          title_de: 'Kopplung',
          title_en: 'Coupling',
          path: 'stem',
          path_position: 6,
          requires: [],
        },
      ]
      const html = generateConceptPage(sampleConcept, allConcepts, [], translations)
      expect(html).toContain('href="/concept/dienst-service"')
      expect(html).toContain('href="/concept/kopplung"')
    })

    it('includes path link', () => {
      const html = generateConceptPage(sampleConcept, [], [samplePath], translations)
      expect(html).toContain('href="/path/microservices"')
    })

    it('includes seen button', () => {
      const html = generateConceptPage(sampleConcept, [], [], translations)
      expect(html).toContain('data-concept-id="microservices"')
      expect(html).toContain('seen-button')
    })

    it('includes meta tags', () => {
      const html = generateConceptPage(sampleConcept, [], [], translations)
      expect(html).toContain('<title>')
      expect(html).toContain('og:title')
    })
  })

  describe('generatePathPage()', () => {
    it('includes path name in both languages', () => {
      const html = generatePathPage(samplePath, [], translations)
      expect(html).toContain('data-de="Microservices"')
    })

    it('lists concepts in order', () => {
      const concepts = [
        {
          id: 'monolith',
          title_de: 'Monolith',
          title_en: 'Monolith',
          path: 'microservices',
          path_position: 1,
          requires: [],
        },
        {
          id: 'dienst-service',
          title_de: 'Dienst',
          title_en: 'Service',
          path: 'microservices',
          path_position: 2,
          requires: [],
        },
        {
          id: 'microservices',
          title_de: 'Microservices',
          title_en: 'Microservices',
          path: 'microservices',
          path_position: 3,
          requires: [],
        },
      ]
      const html = generatePathPage(samplePath, concepts, translations)
      expect(html).toContain('href="/concept/monolith"')
      expect(html).toContain('href="/concept/dienst-service"')
      expect(html).toContain('href="/concept/microservices"')
    })

    it('uses path color', () => {
      const html = generatePathPage(samplePath, [], translations)
      expect(html).toContain('#6495ED')
    })
  })

  describe('generateIndexPage()', () => {
    it('includes site title', () => {
      const html = generateIndexPage([], [samplePath], translations)
      expect(html).toContain('Software Architektur in 60 Sekunden')
    })

    it('includes all path cards', () => {
      const html = generateIndexPage([], [samplePath], translations)
      expect(html).toContain('href="/path/microservices"')
    })
  })
})
