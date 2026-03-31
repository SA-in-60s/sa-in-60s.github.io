import './styles/main.css'

// UC-5: Language toggle
function initI18n() {
  let stored = null
  try {
    stored = localStorage.getItem('sa60s-lang')
  } catch (_) {
    // localStorage not available
  }
  const browserLang = navigator.language?.startsWith('de') ? 'de' : 'en'
  applyLanguage(stored || browserLang)

  const toggle = document.getElementById('lang-toggle')
  if (toggle) {
    toggle.addEventListener('click', () => {
      const current = document.documentElement.lang === 'de' ? 'en' : 'de'
      applyLanguage(current)
      try {
        localStorage.setItem('sa60s-lang', current)
      } catch (_) {
        // private mode
      }
    })
  }
}

function applyLanguage(lang) {
  document.documentElement.lang = lang
  const other = lang === 'de' ? 'en' : 'de'

  // Update text content from data attributes
  document.querySelectorAll(`[data-${lang}]`).forEach((el) => {
    el.textContent = el.getAttribute(`data-${lang}`)
  })
  const toggle = document.getElementById('lang-toggle')
  if (toggle) toggle.textContent = lang === 'de' ? 'EN' : 'DE'

  // Show/hide language-specific content (video, script text, merksatz)
  document.querySelectorAll('[data-lang]').forEach((el) => {
    if (el.dataset.lang === lang) {
      el.classList.remove('hidden')
    } else {
      el.classList.add('hidden')
    }
  })
}

function initVideoSwitch() {
  const switchLink = document.getElementById('switch-video-lang')
  if (!switchLink) return

  switchLink.addEventListener('click', (e) => {
    e.preventDefault()
    const deVideo = document.getElementById('video-de')
    const enVideo = document.getElementById('video-en')
    if (!deVideo || !enVideo) return

    const deVisible = !deVideo.classList.contains('hidden')
    const hideVideo = (container) => {
      container.classList.add('hidden')
      const iframe = container.querySelector('iframe')
      if (iframe) {
        iframe.dataset.src = iframe.dataset.src || iframe.src
        iframe.src = ''
      }
    }
    const showVideo = (container) => {
      container.classList.remove('hidden')
      const iframe = container.querySelector('iframe')
      if (iframe && iframe.dataset.src) {
        iframe.src = iframe.dataset.src
      }
    }
    if (deVisible) {
      hideVideo(deVideo)
      showVideo(enVideo)
      switchLink.textContent =
        document.documentElement.lang === 'de' ? 'Auf Deutsch ansehen' : 'Watch in German'
    } else {
      hideVideo(enVideo)
      showVideo(deVideo)
      switchLink.textContent =
        document.documentElement.lang === 'de' ? 'Watch in English' : 'Auf Deutsch ansehen'
    }
  })
}

// UC-4: Progress tracking via localStorage
function initProgress() {
  let available = true
  try {
    localStorage.getItem('sa60s-test')
  } catch (_) {
    available = false
  }

  if (!available) {
    document.querySelectorAll('.seen-button').forEach((btn) => {
      btn.disabled = true
      btn.title = 'Progress cannot be saved in private mode'
    })
    return
  }

  const progress = getProgress()

  document.querySelectorAll('.seen-button').forEach((btn) => {
    const id = btn.dataset.conceptId
    const container = btn.parentElement
    const isSeen = progress.includes(id)
    updateSeenButton(btn, isSeen)

    // Show immediately if already seen, otherwise after 50s
    if (isSeen) {
      container.classList.remove('hidden')
    } else {
      setTimeout(() => {
        container.classList.remove('hidden')
      }, 50000)
    }

    btn.addEventListener('click', () => {
      const p = getProgress()
      if (p.includes(id)) {
        setProgress(p.filter((x) => x !== id))
        updateSeenButton(btn, false)
      } else {
        setProgress([...p, id])
        updateSeenButton(btn, true)
      }
      updateProgressDisplays()
    })
  })

  updateProgressDisplays()
}

function updateSeenButton(btn, seen) {
  const lang = document.documentElement.lang || 'de'
  btn.setAttribute('aria-pressed', seen.toString())
  if (seen) {
    const label = lang === 'de' ? '✓ Gesehen' : '✓ Seen'
    btn.textContent = label
    btn.classList.add('bg-accent-cyan', 'text-bg', 'border-accent-cyan')
    btn.classList.remove('text-accent-cyan')
  } else {
    const label = btn.dataset[lang] || btn.dataset.de || 'Mark as seen?'
    btn.textContent = label
    btn.classList.remove('bg-accent-cyan', 'text-bg')
    btn.classList.add('text-accent-cyan', 'border-accent-cyan')
  }
}

function getProgress() {
  try {
    const raw = localStorage.getItem('sa60s-progress')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
      console.warn('Progress data is corrupted, resetting.')
      localStorage.removeItem('sa60s-progress')
      return []
    }
    return parsed
  } catch (_) {
    console.warn('Progress data is corrupted, resetting.')
    try {
      localStorage.removeItem('sa60s-progress')
    } catch (_e) {
      // private mode
    }
    return []
  }
}

function setProgress(ids) {
  try {
    localStorage.setItem('sa60s-progress', JSON.stringify(ids))
  } catch (_) {
    // private mode
  }
}

function updateProgressDisplays() {
  const progress = getProgress()
  document.querySelectorAll('[data-progress-path]').forEach((el) => {
    const conceptIds = JSON.parse(el.dataset.progressConcepts || '[]')
    const total = parseInt(el.dataset.progressTotal, 10)
    const seen = conceptIds.filter((id) => progress.includes(id)).length
    el.textContent = `${seen}/${total}`
    el.setAttribute('aria-valuenow', seen.toString())
  })
  const totalEl = document.getElementById('total-progress')
  if (totalEl) {
    totalEl.textContent = `${progress.length}/${parseInt(totalEl.dataset.progressTotal, 10)}`
    totalEl.setAttribute('aria-valuenow', progress.length.toString())
  }
  document.querySelectorAll('[data-concept-seen]').forEach((el) => {
    el.textContent = progress.includes(el.dataset.conceptSeen) ? '✓' : '○'
  })
}

document.addEventListener('DOMContentLoaded', () => {
  initI18n()
  initProgress()
  initVideoSwitch()
  if (document.getElementById('cy')) {
    import('./graph.js').then((m) => m.initGraph())
  }
})
