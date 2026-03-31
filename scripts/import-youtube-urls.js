/**
 * Import YouTube URLs from a TSV/CSV file into concepts.json.
 *
 * File format (tab or comma separated):
 *   episode_id, youtube_de_url, youtube_en_url
 *
 * Example:
 *   ep001	https://youtube.com/shorts/abc123	https://youtube.com/shorts/def456
 *   ep002	https://youtube.com/shorts/ghi789
 *
 * Usage: node scripts/import-youtube-urls.js <path-to-urls-file>
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const urlsFile = process.argv[2]
if (!urlsFile) {
  console.error('Usage: node scripts/import-youtube-urls.js <path-to-urls-file>')
  console.error('')
  console.error('File format (tab or comma separated, one episode per line):')
  console.error('  ep001  https://youtube.com/shorts/abc123  https://youtube.com/shorts/def456')
  process.exit(1)
}

const conceptsPath = resolve(__dirname, '..', 'data', 'concepts.json')
const concepts = JSON.parse(readFileSync(conceptsPath, 'utf-8'))

const lines = readFileSync(resolve(urlsFile), 'utf-8')
  .trim()
  .split('\n')
  .filter((l) => l.trim() && !l.startsWith('#'))

const youtubePattern = /^https:\/\/(www\.)?youtube\.com\/shorts\/[a-zA-Z0-9_-]+$/

let updated = 0
let errors = 0

for (const line of lines) {
  const parts = line.split(/[,\t]+/).map((s) => s.trim())
  const [episode, urlDe, urlEn] = parts

  if (!episode) continue

  const concept = concepts.find((c) => c.episode === episode)
  if (!concept) {
    console.warn(`  SKIP: no concept for episode "${episode}"`)
    continue
  }

  if (urlDe) {
    if (!youtubePattern.test(urlDe)) {
      console.error(`  ERROR: invalid YouTube URL for ${episode} DE: ${urlDe}`)
      errors++
      continue
    }
    concept.youtube_de = urlDe
  }

  if (urlEn) {
    if (!youtubePattern.test(urlEn)) {
      console.error(`  ERROR: invalid YouTube URL for ${episode} EN: ${urlEn}`)
      errors++
      continue
    }
    concept.youtube_en = urlEn
  }

  if (urlDe || urlEn) {
    updated++
    console.warn(`  ${episode}: DE=${urlDe || '(none)'} EN=${urlEn || '(none)'}`)
  }
}

if (errors > 0) {
  console.error(`\n${errors} errors found. Fix the URLs and try again.`)
  process.exit(1)
}

writeFileSync(conceptsPath, JSON.stringify(concepts, null, 2) + '\n')
console.warn(`\nUpdated ${updated} concepts with YouTube URLs`)
