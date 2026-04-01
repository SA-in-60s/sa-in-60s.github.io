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

  // Find concept title
  let title = nextConcept
  const allConcepts = [...manifest.stem]
  for (const pathConcepts of Object.values(manifest.paths)) {
    allConcepts.push(...pathConcepts)
  }
  // We don't have titles in manifest, so just use the ID formatted nicely
  title = nextConcept.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  const text = template
    .replace('{next}', title)
    .replace('{link}', '<a href="https://software-architektur.tv" target="_blank" rel="noopener" class="underline hover:text-text">')
    .replace('{/link}', '</a>')
  banner.innerHTML = text
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

  grid.innerHTML = availablePaths
    .map(
      (p) =>
        `<button data-choose-path="${p.id}" class="p-4 bg-bg rounded-lg hover:border-accent-cyan border border-text-muted transition text-left" style="border-left: 4px solid ${p.color};">
        <span class="font-bold">${lang === 'de' ? p.name_de : p.name_en}</span>
      </button>`
    )
    .join('')

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
