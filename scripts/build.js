import { readFileSync, writeFileSync, mkdirSync } from 'fs'
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
  ${jsTag}
</body>
</html>`
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
      <div class="flex items-center gap-3 mb-2">
        <button class="seen-button w-9 h-9 rounded-full border-2 border-accent-cyan text-accent-cyan hover:bg-accent-cyan hover:text-bg transition flex-shrink-0 text-lg" data-concept-id="${escapeHtml(concept.id)}" aria-pressed="false" aria-label="${escapeHtml(t.seen_button)}: ${escapeHtml(concept.title_de)}">○</button>
        <h1 class="text-3xl font-bold" data-de="${escapeHtml(concept.title_de)}" data-en="${escapeHtml(concept.title_en)}">${escapeHtml(concept.title_de)}</h1>
      </div>
      <p class="text-text-muted mb-6">${escapeHtml(t.concept_path)}: ${pathLink}</p>

      <div class="md:flex md:gap-8 mb-8">
        <div class="md:w-1/3 mb-6 md:mb-0">
          <div id="video-de" data-lang="de">
            ${youtubeEmbed(concept.youtube_de, t.concept_video_placeholder, youtubeDeTitle)}
          </div>
          <div id="video-en" data-lang="en" class="hidden">
            ${youtubeEmbed(concept.youtube_en, translations.en.concept_video_placeholder, youtubeEnTitle)}
          </div>
          <p class="text-center mt-2 text-sm">
            <a href="#" id="switch-video-lang" class="text-accent-cyan hover:underline" data-de="Watch in English" data-en="Auf Deutsch ansehen">Watch in English</a>
          </p>
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

export function generatePathPage(path, allConcepts, translations) {
  const t = translations.de
  const pathConcepts = path.concepts
    .map((id) => allConcepts.find((c) => c.id === id))
    .filter(Boolean)

  const conceptListHtml = pathConcepts
    .map(
      (c) => `
      <li class="p-3 bg-bg-card rounded-lg flex items-center gap-2">
        <span class="text-accent-cyan text-sm" data-concept-seen="${escapeHtml(c.id)}">○</span>
        <a href="/concept/${escapeHtml(c.id)}" class="text-accent-blue hover:underline font-medium" data-de="${escapeHtml(c.title_de)}" data-en="${escapeHtml(c.title_en)}">${escapeHtml(c.title_de)}</a>
        ${
          c.requires && c.requires.length > 0
            ? `<span class="text-xs text-text-muted ml-2">\u2190 ${c.requires.map((r) => escapeHtml(r)).join(', ')}</span>`
            : ''
        }
      </li>`
    )
    .join('\n')

  const body = `
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2" style="border-left: 4px solid ${escapeHtml(path.color)}; padding-left: 0.75rem;" data-de="${escapeHtml(path.name_de)}" data-en="${escapeHtml(path.name_en)}">${escapeHtml(path.name_de)}</h1>
      <p class="text-text-muted" data-de="${escapeHtml(path.description_de)}" data-en="${escapeHtml(path.description_en)}">${escapeHtml(path.description_de)}</p>
      <p class="text-sm text-text-muted mt-1"><span data-progress-path="${escapeHtml(path.id)}" data-progress-concepts='${JSON.stringify(path.concepts)}' data-progress-total="${path.concepts.length}" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="${path.concepts.length}">0/${path.concepts.length}</span> <span data-de="${escapeHtml(t.path_concepts)}" data-en="${escapeHtml(translations.en.path_concepts)}">${escapeHtml(t.path_concepts)}</span></p>
    </div>
    <div id="stem-hint" class="hidden mb-6 p-3 bg-bg-card rounded-lg border border-accent-orange text-accent-orange text-sm"></div>
    <ol class="grid md:grid-cols-2 gap-2">
      ${conceptListHtml}
    </ol>`

  return htmlTemplate({
    title: `${path.name_de} — Software Architektur in 60 Sekunden`,
    description: path.description_de,
    body,
    canonicalPath: `/path/${path.id}`,
  })
}

export function generateIndexPage(allConcepts, allPaths, translations) {
  const t = translations.de
  const totalConcepts = allConcepts.length
  const introConcept = allConcepts.find((c) => c.path === 'intro')
  const stemConcepts = allConcepts.filter((c) => c.path === 'stem')

  const stemHtml = stemConcepts
    .map(
      (c) =>
        `<a href="/concept/${escapeHtml(c.id)}" class="p-3 bg-bg-card rounded-lg text-center hover:border-accent-cyan border border-transparent transition flex items-center justify-center gap-2"><span class="text-accent-cyan text-xs" data-concept-seen="${escapeHtml(c.id)}">○</span> <span data-de="${escapeHtml(c.title_de)}" data-en="${escapeHtml(c.title_en)}">${escapeHtml(c.title_de)}</span></a>`
    )
    .join('\n')

  const pathCardsHtml = allPaths
    .map(
      (p) => `
      <a href="/path/${escapeHtml(p.id)}" class="p-4 bg-bg-card rounded-lg hover:border-accent-cyan border border-transparent transition" style="border-left: 4px solid ${escapeHtml(p.color)};">
        <h3 class="font-bold" data-de="${escapeHtml(p.name_de)}" data-en="${escapeHtml(p.name_en)}">${escapeHtml(p.name_de)}</h3>
        <p class="text-sm text-text-muted" data-de="${escapeHtml(p.description_de)}" data-en="${escapeHtml(p.description_en)}">${escapeHtml(p.description_de)}</p>
        <p class="text-xs text-text-muted mt-2"><span data-progress-path="${escapeHtml(p.id)}" data-progress-concepts='${JSON.stringify(p.concepts)}' data-progress-total="${p.concepts.length}" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="${p.concepts.length}">0/${p.concepts.length}</span> <span data-de="${escapeHtml(t.path_concepts)}" data-en="${escapeHtml(translations.en.path_concepts)}">${escapeHtml(t.path_concepts)}</span></p>
      </a>`
    )
    .join('\n')

  const body = `
    <section class="text-center py-12">
      <h1 class="text-4xl font-bold mb-2" data-de="${escapeHtml(t.site_title)}" data-en="${escapeHtml(translations.en.site_title)}">${escapeHtml(t.site_title)}</h1>
      <p class="text-text-muted text-lg" data-de="${escapeHtml(t.site_subtitle)}" data-en="${escapeHtml(translations.en.site_subtitle)}">${escapeHtml(t.site_subtitle)}</p>
      <p class="text-text-muted text-sm mt-2"><span id="total-progress" data-progress-total="${totalConcepts}" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="${totalConcepts}">0/${totalConcepts}</span> <span data-de="gesehen" data-en="seen">gesehen</span></p>
    </section>
${
  introConcept
    ? `
    <section class="mb-12">
      <a href="/concept/${escapeHtml(introConcept.id)}" class="block p-6 bg-bg-card rounded-lg border border-accent-cyan hover:bg-accent-cyan/10 transition text-center">
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

    <section>
      <h2 class="text-2xl font-bold mb-4" data-de="${escapeHtml(t.paths_title)}" data-en="${escapeHtml(translations.en.paths_title)}">${escapeHtml(t.paths_title)}</h2>
      <div class="grid md:grid-cols-2 gap-4">
        ${pathCardsHtml}
      </div>
    </section>`

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

export function generateGraphPage(allConcepts, allPaths, translations) {
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
    <div id="cy" class="rounded-lg border border-text-muted"></div>
    <div id="graph-tooltip" class="hidden"></div>
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
    for (const path of paths) {
      const html = generatePathPage(path, concepts, translations)
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
    const graphHtml = generateGraphPage(concepts, paths, translations)
    writeFileSync(resolve(graphDir, 'index.html'), graphHtml)
    console.warn('Generated graph/index.html')

    // Generate graph data
    const dataOutDir = resolve(publicDir, 'data')
    mkdirSync(dataOutDir, { recursive: true })
    const graphData = buildGraphData(concepts, paths)
    writeFileSync(resolve(dataOutDir, 'graph-data.json'), JSON.stringify(graphData))
    console.warn(
      `Generated graph-data.json (${graphData.nodes.length} nodes, ${graphData.edges.length} edges)`
    )

    // Generate sitemap
    const urls = [
      BASE_URL,
      `${BASE_URL}/graph`,
      ...paths.map((p) => `${BASE_URL}/path/${p.id}`),
      ...concepts.map((c) => `${BASE_URL}/concept/${c.id}`),
    ]
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>`
    writeFileSync(resolve(publicDir, 'sitemap.xml'), sitemap)
    console.warn(`Generated sitemap.xml (${urls.length} URLs)`)

    // Generate robots.txt
    writeFileSync(
      resolve(publicDir, 'robots.txt'),
      `User-agent: *\nAllow: /\n\nSitemap: ${BASE_URL}/sitemap.xml\n`
    )
    console.warn('Generated robots.txt')
  } catch (err) {
    console.error(`Build error: ${err.message}`)
    process.exit(1)
  }
}
