// UC-7: Site generieren — Build script tests
import { describe, it, expect } from 'vitest'
import {
  generateConceptPage,
  generatePathPage,
  generateIndexPage,
  generateGraphPage,
  buildGraphData,
  youtubeEmbed,
  escapeHtml,
  validateYoutubeUrl,
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
  script_de: 'Erster Absatz.\n\nZweiter Absatz.\n\nMerke: Das ist der Merksatz.',
  script_en: 'First paragraph.\n\nSecond paragraph.\n\nRemember: This is the takeaway.',
  merksatz_de: 'Das ist der Merksatz.',
  merksatz_en: 'This is the takeaway.',
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
    site_subtitle: '10 Lernpfade',
    stem_title: 'Gemeinsamer Stamm',
    stem_hint: 'Bevor du einen Pfad startest',
    paths_title: 'Lernpfade',
    path_concepts: 'Begriffe',
    concept_video_placeholder: 'Video in Produktion',
    concept_video_alt_lang: 'Englische Version',
    concept_path: 'Pfad',
    concept_requires: 'Voraussetzungen',
    concept_leads_to: 'Führt zu',
    seen_button: 'Als gesehen markieren',
    graph_title: 'Abhängigkeitsgraph',
    graph_noscript: 'Für den interaktiven Graph bitte JavaScript aktivieren',
    graph_filter_all: 'Alle',
  },
  en: {
    site_title: 'Software Architecture in 60 Seconds',
    site_subtitle: '10 Learning Paths',
    stem_title: 'Common Stem',
    stem_hint: 'Before starting a path',
    paths_title: 'Learning Paths',
    path_concepts: 'Concepts',
    concept_video_placeholder: 'Video in production',
    concept_video_alt_lang: 'English version',
    concept_path: 'Path',
    concept_requires: 'Prerequisites',
    concept_leads_to: 'Leads to',
    seen_button: 'Mark as seen',
    graph_title: 'Dependency Graph',
    graph_noscript: 'Please enable JavaScript for the interactive graph',
    graph_filter_all: 'All',
  },
}

describe('escapeHtml()', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>"alert"</script>')).toBe(
      '&lt;script&gt;&quot;alert&quot;&lt;/script&gt;'
    )
  })

  it('escapes ampersands', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B')
  })

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#x27;s')
  })

  it('handles non-string input', () => {
    expect(escapeHtml(42)).toBe('42')
  })
})

describe('validateYoutubeUrl()', () => {
  it('accepts valid YouTube Shorts URL', () => {
    expect(validateYoutubeUrl('https://youtube.com/shorts/abc123')).toBe(true)
  })

  it('accepts valid YouTube Shorts URL with www', () => {
    expect(validateYoutubeUrl('https://www.youtube.com/shorts/abc123def')).toBe(true)
  })

  it('accepts empty/falsy URL', () => {
    expect(validateYoutubeUrl('')).toBe(true)
    expect(validateYoutubeUrl(undefined)).toBe(true)
  })

  it('rejects malicious URL', () => {
    expect(validateYoutubeUrl('https://youtube.com/shorts/x" onload="alert(1)')).toBe(false)
  })

  it('rejects non-YouTube URL', () => {
    expect(validateYoutubeUrl('https://evil.com/shorts/abc123')).toBe(false)
  })
})

describe('UC-7: Build script — HTML generation', () => {
  describe('youtubeEmbed()', () => {
    it('generates an iframe for a valid YouTube URL', () => {
      const html = youtubeEmbed('https://youtube.com/shorts/abc123')
      expect(html).toContain('<iframe')
      expect(html).toContain('youtube-nocookie.com/embed/abc123')
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

    it('includes title attribute', () => {
      const html = youtubeEmbed('https://youtube.com/shorts/abc123', '', 'Test Video')
      expect(html).toContain('title="Test Video"')
    })

    it('includes referrerpolicy', () => {
      const html = youtubeEmbed('https://youtube.com/shorts/abc123')
      expect(html).toContain('referrerpolicy="no-referrer"')
    })

    it('rejects invalid video ID', () => {
      const html = youtubeEmbed('https://youtube.com/shorts/x"onload="alert(1)')
      expect(html).not.toContain('<iframe')
      expect(html).toContain('Invalid video')
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
      expect(html).toContain('youtube-nocookie.com/embed/abc123')
      expect(html).toContain('youtube-nocookie.com/embed/def456')
    })

    it('shows placeholder when video URLs are missing', () => {
      const html = generateConceptPage(sampleConceptNoVideo, [], [], translations)
      expect(html).toContain('Video in Produktion')
      expect(html).not.toContain('youtube-nocookie.com/embed')
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

    it('includes seen button with aria-pressed', () => {
      const html = generateConceptPage(sampleConcept, [], [], translations)
      expect(html).toContain('data-concept-id="microservices"')
      expect(html).toContain('seen-button')
      expect(html).toContain('aria-pressed="false"')
    })

    it('includes script text as paragraphs', () => {
      const html = generateConceptPage(sampleConcept, [], [], translations)
      expect(html).toContain('Erster Absatz.')
      expect(html).toContain('Zweiter Absatz.')
      expect(html).toContain('data-lang="de"')
      expect(html).toContain('data-lang="en"')
    })

    it('includes merksatz in blockquote', () => {
      const html = generateConceptPage(sampleConcept, [], [], translations)
      expect(html).toContain('border-accent-orange')
      expect(html).toContain('Das ist der Merksatz.')
      expect(html).toContain('This is the takeaway.')
    })

    it('shows single video with switch link', () => {
      const html = generateConceptPage(sampleConcept, [], [], translations)
      expect(html).toContain('id="video-de"')
      expect(html).toContain('id="video-en"')
      expect(html).toContain('id="switch-video-lang"')
      // EN video should be hidden by default
      expect(html).toContain('id="video-en" data-lang="en" class="hidden"')
    })

    it('includes meta tags', () => {
      const html = generateConceptPage(sampleConcept, [], [], translations)
      expect(html).toContain('<title>')
      expect(html).toContain('og:title')
    })

    it('generates valid HTML structure', () => {
      const html = generateConceptPage(sampleConcept, [], [], translations)
      expect(html).toContain('<!doctype html>')
      expect(html).toContain('</html>')
      expect(html).not.toContain('undefined')
      expect(html).not.toMatch(/="null"/)
    })

    it('includes CSP meta tag', () => {
      const html = generateConceptPage(sampleConcept, [], [], translations)
      expect(html).toContain('Content-Security-Policy')
      expect(html).toContain('frame-src https://www.youtube.com')
    })

    it('includes canonical URL', () => {
      const html = generateConceptPage(sampleConcept, [], [], translations)
      expect(html).toContain('rel="canonical"')
      expect(html).toContain('/concept/microservices')
    })

    it('includes skip-to-content link', () => {
      const html = generateConceptPage(sampleConcept, [], [], translations)
      expect(html).toContain('href="#main"')
      expect(html).toContain('Skip to main content')
    })

    it('includes JSON-LD for concepts with videos', () => {
      const html = generateConceptPage(sampleConcept, [], [], translations)
      expect(html).toContain('application/ld+json')
      expect(html).toContain('VideoObject')
    })

    it('does not include JSON-LD for concepts without videos', () => {
      const html = generateConceptPage(sampleConceptNoVideo, [], [], translations)
      expect(html).not.toContain('application/ld+json')
    })

    it('includes Open Graph locale tags', () => {
      const html = generateConceptPage(sampleConcept, [], [], translations)
      expect(html).toContain('og:locale')
      expect(html).toContain('og:url')
      expect(html).toContain('og:site_name')
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

    it('includes data-concept-seen on each concept item', () => {
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
      ]
      const html = generatePathPage(samplePath, concepts, translations)
      expect(html).toContain('data-concept-seen="monolith"')
      expect(html).toContain('data-concept-seen="dienst-service"')
    })

    it('includes path progress counter', () => {
      const concepts = [
        {
          id: 'monolith',
          title_de: 'Monolith',
          title_en: 'Monolith',
          path: 'microservices',
          path_position: 1,
          requires: [],
        },
      ]
      const html = generatePathPage(samplePath, concepts, translations)
      expect(html).toContain('data-progress-path="microservices"')
      expect(html).toContain('data-progress-total="3"')
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

    it('includes progress data on path cards', () => {
      const html = generateIndexPage([], [samplePath], translations)
      expect(html).toContain('data-progress-path="microservices"')
      expect(html).toContain('data-progress-total="3"')
      expect(html).toContain('data-progress-concepts=')
    })

    it('includes total progress element', () => {
      const concepts = [
        {
          id: 'monolith',
          title_de: 'Monolith',
          title_en: 'Monolith',
          path: 'stem',
          path_position: 1,
          requires: [],
        },
      ]
      const html = generateIndexPage(concepts, [samplePath], translations)
      expect(html).toContain('id="total-progress"')
      expect(html).toContain('data-progress-total=')
    })
  })

  describe('generateGraphPage()', () => {
    it('includes graph container', () => {
      const html = generateGraphPage([], [samplePath], translations)
      expect(html).toContain('id="cy"')
    })

    it('includes noscript fallback', () => {
      const html = generateGraphPage([], [samplePath], translations)
      expect(html).toContain('<noscript>')
    })

    it('includes path filter with all paths', () => {
      const html = generateGraphPage([], [samplePath], translations)
      expect(html).toContain('<select')
      expect(html).toContain('data-de="Microservices"')
    })

    it('includes bilingual title', () => {
      const html = generateGraphPage([], [samplePath], translations)
      expect(html).toContain('data-de="Abhängigkeitsgraph"')
      expect(html).toContain('data-en="Dependency Graph"')
    })

    it('includes canonical URL for /graph', () => {
      const html = generateGraphPage([], [samplePath], translations)
      expect(html).toContain('rel="canonical"')
      expect(html).toContain('/graph')
    })

    it('includes tooltip container', () => {
      const html = generateGraphPage([], [samplePath], translations)
      expect(html).toContain('id="graph-tooltip"')
    })

    it('has valid HTML structure', () => {
      const html = generateGraphPage([], [samplePath], translations)
      expect(html).toContain('<!doctype html>')
      expect(html).toContain('</html>')
      expect(html).not.toContain('undefined')
    })
  })

  describe('buildGraphData()', () => {
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
        id: 'microservices',
        title_de: 'Microservices',
        title_en: 'Microservices',
        path: 'microservices',
        path_position: 3,
        requires: ['monolith', 'kopplung'],
      },
    ]

    it('produces nodes with required fields', () => {
      const data = buildGraphData(concepts, [samplePath])
      expect(data.nodes).toHaveLength(2)
      expect(data.nodes[0]).toEqual({
        id: 'monolith',
        title_de: 'Monolith',
        title_en: 'Monolith',
        path: 'microservices',
      })
    })

    it('produces edges from requires arrays', () => {
      const data = buildGraphData(concepts, [samplePath])
      expect(data.edges).toHaveLength(2)
      expect(data.edges).toContainEqual({ source: 'monolith', target: 'microservices' })
      expect(data.edges).toContainEqual({ source: 'kopplung', target: 'microservices' })
    })

    it('includes path colors', () => {
      const data = buildGraphData(concepts, [samplePath])
      expect(data.paths).toContainEqual({
        id: 'microservices',
        name_de: 'Microservices',
        name_en: 'Microservices',
        color: '#6495ED',
      })
    })
  })
})
