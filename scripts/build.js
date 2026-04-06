import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { createHash } from 'crypto'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const BASE_URL = 'https://sa-in-60s.github.io'

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export function validateYoutubeUrl(url) {
  if (!url) return true
  return /^https:\/\/(www\.)?youtube\.com\/shorts\/[a-zA-Z0-9_-]+$/.test(url)
}

export function youtubeEmbed(url, placeholder = 'Video in Produktion', title = '') {
  if (!url) {
    return `<div class="video-placeholder bg-bg-card rounded-lg flex items-center justify-center aspect-9/16 max-w-xs mx-auto text-text-muted" role="img" aria-label="${escapeHtml(placeholder)}">${escapeHtml(placeholder)}</div>`
  }
  const videoId = url.split('/').pop().split('?')[0]
  if (!/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
    return `<div class="video-placeholder bg-bg-card rounded-lg flex items-center justify-center aspect-9/16 max-w-xs mx-auto text-text-muted" role="img" aria-label="Invalid video">Invalid video</div>`
  }
  const iframeTitle = escapeHtml(title || 'YouTube Video')
  return `<iframe src="https://www.youtube.com/embed/${videoId}" loading="lazy" title="${iframeTitle}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="aspect-9/16 max-w-xs mx-auto rounded-lg w-full"></iframe>`
}

// Asset paths — set by CLI after Vite build, defaults for tests/dev
let assetPaths = {
  css: '/assets/main.css',
  js: '/src/main.js',
}

export function setAssetPaths(paths) {
  assetPaths = paths
}

function htmlTemplate({ title, description, body, lang = 'de', canonicalPath = '' }) {
  const canonicalUrl = `${BASE_URL}${canonicalPath}`
  const cssTag = `<link rel="stylesheet" href="${escapeHtml(assetPaths.css)}" />`
  const jsTag = `<script type="module" src="${escapeHtml(assetPaths.js)}"></script>`
  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-src https://www.youtube.com; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none';">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta name="theme-color" content="#0f172a">
  <link rel="icon" type="image/png" href="/favicon.png">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:locale" content="de_DE" />
  <meta property="og:locale:alternate" content="en_US" />
  <meta property="og:site_name" content="Software Architektur in 60 Sekunden" />
  ${cssTag}
</head>
<body class="min-h-screen bg-bg text-text">
  <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-accent-cyan focus:text-bg focus:px-4 focus:py-2 focus:rounded">Skip to main content</a>
  <nav class="p-4 flex justify-between items-center max-w-5xl mx-auto" aria-label="Main navigation">
    <a href="/" class="text-accent-cyan font-bold" data-de="Start" data-en="Home" aria-label="Home">Start</a>
    <div class="flex gap-4 items-center">
      <a href="/graph" class="text-text-muted hover:text-text" data-de="Graph" data-en="Graph" aria-label="Dependency graph">Graph</a>
      <button id="lang-toggle" class="px-3 py-2 border border-text-muted rounded text-sm" aria-label="Switch language" aria-pressed="false" data-de="EN" data-en="DE">EN</button>
    </div>
  </nav>
  <main id="main" class="max-w-5xl mx-auto px-4 pb-16">
    ${body}
  </main>
  <footer class="max-w-5xl mx-auto px-4 py-8 text-center text-text-muted text-sm border-t border-text-muted/20">
    <p class="mb-2"><span data-de="Ein Projekt von" data-en="A project by">Ein Projekt von</span> <a href="https://www.linkedin.com/in/rdmueller" target="_blank" rel="noopener" class="hover:text-accent-cyan">Ralf D. M&#xFC;ller</a></p>
    <div class="flex justify-center gap-4">
      <a href="https://software-architektur.tv" target="_blank" rel="noopener" class="hover:text-accent-cyan">software-architektur.tv</a>
      <a href="https://github.com/SA-in-60s" target="_blank" rel="noopener" class="hover:text-accent-cyan">GitHub</a>
    </div>
    <p class="mt-3"><a href="https://github.com/SA-in-60s/sa-in-60s.github.io/issues/new" target="_blank" rel="noopener" class="hover:text-accent-cyan" data-de="Fehler gefunden? Verbesserungsvorschlag?" data-en="Found a bug? Suggestion?">Fehler gefunden? Verbesserungsvorschlag?</a></p>
  </footer>
  ${jsTag}
</body>
</html>`
}

function generateNextVideoButton(concept, allConcepts, allPaths) {
  // For intro concept, link to first stem concept
  if (concept.path === 'intro') {
    const firstStem = allConcepts
      .filter((c) => c.path === 'stem')
      .sort((a, b) => a.path_position - b.path_position)[0]
    if (firstStem) {
      return `<div class="mt-6 flex justify-end">
  <a href="/concept/${escapeHtml(firstStem.id)}" class="py-2 px-6 rounded-lg bg-accent-cyan text-bg font-medium hover:opacity-90 transition text-sm"
     data-de="N\u00E4chstes Video: ${escapeHtml(firstStem.title_de)}" data-en="Next Video: ${escapeHtml(firstStem.title_en)}">
    N\u00E4chstes Video: ${escapeHtml(firstStem.title_de)} \u2192
  </a>
</div>`
    }
    return ''
  }

  // Find the path this concept belongs to
  const pathObj = allPaths.find((p) => p.id === concept.path)
  // For stem concepts, find them from stem list
  const isStem = concept.path === 'stem'
  let conceptList
  if (isStem) {
    conceptList = allConcepts
      .filter((c) => c.path === 'stem')
      .sort((a, b) => a.path_position - b.path_position)
      .map((c) => c.id)
  } else if (pathObj) {
    conceptList = pathObj.concepts
  } else {
    return ''
  }

  const currentIdx = conceptList.indexOf(concept.id)
  if (currentIdx === -1) return ''

  // If last in list, link back to path page (or index for stem)
  if (currentIdx >= conceptList.length - 1) {
    if (isStem) {
      return `<div class="mt-6 flex justify-end">
  <a href="/" class="py-2 px-6 rounded-lg bg-accent-cyan text-bg font-medium hover:opacity-90 transition text-sm"
     data-de="Zur\u00FCck zum Start" data-en="Back to Home">
    Zur\u00FCck zum Start \u2192
  </a>
</div>`
    }
    if (pathObj) {
      return `<div class="mt-6 flex justify-end">
  <a href="/path/${escapeHtml(pathObj.id)}" class="py-2 px-6 rounded-lg bg-accent-cyan text-bg font-medium hover:opacity-90 transition text-sm"
     data-de="Zur\u00FCck zum Pfad: ${escapeHtml(pathObj.name_de)}" data-en="Back to path: ${escapeHtml(pathObj.name_en)}">
    Zur\u00FCck zum Pfad: ${escapeHtml(pathObj.name_de)} \u2192
  </a>
</div>`
    }
    return ''
  }

  // Link to next concept
  const nextId = conceptList[currentIdx + 1]
  const nextConcept = allConcepts.find((c) => c.id === nextId)
  if (!nextConcept) return ''

  return `<div class="mt-6 flex justify-end">
  <a href="/concept/${escapeHtml(nextConcept.id)}" class="py-2 px-6 rounded-lg bg-accent-cyan text-bg font-medium hover:opacity-90 transition text-sm"
     data-de="N\u00E4chstes Video: ${escapeHtml(nextConcept.title_de)}" data-en="Next Video: ${escapeHtml(nextConcept.title_en)}">
    N\u00E4chstes Video: ${escapeHtml(nextConcept.title_de)} \u2192
  </a>
</div>`
}

export function generateConceptPage(concept, allConcepts, allPaths, translations) {
  const t = translations.de
  const path = allPaths.find((p) => p.id === concept.path)
  const requires = (concept.requires || [])
    .map((id) => allConcepts.find((c) => c.id === id))
    .filter(Boolean)
  const leadsTo = allConcepts.filter(
    (c) => Array.isArray(c.requires) && c.requires.includes(concept.id)
  )

  const pathLink = path
    ? `<a href="/path/${escapeHtml(path.id)}" class="text-accent-cyan" style="border-left: 3px solid ${escapeHtml(path.color)}; padding-left: 0.5rem;" data-de="${escapeHtml(path.name_de)}" data-en="${escapeHtml(path.name_en)}">${escapeHtml(path.name_de)}</a>`
    : ''

  const requiresHtml =
    requires.length > 0
      ? requires
          .map(
            (r) =>
              `<a href="/concept/${escapeHtml(r.id)}" class="text-accent-blue hover:underline" data-de="${escapeHtml(r.title_de)}" data-en="${escapeHtml(r.title_en)}">${escapeHtml(r.title_de)}</a>`
          )
          .join(', ')
      : '—'

  const leadsToHtml =
    leadsTo.length > 0
      ? leadsTo
          .map(
            (r) =>
              `<a href="/concept/${escapeHtml(r.id)}" class="text-accent-blue hover:underline" data-de="${escapeHtml(r.title_de)}" data-en="${escapeHtml(r.title_en)}">${escapeHtml(r.title_de)}</a>`
          )
          .join(', ')
      : ''

  const youtubeDeTitle = `${concept.title_de} - Deutsch`
  const youtubeEnTitle = `${concept.title_en} - English`

  // JSON-LD structured data for videos
  let jsonLd = ''
  if (concept.youtube_de || concept.youtube_en) {
    const videos = []
    if (concept.youtube_de) {
      videos.push({
        '@type': 'VideoObject',
        name: `${concept.title_de} - Software Architektur in 60 Sekunden`,
        description: `${concept.title_de} erklärt in 60 Sekunden.`,
        contentUrl: concept.youtube_de,
        inLanguage: 'de',
      })
    }
    if (concept.youtube_en) {
      videos.push({
        '@type': 'VideoObject',
        name: `${concept.title_en} - Software Architecture in 60 Seconds`,
        description: `${concept.title_en} explained in 60 seconds.`,
        contentUrl: concept.youtube_en,
        inLanguage: 'en',
      })
    }
    const ldData = {
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      name: concept.title_de,
      alternateName: concept.title_en,
      url: `${BASE_URL}/concept/${concept.id}`,
      video: videos,
    }
    jsonLd = `<script type="application/ld+json">${JSON.stringify(ldData)}</script>`
  }

  // Script text as paragraphs
  const scriptDe = concept.script_de || ''
  const scriptEn = concept.script_en || ''
  const scriptDeHtml = scriptDe
    ? scriptDe
        .split(/\n\n+/)
        .map((p) => `<p class="mb-3">${escapeHtml(p)}</p>`)
        .join('\n')
    : ''
  const scriptEnHtml = scriptEn
    ? scriptEn
        .split(/\n\n+/)
        .map((p) => `<p class="mb-3">${escapeHtml(p)}</p>`)
        .join('\n')
    : ''

  // Merksatz
  const merksatzDe = concept.merksatz_de || ''
  const merksatzEn = concept.merksatz_en || ''

  const body = `
    ${jsonLd}
    <article>
      <h1 class="text-3xl font-bold mb-2" data-de="${escapeHtml(concept.title_de)}" data-en="${escapeHtml(concept.title_en)}">${escapeHtml(concept.title_de)}</h1>
      ${pathLink ? `<p class="text-text-muted mb-6">${escapeHtml(t.concept_path)}: ${pathLink}</p>` : ''}

      <div class="md:flex md:gap-8 mb-8">
        <div class="md:w-1/3 mb-6 md:mb-0">
          <div data-lang="de">
            ${youtubeEmbed(concept.youtube_de, t.concept_video_placeholder, youtubeDeTitle)}
          </div>
          <div data-lang="en" class="hidden">
            ${youtubeEmbed(concept.youtube_en, translations.en.concept_video_placeholder, youtubeEnTitle)}
          </div>
          ${generateNextVideoButton(concept, allConcepts, allPaths)}
        </div>
        <div class="md:w-2/3">
          ${
            scriptDeHtml
              ? `<div data-lang="de" class="text-text leading-relaxed">${scriptDeHtml}</div>`
              : ''
          }
          ${
            scriptEnHtml
              ? `<div data-lang="en" class="text-text leading-relaxed hidden">${scriptEnHtml}</div>`
              : ''
          }
          ${
            merksatzDe || merksatzEn
              ? `<blockquote class="mt-4 pl-4 border-l-4 border-accent-orange text-accent-orange italic">
            <span data-lang="de">${escapeHtml(merksatzDe)}</span>
            <span data-lang="en" class="hidden">${escapeHtml(merksatzEn)}</span>
          </blockquote>`
              : ''
          }
          <div class="mt-4 seen-container" data-concept-id="${escapeHtml(concept.id)}">
            <p class="seen-timer text-sm text-text-muted mb-2" data-de="Gib dem Konzept 60 Sekunden" data-en="Give this concept 60 seconds"></p>
            <button class="seen-button max-w-[50%] py-2 px-4 rounded-lg border-2 border-accent-cyan text-accent-cyan hover:bg-accent-cyan hover:text-bg transition text-center text-sm font-medium" data-concept-id="${escapeHtml(concept.id)}" aria-pressed="false" data-de="${escapeHtml(t.seen_button)}?" data-en="${escapeHtml(translations.en.seen_button)}?">${escapeHtml(t.seen_button)}?</button>
          </div>
          <div class="mt-4 flex items-center gap-2">
            <select id="ai-chat-select" class="py-2 px-3 bg-bg-card border border-text-muted rounded-lg text-sm text-text" aria-label="AI Chat">
              <option value="claude">Claude</option>
              <option value="chatgpt">ChatGPT</option>
              <option value="perplexity">Perplexity</option>
            </select>
            <button id="ai-deep-dive" class="py-2 px-4 rounded-lg border border-text-muted text-text-muted hover:text-accent-cyan hover:border-accent-cyan transition text-sm cursor-pointer" data-prompt-de="${escapeHtml(`Ich habe gerade ein 60-Sekunden-Video über "${concept.title_de}" auf sa-in-60s.github.io gesehen.\n\nErkläre mir das Konzept tiefer:\n- Was sind typische Praxisbeispiele?\n- Welche Vor- und Nachteile gibt es?\n- Wie hängt es mit verwandten Konzepten zusammen?\n- Wann sollte man es einsetzen — und wann nicht?`)}" data-prompt-en="${escapeHtml(`I just watched a 60-second video about "${concept.title_en}" on sa-in-60s.github.io.\n\nExplain this concept in more depth:\n- What are typical real-world examples?\n- What are the pros and cons?\n- How does it relate to other concepts?\n- When should you use it — and when not?`)}" data-de="🤖 Tiefer einsteigen" data-en="🤖 Explore deeper">🤖 Tiefer einsteigen</button>
          </div>
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-6 mb-8">
        <div>
          <h3 class="text-sm font-semibold text-text-muted mb-1" data-de="${escapeHtml(t.concept_requires)}" data-en="${escapeHtml(translations.en.concept_requires)}">${escapeHtml(t.concept_requires)}</h3>
          <p>${requiresHtml}</p>
        </div>
        ${
          leadsToHtml
            ? `<div>
          <h3 class="text-sm font-semibold text-text-muted mb-1" data-de="${escapeHtml(t.concept_leads_to)}" data-en="${escapeHtml(translations.en.concept_leads_to)}">${escapeHtml(t.concept_leads_to)}</h3>
          <p>${leadsToHtml}</p>
        </div>`
            : ''
        }
      </div>

    </article>`

  return htmlTemplate({
    title: `${concept.title_de} — Software Architektur in 60 Sekunden`,
    description: `${concept.title_de} (${concept.title_en}) erklärt in 60 Sekunden.`,
    body,
    canonicalPath: `/concept/${concept.id}`,
  })
}

export function generatePathPage(
  path,
  allConcepts,
  translations,
  stemConceptIds = [],
  manifest = null
) {
  const t = translations.de
  const pathConcepts = path.concepts
    .map((id) => allConcepts.find((c) => c.id === id))
    .filter(Boolean)

  const conceptListHtml = pathConcepts
    .map((c) => {
      const hasVideo = !!(c.youtube_de || c.youtube_en)
      return `
      <li class="p-3 bg-bg-card rounded-lg flex items-center gap-2${hasVideo ? '' : ' opacity-40'}">
        ${hasVideo ? `<span class="text-accent-cyan text-sm" data-concept-seen="${escapeHtml(c.id)}">○</span>` : '<span class="text-text-muted text-sm">○</span>'}
        ${hasVideo ? `<a href="/concept/${escapeHtml(c.id)}" class="text-accent-blue hover:underline font-medium" data-unlock-id="${escapeHtml(c.id)}" data-de="${escapeHtml(c.title_de)}" data-en="${escapeHtml(c.title_en)}">${escapeHtml(c.title_de)}</a>` : `<span class="text-text-muted font-medium" data-de="${escapeHtml(c.title_de)}" data-en="${escapeHtml(c.title_en)}">${escapeHtml(c.title_de)}</span>`}
        ${
          c.requires && c.requires.length > 0
            ? `<span class="text-xs text-text-muted ml-2">\u2190 ${c.requires.map((r) => escapeHtml(r)).join(', ')}</span>`
            : ''
        }
      </li>`
    })
    .join('\n')

  const body = `
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2" style="border-left: 4px solid ${escapeHtml(path.color)}; padding-left: 0.75rem;" data-de="${escapeHtml(path.name_de)}" data-en="${escapeHtml(path.name_en)}">${escapeHtml(path.name_de)}</h1>
      <p class="text-text-muted" data-de="${escapeHtml(path.description_de)}" data-en="${escapeHtml(path.description_en)}">${escapeHtml(path.description_de)}</p>
      <p class="text-sm text-text-muted mt-1"><span data-progress-path="${escapeHtml(path.id)}" data-progress-concepts='${JSON.stringify(path.concepts)}' data-progress-total="${path.concepts.length}" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="${path.concepts.length}">0/${path.concepts.length}</span> <span data-de="${escapeHtml(t.path_concepts)}" data-en="${escapeHtml(translations.en.path_concepts)}">${escapeHtml(t.path_concepts)}</span></p>
    </div>
    <div id="stem-hint" class="hidden mb-6 p-3 bg-bg-card rounded-lg border border-accent-orange text-accent-orange text-sm" data-stem-ids='${JSON.stringify(stemConceptIds)}' data-stem-total="${stemConceptIds.length}" data-de="${escapeHtml(t.stem_incomplete_hint)}" data-en="${escapeHtml(translations.en.stem_incomplete_hint)}"></div>
    <div id="unlock-banner" class="hidden mb-6 p-3 bg-bg-card rounded-lg border border-accent-cyan text-accent-cyan text-sm" data-de="${escapeHtml(t.unlock_banner_done)}" data-en="${escapeHtml(translations.en.unlock_banner_done)}"></div>
    <ol class="grid md:grid-cols-2 gap-2">
      ${conceptListHtml}
    </ol>
    ${manifest ? `<script type="application/json" id="unlock-manifest">${JSON.stringify(manifest)}</script>` : ''}`

  return htmlTemplate({
    title: `${path.name_de} — Software Architektur in 60 Sekunden`,
    description: path.description_de,
    body,
    canonicalPath: `/path/${path.id}`,
  })
}

export function buildUnlockManifest(allConcepts, allPaths) {
  const intro = allConcepts.find((c) => c.path === 'intro')
  const stem = allConcepts
    .filter((c) => c.path === 'stem')
    .sort((a, b) => a.path_position - b.path_position)
  const stemIds = intro ? [intro.id, ...stem.map((c) => c.id)] : stem.map((c) => c.id)
  const paths = {}
  const pathMeta = []
  for (const p of allPaths) {
    paths[p.id] = p.concepts
    pathMeta.push({
      id: p.id,
      name_de: p.name_de,
      name_en: p.name_en,
      color: p.color,
    })
  }
  return { stem: stemIds, paths, pathMeta }
}

export function generateIndexPage(allConcepts, allPaths, translations) {
  const t = translations.de
  const totalConcepts = allConcepts.length
  const introConcept = allConcepts.find((c) => c.path === 'intro')
  const stemConcepts = allConcepts.filter((c) => c.path === 'stem')
  const manifest = buildUnlockManifest(allConcepts, allPaths)

  const stemHtml = stemConcepts
    .map((c) => {
      const hasVideo = !!(c.youtube_de || c.youtube_en)
      return hasVideo
        ? `<a href="/concept/${escapeHtml(c.id)}" data-unlock-id="${escapeHtml(c.id)}" class="p-3 bg-bg-card rounded-lg text-center hover:border-accent-cyan border border-transparent transition flex items-center justify-center gap-2"><span class="text-accent-cyan text-xs" data-concept-seen="${escapeHtml(c.id)}">○</span> <span data-de="${escapeHtml(c.title_de)}" data-en="${escapeHtml(c.title_en)}">${escapeHtml(c.title_de)}</span></a>`
        : `<span class="p-3 bg-bg-card rounded-lg text-center border border-transparent opacity-40 flex items-center justify-center gap-2"><span class="text-text-muted text-xs">○</span> <span data-de="${escapeHtml(c.title_de)}" data-en="${escapeHtml(c.title_en)}">${escapeHtml(c.title_de)}</span></span>`
    })
    .join('\n')

  const pathCardsHtml = allPaths
    .map(
      (p) => `
      <a href="/path/${escapeHtml(p.id)}" data-path-id="${escapeHtml(p.id)}" class="p-4 bg-bg-card rounded-lg hover:border-accent-cyan border border-transparent transition" style="border-left: 4px solid ${escapeHtml(p.color)};">
        <h3 class="font-bold" data-de="${escapeHtml(p.name_de)}" data-en="${escapeHtml(p.name_en)}">${escapeHtml(p.name_de)}</h3>
        <p class="text-sm text-text-muted" data-de="${escapeHtml(p.description_de)}" data-en="${escapeHtml(p.description_en)}">${escapeHtml(p.description_de)}</p>
        <p class="text-xs text-text-muted/60 mt-1">${p.concepts
          .slice(1, 4)
          .map((cid) => {
            const cc = allConcepts.find((x) => x.id === cid)
            return cc ? escapeHtml(cc.title_de) : ''
          })
          .filter(Boolean)
          .join(' · ')}</p>
        <p class="text-xs text-text-muted mt-2"><span data-progress-path="${escapeHtml(p.id)}" data-progress-concepts='${JSON.stringify(p.concepts)}' data-progress-total="${p.concepts.length}" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="${p.concepts.length}">0/${p.concepts.length}</span> <span data-de="${escapeHtml(t.path_concepts)}" data-en="${escapeHtml(translations.en.path_concepts)}">${escapeHtml(t.path_concepts)}</span></p>
      </a>`
    )
    .join('\n')

  const body = `
    <section class="text-center py-12">
      <img src="/logo_de.png" alt="${escapeHtml(t.site_title)}" data-lang="de" class="mx-auto max-w-xs mb-4">
      <img src="/logo_en.png" alt="${escapeHtml(translations.en.site_title)}" data-lang="en" class="hidden mx-auto max-w-xs mb-4">
      <p class="text-text-muted text-lg" data-de="${escapeHtml(t.site_subtitle)}" data-en="${escapeHtml(translations.en.site_subtitle)}">${escapeHtml(t.site_subtitle)}</p>
      <p class="text-text-muted text-sm mt-2 max-w-lg mx-auto" data-de="Lerne Software-Architektur in 60-Sekunden-Videos. Starte mit den Grundlagen, dann w&#xE4;hle deinen Lernpfad." data-en="Learn software architecture in 60-second videos. Start with the basics, then choose your learning path.">Lerne Software-Architektur in 60-Sekunden-Videos. Starte mit den Grundlagen, dann wähle deinen Lernpfad.</p>
      <div class="mt-3 max-w-xs mx-auto">
        <div class="h-2 bg-bg-card rounded-full overflow-hidden"><div id="total-progress-bar" class="h-full bg-accent-cyan transition-all" style="width: 0%"></div></div>
        <p class="text-text-muted text-xs mt-1"><span id="total-progress" data-progress-total="${totalConcepts}" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="${totalConcepts}">0/${totalConcepts}</span> <span data-de="gesehen" data-en="seen">gesehen</span></p>
      </div>
    </section>
${
  introConcept
    ? `
    <section class="mb-12">
      <a href="/concept/${escapeHtml(introConcept.id)}" data-unlock-id="${escapeHtml(introConcept.id)}" class="block p-6 bg-bg-card rounded-lg border border-accent-cyan hover:bg-accent-cyan/10 transition text-center">
        <span class="text-accent-cyan text-sm mr-2" data-concept-seen="${escapeHtml(introConcept.id)}">○</span>
        <span class="text-xl font-bold" data-de="${escapeHtml(introConcept.title_de)}" data-en="${escapeHtml(introConcept.title_en)}">${escapeHtml(introConcept.title_de)}</span>
        <p class="text-text-muted text-sm mt-1" data-de="Starte hier" data-en="Start here">Starte hier</p>
      </a>
    </section>`
    : ''
}
    <section class="mb-12">
      <h2 class="text-2xl font-bold mb-2" data-de="${escapeHtml(t.stem_title)}" data-en="${escapeHtml(translations.en.stem_title)}">${escapeHtml(t.stem_title)}</h2>
      <p class="text-text-muted mb-4" data-de="${escapeHtml(t.stem_hint)}" data-en="${escapeHtml(translations.en.stem_hint)}">${escapeHtml(t.stem_hint)}</p>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        ${stemHtml}
      </div>
    </section>

    <div id="unlock-banner" class="hidden mb-6 p-3 bg-bg-card rounded-lg border border-accent-cyan text-accent-cyan text-sm text-center" data-de="${escapeHtml(t.unlock_banner_done)}" data-en="${escapeHtml(translations.en.unlock_banner_done)}"></div>

    <div id="path-chooser" class="hidden mb-8 p-6 bg-bg-card rounded-lg border border-accent-cyan">
      <p class="text-accent-cyan font-medium mb-4" data-de="${escapeHtml(t.unlock_choose_hint)}" data-en="${escapeHtml(translations.en.unlock_choose_hint)}">${escapeHtml(t.unlock_choose_hint)}</p>
      <div id="path-chooser-grid" class="grid md:grid-cols-2 gap-3"></div>
    </div>

    <div id="chosen-paths" class="hidden mb-8">
      <h2 class="text-2xl font-bold mb-4" data-de="Meine Lernpfade" data-en="My Learning Paths">Meine Lernpfade</h2>
      <div id="chosen-paths-grid" class="grid md:grid-cols-2 gap-4"></div>
    </div>

    <section>
      <h2 class="text-2xl font-bold mb-4" data-de="${escapeHtml(t.paths_title)}" data-en="${escapeHtml(translations.en.paths_title)}">${escapeHtml(t.paths_title)}</h2>
      <div id="all-paths-grid" class="grid md:grid-cols-2 gap-4">
        ${pathCardsHtml}
      </div>
    </section>

    <section class="mt-12">
      <details class="bg-bg-card rounded-lg border border-text-muted/20">
        <summary class="p-4 cursor-pointer text-text-muted hover:text-text font-medium" data-de="Wie funktioniert's?" data-en="How does it work?">Wie funktioniert's?</summary>
        <div class="px-4 pb-4 space-y-3 text-sm text-text-muted">
          <p data-de="Jedes Konzept wird in einem 60-Sekunden-Video erkl&#xE4;rt. Starte mit dem Einf&#xFC;hrungsvideo, arbeite dann die 9 Grundlagen-Begriffe (Stamm) durch." data-en="Each concept is explained in a 60-second video. Start with the intro video, then work through the 9 foundational concepts (stem).">Jedes Konzept wird in einem 60-Sekunden-Video erklärt. Starte mit dem Einführungsvideo, arbeite dann die 9 Grundlagen-Begriffe (Stamm) durch.</p>
          <p data-de="Danach w&#xE4;hlst du einen Lernpfad — z.B. Microservices, arc42 oder Docs-as-Code. Jeder Pfad baut aufeinander auf." data-en="Then choose a learning path — e.g. Microservices, arc42, or Docs-as-Code. Each path builds on the previous concepts.">Danach wählst du einen Lernpfad — z.B. Microservices, arc42 oder Docs-as-Code. Jeder Pfad baut aufeinander auf.</p>
          <p data-de="Markiere Begriffe als &#x201E;Verstanden&#x201C;, um deinen Fortschritt zu tracken. Der Fortschritt wird lokal in deinem Browser gespeichert." data-en="Mark concepts as &quot;Got it&quot; to track your progress. Progress is stored locally in your browser.">Markiere Begriffe als „Verstanden", um deinen Fortschritt zu tracken. Der Fortschritt wird lokal in deinem Browser gespeichert.</p>
          <p data-de="Im Abh&#xE4;ngigkeitsgraph siehst du, wie alle Begriffe zusammenh&#xE4;ngen." data-en="The dependency graph shows how all concepts are connected.">Im Abhängigkeitsgraph siehst du, wie alle Begriffe zusammenhängen.</p>
        </div>
      </details>
    </section>

    <script type="application/json" id="unlock-manifest">${JSON.stringify(manifest)}</script>`

  return htmlTemplate({
    title: t.site_title,
    description: `${t.site_subtitle}`,
    body,
    canonicalPath: '/',
  })
}

export function buildGraphData(allConcepts, allPaths) {
  return {
    nodes: allConcepts.map((c) => ({
      id: c.id,
      title_de: c.title_de,
      title_en: c.title_en,
      path: c.path,
    })),
    edges: allConcepts.flatMap((c) => (c.requires || []).map((r) => ({ source: r, target: c.id }))),
    paths: allPaths.map((p) => ({
      id: p.id,
      name_de: p.name_de,
      name_en: p.name_en,
      color: p.color,
    })),
  }
}

export function generateGraphPage(
  allConcepts,
  allPaths,
  translations,
  graphDataUrl = '/data/graph-data.json'
) {
  const t = translations.de
  const tEn = translations.en

  const filterOptions = allPaths
    .map(
      (p) =>
        `<option value="${escapeHtml(p.id)}" data-de="${escapeHtml(p.name_de)}" data-en="${escapeHtml(p.name_en)}">${escapeHtml(p.name_de)}</option>`
    )
    .join('\n')

  const body = `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
      <h1 class="text-3xl font-bold" data-de="${escapeHtml(t.graph_title)}" data-en="${escapeHtml(tEn.graph_title)}">${escapeHtml(t.graph_title)}</h1>
      <select id="graph-filter" class="px-3 py-2 bg-bg-card border border-text-muted rounded text-sm text-text" aria-label="Filter by path">
        <option value="" data-de="${escapeHtml(t.graph_filter_all)}" data-en="${escapeHtml(tEn.graph_filter_all)}">${escapeHtml(t.graph_filter_all)}</option>
        ${filterOptions}
      </select>
    </div>
    <div id="cy" class="rounded-lg border border-text-muted" data-graph-url="${escapeHtml(graphDataUrl)}"></div>
    <div id="graph-tooltip" class="hidden"></div>
    <div class="flex flex-wrap gap-3 mt-3 text-xs text-text-muted">
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-accent-cyan inline-block"></span> <span data-de="Stamm" data-en="Stem">Stamm</span></span>
      ${allPaths.map((p) => `<span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full inline-block" style="background:${escapeHtml(p.color)}"></span> <span data-de="${escapeHtml(p.name_de)}" data-en="${escapeHtml(p.name_en)}">${escapeHtml(p.name_de)}</span></span>`).join('\n      ')}
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full border-2 border-accent-cyan inline-block"></span> <span data-de="Gesehen" data-en="Seen">Gesehen</span></span>
    </div>
    <noscript>
      <p class="text-center text-text-muted py-12" data-de="${escapeHtml(t.graph_noscript)}" data-en="${escapeHtml(tEn.graph_noscript)}">${escapeHtml(t.graph_noscript)}</p>
    </noscript>`

  return htmlTemplate({
    title: `${t.graph_title} — ${t.site_title}`,
    description: t.graph_title,
    body,
    canonicalPath: '/graph',
  })
}

export function generateGoRedirect(concept) {
  const deUrl = concept.youtube_de || ''
  const enUrl = concept.youtube_en || deUrl
  const fallback = `${BASE_URL}/concept/${concept.id}`
  return `<!doctype html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(concept.title_de)} — Video</title>
<style>body{font-family:sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}</style>
<script>
(function(){
  var lang=(localStorage.getItem('sa60s-lang')||(navigator.language||'').slice(0,2)==='de'?'de':'en');
  var de=${JSON.stringify(deUrl)};
  var en=${JSON.stringify(enUrl)};
  var url=(lang==='de'?de:en)||de||en;
  if(url)window.location.replace(url);
})();
</script></head>
<body><p><a href="${escapeHtml(fallback)}" style="color:#22d3ee">${escapeHtml(concept.title_de)} — Video</a></p></body></html>`
}

export function generateAiRedirect(concept) {
  const promptDe = `Ich habe gerade ein 60-Sekunden-Video über "${concept.title_de}" auf sa-in-60s.github.io gesehen.\n\nErkläre mir das Konzept tiefer:\n- Was sind typische Praxisbeispiele?\n- Welche Vor- und Nachteile gibt es?\n- Wie hängt es mit verwandten Konzepten zusammen?\n- Wann sollte man es einsetzen — und wann nicht?`
  const promptEn = `I just watched a 60-second video about "${concept.title_en}" on sa-in-60s.github.io.\n\nExplain this concept in more depth:\n- What are typical real-world examples?\n- What are the pros and cons?\n- How does it relate to other concepts?\n- When should you use it — and when not?`
  return `<!doctype html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(concept.title_de)} — KI-Vertiefung</title>
<style>body{font-family:sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:1rem}
a{display:block;padding:1rem 2rem;margin:0.5rem;border:2px solid #94a3b8;border-radius:0.5rem;color:#e2e8f0;text-decoration:none}a:hover{border-color:#22d3ee;color:#22d3ee}</style>
<script>
(function(){
  var chats={claude:function(p){return'https://claude.ai/new?q='+encodeURIComponent(p)},chatgpt:function(p){return'https://chatgpt.com/?q='+encodeURIComponent(p)},perplexity:function(p){return'https://www.perplexity.ai/?q='+encodeURIComponent(p)}};
  var lang=(localStorage.getItem('sa60s-lang')||(navigator.language||'').slice(0,2)==='de'?'de':'en');
  var prompt=lang==='de'?${JSON.stringify(promptDe)}:${JSON.stringify(promptEn)};
  var saved=localStorage.getItem('sa60s-ai-chat');
  if(saved&&chats[saved])window.location.replace(chats[saved](prompt));
})();
</script></head>
<body><div>
<p style="margin-bottom:1rem">${escapeHtml(concept.title_de)} — KI-Vertiefung</p>
<p style="font-size:0.875rem;color:#94a3b8;margin-bottom:1rem">Wähle deinen KI-Assistenten:</p>
<a href="#" onclick="localStorage.setItem('sa60s-ai-chat','claude');location.reload()">Claude</a>
<a href="#" onclick="localStorage.setItem('sa60s-ai-chat','chatgpt');location.reload()">ChatGPT</a>
<a href="#" onclick="localStorage.setItem('sa60s-ai-chat','perplexity');location.reload()">Perplexity</a>
</div></body></html>`
}

export function generateSetupPage() {
  return `<!doctype html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>KI-Assistent wählen — SA-in-60s</title>
<style>body{font-family:sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:1rem}
.card{background:#1e293b;border-radius:1rem;padding:2rem;max-width:400px;width:100%}
h1{font-size:1.5rem;margin-bottom:0.5rem}
p{color:#94a3b8;font-size:0.875rem;margin-bottom:1.5rem}
a{display:block;padding:1rem;margin:0.5rem 0;border:2px solid #94a3b8;border-radius:0.5rem;color:#e2e8f0;text-decoration:none;font-size:1.1rem}
a:hover{border-color:#22d3ee;color:#22d3ee}
.ok{display:none;color:#22d3ee;margin-top:1rem;font-weight:bold}
</style></head>
<body><div class="card">
<h1>🤖 KI-Assistent wählen</h1>
<p>Wähle deinen bevorzugten KI-Assistenten. Alle QR-Codes im Buch öffnen dann diesen Chat mit einem vorausgefüllten Prompt.</p>
<a href="#" onclick="pick('claude')">Claude</a>
<a href="#" onclick="pick('chatgpt')">ChatGPT</a>
<a href="#" onclick="pick('perplexity')">Perplexity</a>
<p class="ok" id="ok"></p>
</div>
<script>
function pick(id){
  var names={claude:'Claude',chatgpt:'ChatGPT',perplexity:'Perplexity'};
  localStorage.setItem('sa60s-ai-chat',id);
  document.getElementById('ok').style.display='block';
  document.getElementById('ok').textContent='✓ Gespeichert! Alle 🤖-QR-Codes öffnen jetzt '+names[id]+'.';
}
(function(){
  var saved=localStorage.getItem('sa60s-ai-chat');
  if(saved){var names={claude:'Claude',chatgpt:'ChatGPT',perplexity:'Perplexity'};
  document.getElementById('ok').style.display='block';
  document.getElementById('ok').textContent='Aktuell: '+names[saved]+'. Tippe auf einen anderen, um zu wechseln.';}
})();
</script></body></html>`
}

// CLI entry point — generates static site into dist/ (after Vite build)
if (process.argv[1] === __filename) {
  try {
    const dataDir = resolve(__dirname, '..', 'data')
    const distDir = resolve(__dirname, '..', 'dist')

    // Read Vite manifest to find hashed asset filenames
    const manifestPath = resolve(distDir, '.vite', 'manifest.json')
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      const entry = manifest['index.html'] || manifest['src/main.js'] || {}
      const cssFile = entry.css?.[0]
      const jsFile = entry.file
      setAssetPaths({
        css: cssFile ? `/${cssFile}` : '/assets/main.css',
        js: jsFile ? `/${jsFile}` : '/src/main.js',
      })
      console.warn(`Assets: CSS=${assetPaths.css}, JS=${assetPaths.js}`)
    } catch (_) {
      console.warn('No Vite manifest found, using default asset paths')
    }

    const publicDir = distDir

    const concepts = JSON.parse(readFileSync(resolve(dataDir, 'concepts.json'), 'utf-8'))
    const paths = JSON.parse(readFileSync(resolve(dataDir, 'paths.json'), 'utf-8'))
    const translations = JSON.parse(readFileSync(resolve(dataDir, 'translations.json'), 'utf-8'))

    // Generate concept pages
    const conceptDir = resolve(publicDir, 'concept')
    mkdirSync(conceptDir, { recursive: true })
    for (const concept of concepts) {
      const html = generateConceptPage(concept, concepts, paths, translations)
      writeFileSync(resolve(conceptDir, `${concept.id}.html`), html)
    }
    console.warn(`Generated ${concepts.length} concept pages`)

    // Generate path pages
    const pathDir = resolve(publicDir, 'path')
    mkdirSync(pathDir, { recursive: true })
    const stemIds = concepts.filter((c) => c.path === 'stem').map((c) => c.id)
    const unlockManifest = buildUnlockManifest(concepts, paths)
    for (const path of paths) {
      const html = generatePathPage(path, concepts, translations, stemIds, unlockManifest)
      writeFileSync(resolve(pathDir, `${path.id}.html`), html)
    }
    console.warn(`Generated ${paths.length} path pages`)

    // Generate index page
    const indexHtml = generateIndexPage(concepts, paths, translations)
    writeFileSync(resolve(publicDir, 'index.html'), indexHtml)
    console.warn('Generated index.html')

    // Generate graph page
    const graphDir = resolve(publicDir, 'graph')
    mkdirSync(graphDir, { recursive: true })
    // Generate graph data with content hash
    const dataOutDir = resolve(publicDir, 'data')
    mkdirSync(dataOutDir, { recursive: true })
    const graphData = buildGraphData(concepts, paths)
    const graphJson = JSON.stringify(graphData)
    const graphHash = createHash('md5').update(graphJson).digest('hex').slice(0, 8)
    const graphDataFile = `graph-data-${graphHash}.json`
    writeFileSync(resolve(dataOutDir, graphDataFile), graphJson)
    console.warn(
      `Generated ${graphDataFile} (${graphData.nodes.length} nodes, ${graphData.edges.length} edges)`
    )

    const graphHtml = generateGraphPage(concepts, paths, translations, `/data/${graphDataFile}`)
    writeFileSync(resolve(graphDir, 'index.html'), graphHtml)
    console.warn('Generated graph/index.html')

    // Generate redirect pages (/go/{id}, /ai/{id}, /setup)
    const goDir = resolve(publicDir, 'go')
    const aiDir = resolve(publicDir, 'ai')
    const setupDir = resolve(publicDir, 'setup')
    mkdirSync(goDir, { recursive: true })
    mkdirSync(aiDir, { recursive: true })
    mkdirSync(setupDir, { recursive: true })
    for (const concept of concepts) {
      const token = concept.token || concept.id
      writeFileSync(resolve(goDir, `${token}.html`), generateGoRedirect(concept))
      writeFileSync(resolve(aiDir, `${token}.html`), generateAiRedirect(concept))
      // Keep human-readable aliases for existing links
      if (concept.token && concept.token !== concept.id) {
        writeFileSync(resolve(goDir, `${concept.id}.html`), generateGoRedirect(concept))
        writeFileSync(resolve(aiDir, `${concept.id}.html`), generateAiRedirect(concept))
      }
    }
    writeFileSync(resolve(setupDir, 'index.html'), generateSetupPage())
    const tokenCount = concepts.filter((c) => c.token).length
    const aliasCount = tokenCount * 2
    console.warn(
      `Generated ${tokenCount * 2 + aliasCount + 1} redirect pages (/go/, /ai/, /setup)`
    )

    // Generate sitemap (only stem concepts + paths + main pages)
    const stemConcepts = concepts.filter((c) => c.path === 'stem')
    const urls = [
      BASE_URL,
      `${BASE_URL}/graph`,
      ...paths.map((p) => `${BASE_URL}/path/${p.id}`),
      ...stemConcepts.map((c) => `${BASE_URL}/concept/${c.id}`),
    ]
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>`
    writeFileSync(resolve(publicDir, 'sitemap.xml'), sitemap)
    console.warn(`Generated sitemap.xml (${urls.length} URLs)`)

    // Generate robots.txt — only index stem concepts, block redirects
    const stemPaths = stemConcepts.map((c) => `Allow: /concept/${c.id}`).join('\n')
    writeFileSync(
      resolve(publicDir, 'robots.txt'),
      `User-agent: *\nDisallow: /go/\nDisallow: /ai/\nDisallow: /setup/\nDisallow: /concept/\n${stemPaths}\nAllow: /path/\nAllow: /graph\nAllow: /\n\nSitemap: ${BASE_URL}/sitemap.xml\n`
    )
    console.warn('Generated robots.txt')
  } catch (err) {
    console.error(`Build error: ${err.message}`)
    process.exit(1)
  }
}
