/**
 * Generate Leanpub Markua manuscript from concepts.json + paths.json.
 * Creates QR codes pointing to sa-in-60s.github.io redirect pages.
 *
 * Usage: node scripts/generate-ebook.js [--lang de|en]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import QRCode from 'qrcode'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const BASE_URL = 'https://sa-in-60s.github.io'

const lang = process.argv.includes('--lang')
  ? process.argv[process.argv.indexOf('--lang') + 1]
  : 'de'

const dataDir = resolve(__dirname, '..', 'data')
const outDir = resolve(__dirname, '..', 'ebook', 'manuscript')
const imgDir = resolve(outDir, 'images')

mkdirSync(imgDir, { recursive: true })

const concepts = JSON.parse(readFileSync(resolve(dataDir, 'concepts.json'), 'utf-8'))
const paths = JSON.parse(readFileSync(resolve(dataDir, 'paths.json'), 'utf-8'))

const t =
  lang === 'de'
    ? {
        bookTitle: 'Software-Architektur in 60 Sekunden',
        intro: 'Einleitung',
        stem: 'Gemeinsamer Stamm',
        videoLabel: '🎬 Video ansehen',
        aiLabel: '🤖 Mit KI vertiefen',
        setupLabel: '🤖 KI-Assistent einrichten',
        setupText:
          'Scanne diesen QR-Code, um deinen bevorzugten KI-Assistenten (Claude, ChatGPT oder Perplexity) auszuwählen. Alle 🤖-QR-Codes im Buch öffnen dann diesen Chat mit einem vorausgefüllten Prompt.',
        introText:
          'Dieses Buch begleitet die YouTube-Serie "Software-Architektur in 60 Sekunden". Jedes Kapitel erklärt einen Begriff — mit einem kurzen Text, einem Merksatz und zwei QR-Codes:\n\n- 🎬 **Video ansehen** — öffnet das 60-Sekunden-Video auf YouTube\n- 🤖 **Mit KI vertiefen** — öffnet deinen KI-Assistenten mit einem vorausgefüllten Prompt zum Thema\n\nRichte zuerst deinen KI-Assistenten ein:',
        merksatz: 'Merksatz',
      }
    : {
        bookTitle: 'Software Architecture in 60 Seconds',
        intro: 'Introduction',
        stem: 'Common Stem',
        videoLabel: '🎬 Watch Video',
        aiLabel: '🤖 Explore with AI',
        setupLabel: '🤖 Set up AI Assistant',
        setupText:
          'Scan this QR code to choose your preferred AI assistant (Claude, ChatGPT, or Perplexity). All 🤖 QR codes in the book will then open that chat with a pre-filled prompt.',
        introText:
          'This book accompanies the YouTube series "Software Architecture in 60 Seconds". Each chapter explains one concept — with a short text, a key takeaway, and two QR codes:\n\n- 🎬 **Watch Video** — opens the 60-second video on YouTube\n- 🤖 **Explore with AI** — opens your AI assistant with a pre-filled prompt about the topic\n\nFirst, set up your AI assistant:',
        merksatz: 'Remember',
      }

async function generateQR(url, filename) {
  await QRCode.toFile(resolve(imgDir, filename), url, {
    width: 300,
    margin: 1,
    color: { dark: '#0f172a', light: '#ffffff' },
  })
}

function conceptToMarkua(concept) {
  const title = concept[`title_${lang}`] || concept.title_de
  const script = concept[`script_${lang}`] || concept.script_de || ''
  const merksatz = concept[`merksatz_${lang}`] || concept.merksatz_de || ''

  const paragraphs = script
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)

  // Remove the merksatz paragraph from script if it starts with "Merke:" or "Remember:"
  const filteredParagraphs = paragraphs.filter(
    (p) => !p.startsWith('Merke:') && !p.startsWith('Remember:')
  )

  let md = `### ${title} {#${concept.id}}\n\n`

  if (merksatz) {
    md += `> **${t.merksatz}:** ${merksatz}\n\n`
  }

  md += filteredParagraphs.join('\n\n') + '\n\n'

  md += `{width=25%}\n![${t.videoLabel}](images/qr-go-${concept.id}.png)\n\n`
  md += `{width=25%}\n![${t.aiLabel}](images/qr-ai-${concept.id}.png)\n\n`

  return md
}

async function main() {
  console.warn(`Generating ${lang.toUpperCase()} eBook...`)

  // Generate QR codes
  console.warn('Generating QR codes...')
  await generateQR(`${BASE_URL}/setup`, 'qr-setup.png')

  for (const concept of concepts) {
    await generateQR(`${BASE_URL}/go/${concept.id}`, `qr-go-${concept.id}.png`)
    await generateQR(`${BASE_URL}/ai/${concept.id}`, `qr-ai-${concept.id}.png`)
  }
  console.warn(`Generated ${concepts.length * 2 + 1} QR codes`)

  // Build chapters
  const chapters = []

  // Introduction
  let intro = `# ${t.intro}\n\n`
  intro += `${t.introText}\n\n`
  intro += `{width=30%}\n![${t.setupLabel}](images/qr-setup.png)\n\n`
  writeFileSync(resolve(outDir, 'introduction.md'), intro)
  chapters.push('introduction.md')

  // Stem
  const introConcept = concepts.find((c) => c.path === 'intro')
  const stemConcepts = concepts
    .filter((c) => c.path === 'stem')
    .sort((a, b) => a.path_position - b.path_position)
  const allStem = introConcept ? [introConcept, ...stemConcepts] : stemConcepts

  let stemMd = `# ${t.stem}\n\n`
  for (const c of allStem) {
    stemMd += conceptToMarkua(c)
  }
  writeFileSync(resolve(outDir, 'stem.md'), stemMd)
  chapters.push('stem.md')

  // Learning paths
  for (const path of paths) {
    const pathConcepts = path.concepts
      .map((id) => concepts.find((c) => c.id === id))
      .filter(Boolean)

    const pathName = path[`name_${lang}`] || path.name_de
    let pathMd = `# ${pathName}\n\n`

    for (const c of pathConcepts) {
      pathMd += conceptToMarkua(c)
    }

    const filename = `path-${path.id}.md`
    writeFileSync(resolve(outDir, filename), pathMd)
    chapters.push(filename)
  }

  // Book.txt (chapter order)
  writeFileSync(resolve(outDir, 'Book.txt'), chapters.join('\n') + '\n')
  console.warn(`Generated ${chapters.length} chapters in ${outDir}`)
  console.warn('Book.txt:')
  chapters.forEach((c) => console.warn(`  ${c}`))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
