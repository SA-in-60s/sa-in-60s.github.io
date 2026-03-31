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
  document.querySelectorAll(`[data-${lang}]`).forEach((el) => {
    el.textContent = el.getAttribute(`data-${lang}`)
  })
  const toggle = document.getElementById('lang-toggle')
  if (toggle) toggle.textContent = lang === 'de' ? 'EN' : 'DE'

  // Reorder videos on concept pages
  const videoGrid = document.getElementById('video-grid')
  if (videoGrid) {
    const deVideo = document.getElementById('video-de')
    const enVideo = document.getElementById('video-en')
    if (deVideo && enVideo) {
      if (lang === 'en') {
        videoGrid.insertBefore(enVideo, deVideo)
      } else {
        videoGrid.insertBefore(deVideo, enVideo)
      }
    }
  }
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
    updateSeenButton(btn, progress.includes(id))
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
  if (seen) {
    btn.textContent = '✓'
    btn.classList.add('bg-accent-cyan', 'text-bg')
    btn.classList.remove('text-accent-cyan')
  } else {
    btn.textContent = '○'
    btn.classList.remove('bg-accent-cyan', 'text-bg')
    btn.classList.add('text-accent-cyan')
  }
}

function getProgress() {
  try {
    return JSON.parse(localStorage.getItem('sa60s-progress') || '[]')
  } catch (_) {
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
  })
  const totalEl = document.getElementById('total-progress')
  if (totalEl) {
    totalEl.textContent = `${progress.length}/${parseInt(totalEl.dataset.progressTotal, 10)}`
  }
  document.querySelectorAll('[data-concept-seen]').forEach((el) => {
    el.textContent = progress.includes(el.dataset.conceptSeen) ? '✓' : '○'
  })
}

document.addEventListener('DOMContentLoaded', () => {
  initI18n()
  initProgress()
})
