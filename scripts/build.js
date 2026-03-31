import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function youtubeEmbed(url, placeholder = 'Video in Produktion') {
  if (!url) {
    return `<div class="video-placeholder bg-bg-card rounded-lg flex items-center justify-center aspect-9/16 max-w-xs mx-auto text-text-muted">${placeholder}</div>`
  }
  const videoId = url.split('/').pop().split('?')[0]
  return `<iframe src="https://www.youtube.com/embed/${videoId}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="aspect-9/16 max-w-xs mx-auto rounded-lg w-full"></iframe>`
}

function htmlTemplate({ title, description, body, lang = 'de' }) {
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:type" content="website" />
  <link rel="stylesheet" href="/assets/main.css" />
</head>
<body class="min-h-screen bg-bg text-text">
  <nav class="p-4 flex justify-between items-center max-w-5xl mx-auto">
    <a href="/" class="text-accent-cyan font-bold" data-de="Start" data-en="Home">Start</a>
    <div class="flex gap-4 items-center">
      <a href="/graph" class="text-text-muted hover:text-text" data-de="Graph" data-en="Graph">Graph</a>
      <button id="lang-toggle" class="px-2 py-1 border border-text-muted rounded text-sm" data-de="EN" data-en="DE">EN</button>
    </div>
  </nav>
  <main class="max-w-5xl mx-auto px-4 pb-16">
    ${body}
  </main>
  <script type="module" src="/src/main.js"></script>
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
    ? `<a href="/path/${path.id}" class="text-accent-cyan" style="border-left: 3px solid ${path.color}; padding-left: 0.5rem;" data-de="${path.name_de}" data-en="${path.name_en}">${path.name_de}</a>`
    : ''

  const requiresHtml =
    requires.length > 0
      ? requires
          .map(
            (r) =>
              `<a href="/concept/${r.id}" class="text-accent-blue hover:underline" data-de="${r.title_de}" data-en="${r.title_en}">${r.title_de}</a>`
          )
          .join(', ')
      : '—'

  const leadsToHtml =
    leadsTo.length > 0
      ? leadsTo
          .map(
            (r) =>
              `<a href="/concept/${r.id}" class="text-accent-blue hover:underline" data-de="${r.title_de}" data-en="${r.title_en}">${r.title_de}</a>`
          )
          .join(', ')
      : ''

  const body = `
    <article>
      <h1 class="text-3xl font-bold mb-2" data-de="${concept.title_de}" data-en="${concept.title_en}">${concept.title_de}</h1>
      <p class="text-text-muted mb-6" data-de="${t.concept_path}" data-en="${translations.en.concept_path}">${t.concept_path}: ${pathLink}</p>

      <div class="grid md:grid-cols-2 gap-6 mb-8">
        <div>
          <h2 class="text-sm text-text-muted mb-2" data-de="Deutsch" data-en="German">Deutsch</h2>
          ${youtubeEmbed(concept.youtube_de, t.concept_video_placeholder)}
        </div>
        <div>
          <h2 class="text-sm text-text-muted mb-2" data-de="${t.concept_video_alt_lang}" data-en="${translations.en.concept_video_alt_lang}">${t.concept_video_alt_lang}</h2>
          ${youtubeEmbed(concept.youtube_en, translations.en.concept_video_placeholder)}
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-6 mb-8">
        <div>
          <h3 class="text-sm font-semibold text-text-muted mb-1" data-de="${t.concept_requires}" data-en="${translations.en.concept_requires}">${t.concept_requires}</h3>
          <p>${requiresHtml}</p>
        </div>
        ${
          leadsToHtml
            ? `<div>
          <h3 class="text-sm font-semibold text-text-muted mb-1" data-de="${t.concept_leads_to}" data-en="${translations.en.concept_leads_to}">${t.concept_leads_to}</h3>
          <p>${leadsToHtml}</p>
        </div>`
            : ''
        }
      </div>

      <button class="seen-button px-4 py-2 rounded border border-accent-cyan text-accent-cyan hover:bg-accent-cyan hover:text-bg transition" data-concept-id="${concept.id}" data-de="${t.seen_button}" data-en="${translations.en.seen_button}">${t.seen_button}</button>
    </article>`

  return htmlTemplate({
    title: `${concept.title_de} — Software Architektur in 60 Sekunden`,
    description: `${concept.title_de} (${concept.title_en}) erklärt in 60 Sekunden.`,
    body,
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
      <li class="p-3 bg-bg-card rounded-lg">
        <a href="/concept/${c.id}" class="text-accent-blue hover:underline font-medium" data-de="${c.title_de}" data-en="${c.title_en}">${c.title_de}</a>
        ${
          c.requires && c.requires.length > 0
            ? `<span class="text-xs text-text-muted ml-2">← ${c.requires.join(', ')}</span>`
            : ''
        }
      </li>`
    )
    .join('\n')

  const body = `
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2" style="border-left: 4px solid ${path.color}; padding-left: 0.75rem;" data-de="${path.name_de}" data-en="${path.name_en}">${path.name_de}</h1>
      <p class="text-text-muted" data-de="${path.description_de}" data-en="${path.description_en}">${path.description_de}</p>
      <p class="text-sm text-text-muted mt-1">${path.concepts.length} <span data-de="${t.path_concepts}" data-en="${translations.en.path_concepts}">${t.path_concepts}</span></p>
    </div>
    <div id="stem-hint" class="hidden mb-6 p-3 bg-bg-card rounded-lg border border-accent-orange text-accent-orange text-sm"></div>
    <ol class="space-y-2">
      ${conceptListHtml}
    </ol>`

  return htmlTemplate({
    title: `${path.name_de} — Software Architektur in 60 Sekunden`,
    description: path.description_de,
    body,
  })
}

export function generateIndexPage(allConcepts, allPaths, translations) {
  const t = translations.de
  const stemConcepts = allConcepts.filter((c) => c.path === 'stem')

  const stemHtml = stemConcepts
    .map(
      (c) =>
        `<a href="/concept/${c.id}" class="p-3 bg-bg-card rounded-lg text-center hover:border-accent-cyan border border-transparent transition" data-de="${c.title_de}" data-en="${c.title_en}">${c.title_de}</a>`
    )
    .join('\n')

  const pathCardsHtml = allPaths
    .map(
      (p) => `
      <a href="/path/${p.id}" class="p-4 bg-bg-card rounded-lg hover:border-accent-cyan border border-transparent transition" style="border-left: 4px solid ${p.color};">
        <h3 class="font-bold" data-de="${p.name_de}" data-en="${p.name_en}">${p.name_de}</h3>
        <p class="text-sm text-text-muted" data-de="${p.description_de}" data-en="${p.description_en}">${p.description_de}</p>
        <p class="text-xs text-text-muted mt-2">${p.concepts.length} <span data-de="${t.path_concepts}" data-en="${translations.en.path_concepts}">${t.path_concepts}</span></p>
      </a>`
    )
    .join('\n')

  const body = `
    <section class="text-center py-12">
      <h1 class="text-4xl font-bold mb-2" data-de="${t.site_title}" data-en="${translations.en.site_title}">${t.site_title}</h1>
      <p class="text-text-muted text-lg" data-de="${t.site_subtitle}" data-en="${translations.en.site_subtitle}">${t.site_subtitle}</p>
    </section>

    <section class="mb-12">
      <h2 class="text-2xl font-bold mb-2" data-de="${t.stem_title}" data-en="${translations.en.stem_title}">${t.stem_title}</h2>
      <p class="text-text-muted mb-4" data-de="${t.stem_hint}" data-en="${translations.en.stem_hint}">${t.stem_hint}</p>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        ${stemHtml}
      </div>
    </section>

    <section>
      <h2 class="text-2xl font-bold mb-4" data-de="${t.paths_title}" data-en="${translations.en.paths_title}">${t.paths_title}</h2>
      <div class="grid md:grid-cols-2 gap-4">
        ${pathCardsHtml}
      </div>
    </section>`

  return htmlTemplate({
    title: t.site_title,
    description: `${t.site_subtitle}`,
    body,
  })
}

// CLI entry point — generates static site into public/
if (process.argv[1] === __filename) {
  const dataDir = resolve(__dirname, '..', 'data')
  const publicDir = resolve(__dirname, '..', 'public')

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
  console.log(`Generated ${concepts.length} concept pages`)

  // Generate path pages
  const pathDir = resolve(publicDir, 'path')
  mkdirSync(pathDir, { recursive: true })
  for (const path of paths) {
    const html = generatePathPage(path, concepts, translations)
    writeFileSync(resolve(pathDir, `${path.id}.html`), html)
  }
  console.log(`Generated ${paths.length} path pages`)

  // Generate index page
  const indexHtml = generateIndexPage(concepts, paths, translations)
  writeFileSync(resolve(publicDir, 'index.html'), indexHtml)
  console.log('Generated index.html')

  // Generate sitemap
  const baseUrl = 'https://sa-in-60s.github.io'
  const urls = [
    baseUrl,
    `${baseUrl}/graph`,
    ...paths.map((p) => `${baseUrl}/path/${p.id}`),
    ...concepts.map((c) => `${baseUrl}/concept/${c.id}`),
  ]
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>`
  writeFileSync(resolve(publicDir, 'sitemap.xml'), sitemap)
  console.log(`Generated sitemap.xml (${urls.length} URLs)`)
}
