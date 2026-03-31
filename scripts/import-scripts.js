/**
 * Import video script texts from the videos/ output directory into concepts.json.
 * Reads script.txt files and extracts the Merksatz (last paragraph starting with "Merke:").
 *
 * Usage: node scripts/import-scripts.js [path-to-videos-output]
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const videosDir =
  process.argv[2] ||
  resolve(__dirname, '..', '..', '..', 'videos', 'output', 'software-architektur')
const conceptsPath = resolve(__dirname, '..', 'data', 'concepts.json')

const concepts = JSON.parse(readFileSync(conceptsPath, 'utf-8'))

// Map episode dirs to concept IDs
const episodeDirs = readdirSync(videosDir).filter((d) => d.startsWith('ep'))

let updated = 0
for (const concept of concepts) {
  const episode = concept.episode
  if (!episode) continue

  // Find DE script
  const deDir = episodeDirs.find((d) => d.startsWith(episode) && !d.includes('-en-'))
  if (deDir) {
    try {
      const script = readFileSync(resolve(videosDir, deDir, 'script.txt'), 'utf-8').trim()
      const paragraphs = script.split(/\n\n+/)
      const lastPara = paragraphs[paragraphs.length - 1]
      const merksatz = lastPara.startsWith('Merke:') ? lastPara.replace('Merke: ', '') : ''
      concept.script_de = script
      concept.merksatz_de = merksatz
      updated++
    } catch (_) {
      // no script file
    }
  }

  // Find EN script
  const enDir = episodeDirs.find(
    (d) => d.startsWith(episode.replace('ep0', 'ep0')) && d.includes('-en-')
  )
  if (enDir) {
    try {
      const script = readFileSync(resolve(videosDir, enDir, 'script.txt'), 'utf-8').trim()
      const paragraphs = script.split(/\n\n+/)
      const lastPara = paragraphs[paragraphs.length - 1]
      const merksatz = lastPara.startsWith('Remember:') ? lastPara.replace('Remember: ', '') : ''
      concept.script_en = script
      concept.merksatz_en = merksatz
    } catch (_) {
      // no script file
    }
  }
}

writeFileSync(conceptsPath, JSON.stringify(concepts, null, 2) + '\n')
console.warn(`Updated ${updated} concepts with script texts`)
