const STORAGE_KEY = 'sa60s-unlock'
const SALT = 'sa60s-2026'

function encodeDate(dateStr) {
  return btoa(dateStr + SALT)
}

function decodeDate(encoded) {
  try {
    const decoded = atob(encoded)
    if (decoded.endsWith(SALT)) {
      return decoded.slice(0, -SALT.length)
    }
  } catch {
    // invalid base64
  }
  return null
}

function getUnlockState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const state = JSON.parse(raw)
    const firstVisit = decodeDate(state.fv)
    if (!firstVisit) return null
    return {
      firstVisit,
      chosenPaths: state.cp || [],
      phase: state.ph || 'stem',
    }
  } catch {
    return null
  }
}

function setUnlockState(state) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        fv: encodeDate(state.firstVisit),
        cp: state.chosenPaths,
        ph: state.phase,
      })
    )
  } catch {
    // private mode
  }
}

function computeUnlocked(state, manifest) {
  const today = new Date().toISOString().slice(0, 10)
  const first = new Date(state.firstVisit + 'T00:00:00')
  const now = new Date(today + 'T00:00:00')
  const daysSince = Math.max(0, Math.floor((now - first) / 86400000))

  let budget = daysSince + manifest.stem.length
  const unlocked = new Set()

  // Phase 1: Stem (always first)
  for (let i = 0; i < Math.min(budget, manifest.stem.length); i++) {
    unlocked.add(manifest.stem[i])
  }
  budget -= manifest.stem.length

  if (budget <= 0) {
    const nextIdx = unlocked.size
    const nextConcept = nextIdx < manifest.stem.length ? manifest.stem[nextIdx] : null
    return {
      unlocked,
      phase: 'stem',
      nextConcept,
      needsChoice: false,
    }
  }

  // Phase 2+: Chosen paths in order
  for (const pathId of state.chosenPaths) {
    const pathConcepts = manifest.paths[pathId] || []
    for (const conceptId of pathConcepts) {
      if (budget <= 0) break
      unlocked.add(conceptId)
      budget--
    }
    if (budget <= 0) {
      // Find next concept in this path
      const unlockedInPath = pathConcepts.filter((id) => unlocked.has(id)).length
      const nextConcept = unlockedInPath < pathConcepts.length ? pathConcepts[unlockedInPath] : null
      return {
        unlocked,
        phase: 'path',
        currentPath: pathId,
        nextConcept,
        needsChoice: false,
      }
    }
  }

  // Budget remaining — user needs to choose next path
  const availablePaths = manifest.pathMeta.filter((p) => !state.chosenPaths.includes(p.id))
  return {
    unlocked,
    phase: state.chosenPaths.length === 0 ? 'choose-path' : 'choose-next',
    nextConcept: null,
    needsChoice: availablePaths.length > 0,
    availablePaths,
  }
}

function applyLocks(unlockedSet) {
  document.querySelectorAll('[data-unlock-id]').forEach((el) => {
    const id = el.dataset.unlockId
    if (unlockedSet.has(id)) return

    if (el.tagName === 'A') {
      el.classList.add('opacity-40', 'pointer-events-none')
      el.setAttribute('aria-disabled', 'true')
      el.tabIndex = -1
    }
  })
}

function showBanner(nextConcept, manifest) {
  const banner = document.getElementById('unlock-banner')
  if (!banner || !nextConcept) return

  const lang = document.documentElement.lang || 'de'
  const template = banner.dataset[lang] || banner.dataset.de || ''

  const title = nextConcept.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  // Build banner with safe DOM manipulation (no innerHTML)
  banner.textContent = ''
  const parts = template.split(/\{next\}|\{link\}|\{\/link\}/)
  const tokens = [...template.matchAll(/\{next\}|\{link\}|\{\/link\}/g)].map((m) => m[0])

  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) banner.appendChild(document.createTextNode(parts[i]))
    if (i < tokens.length) {
      if (tokens[i] === '{next}') {
        const strong = document.createElement('strong')
        strong.textContent = title
        banner.appendChild(strong)
      } else if (tokens[i] === '{link}') {
        const link = document.createElement('a')
        link.href = 'https://software-architektur.tv'
        link.target = '_blank'
        link.rel = 'noopener'
        link.className = 'underline hover:text-text'
        // Find text between {link} and {/link}
        const linkText = parts[i + 1] || ''
        link.textContent = linkText
        banner.appendChild(link)
        i++ // skip the text between {link} and {/link}
        // skip {/link} token
        if (i < tokens.length && tokens[i] === '{/link}') {
          // already consumed
        }
      }
    }
  }
  banner.classList.remove('hidden')
}

function showPathChooser(availablePaths, state, manifest, onChosen) {
  const chooser = document.getElementById('path-chooser')
  const grid = document.getElementById('path-chooser-grid')
  if (!chooser || !grid) return

  const lang = document.documentElement.lang || 'de'

  // Update hint text based on phase
  const hintEl = chooser.querySelector('[data-de]')
  if (hintEl && state.chosenPaths.length > 0) {
    const translations = {
      de: 'Pfad abgeschlossen! Wähle den nächsten:',
      en: 'Path complete! Choose the next one:',
    }
    hintEl.textContent = translations[lang] || translations.de
  }

  grid.textContent = ''
  for (const p of availablePaths) {
    const btn = document.createElement('button')
    btn.dataset.choosePath = p.id
    btn.className =
      'p-4 bg-bg rounded-lg hover:border-accent-cyan border border-text-muted transition text-left'
    btn.style.borderLeft = `4px solid ${p.color.replace(/[^#0-9a-fA-F]/g, '')}`
    const span = document.createElement('span')
    span.className = 'font-bold'
    span.textContent = lang === 'de' ? p.name_de : p.name_en
    btn.appendChild(span)
    grid.appendChild(btn)
  }

  chooser.classList.remove('hidden')

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-choose-path]')
    if (!btn) return
    const pathId = btn.dataset.choosePath
    state.chosenPaths.push(pathId)
    state.phase = 'path'
    setUnlockState(state)
    chooser.classList.add('hidden')
    onChosen()
  })
}

export function initUnlock() {
  const manifestEl = document.getElementById('unlock-manifest')
  if (!manifestEl) return

  let available = true
  try {
    localStorage.getItem('sa60s-test')
  } catch {
    available = false
  }
  if (!available) return // No localStorage — skip unlock, everything stays accessible

  const manifest = JSON.parse(manifestEl.textContent)

  let state = getUnlockState()
  if (!state) {
    state = {
      firstVisit: new Date().toISOString().slice(0, 10),
      chosenPaths: [],
      phase: 'stem',
    }
    setUnlockState(state)
  }

  function applyState() {
    const result = computeUnlocked(state, manifest)
    applyLocks(result.unlocked)

    if (result.nextConcept && !result.needsChoice) {
      showBanner(result.nextConcept, manifest)
    }

    if (result.needsChoice) {
      showPathChooser(result.availablePaths, state, manifest, applyState)
    }
  }

  applyState()
}
