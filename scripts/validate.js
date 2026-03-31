import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const REQUIRED_CONCEPT_FIELDS = ['id', 'title_de', 'title_en', 'episode', 'path', 'path_position']
const REQUIRED_PATH_FIELDS = ['id', 'name_de', 'name_en', 'description_de', 'description_en', 'color', 'concepts']

export function validateConcepts(concepts) {
  const errors = []
  const warnings = []
  const ids = new Set()

  for (const concept of concepts) {
    for (const field of REQUIRED_CONCEPT_FIELDS) {
      if (concept[field] === undefined || concept[field] === null) {
        errors.push(`Concept "${concept.id || '(unknown)'}" missing required field: ${field}`)
      }
    }

    if (concept.id) {
      if (ids.has(concept.id)) {
        errors.push(`duplicate concept id: ${concept.id}`)
      }
      ids.add(concept.id)
    }

    if (!concept.youtube_de && !concept.youtube_en) {
      warnings.push(`${concept.id || '(unknown)'} has no YouTube URLs`)
    }
  }

  // Second pass: validate requires references
  for (const concept of concepts) {
    if (Array.isArray(concept.requires)) {
      for (const req of concept.requires) {
        if (!ids.has(req)) {
          errors.push(`Concept "${concept.id}" requires non-existent concept: ${req}`)
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validatePaths(paths) {
  const errors = []
  const warnings = []
  const ids = new Set()

  for (const path of paths) {
    for (const field of REQUIRED_PATH_FIELDS) {
      if (path[field] === undefined || path[field] === null) {
        errors.push(`Path "${path.id || '(unknown)'}" missing required field: ${field}`)
      }
    }

    if (path.id) {
      if (ids.has(path.id)) {
        errors.push(`duplicate path id: ${path.id}`)
      }
      ids.add(path.id)
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

// CLI entry point
const __filename = fileURLToPath(import.meta.url)
if (process.argv[1] === __filename) {
  const __dirname = dirname(__filename)
  const dataDir = resolve(__dirname, '..', 'data')

  try {
    const concepts = JSON.parse(readFileSync(resolve(dataDir, 'concepts.json'), 'utf-8'))
    const paths = JSON.parse(readFileSync(resolve(dataDir, 'paths.json'), 'utf-8'))

    const cr = validateConcepts(concepts)
    const pr = validatePaths(paths)

    if (cr.warnings.length) {
      console.warn(`\nWarnings (concepts): ${cr.warnings.length}`)
      cr.warnings.forEach((w) => console.warn(`  ⚠ ${w}`))
    }

    if (!cr.valid) {
      console.error(`\nErrors (concepts): ${cr.errors.length}`)
      cr.errors.forEach((e) => console.error(`  ✗ ${e}`))
    }

    if (!pr.valid) {
      console.error(`\nErrors (paths): ${pr.errors.length}`)
      pr.errors.forEach((e) => console.error(`  ✗ ${e}`))
    }

    if (cr.valid && pr.valid) {
      console.log(`✓ ${concepts.length} concepts, ${paths.length} paths — all valid`)
      process.exit(0)
    } else {
      process.exit(1)
    }
  } catch (err) {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  }
}
