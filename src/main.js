import './styles/main.css'
import { initUnlock } from './unlock.js'

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

  // Show/hide language-specific content (video, script text, merksatz, claude link)
  document.querySelectorAll('[data-lang]').forEach((el) => {
    if (el.dataset.lang === lang) {
      el.classList.remove('hidden')
      // Restore iframe src when showing
      const iframe = el.querySelector('iframe')
      if (iframe && iframe.dataset.src) {
        iframe.src = iframe.dataset.src
      }
    } else {
      el.classList.add('hidden')
      // Clear iframe src to stop playback when hiding
      const iframe = el.querySelector('iframe')
      if (iframe && iframe.src) {
        iframe.dataset.src = iframe.dataset.src || iframe.src
        iframe.src = ''
      }
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
    const timer = container.querySelector('.seen-timer')
    const isSeen = progress.includes(id)
    updateSeenButton(btn, isSeen)

    if (isSeen) {
      btn.disabled = false
      if (timer) timer.style.display = 'none'
    } else {
      btn.disabled = true
      btn.classList.add('opacity-50', 'cursor-not-allowed')
      if (timer) {
        const lang = document.documentElement.lang || 'de'
        let remaining = 60
        const updateTimer = () => {
          timer.textContent =
            lang === 'de'
              ? `Gib dem Konzept 60 Sekunden — noch ${remaining}s`
              : `Give this concept 60 seconds — ${remaining}s left`
        }
        updateTimer()
        const interval = setInterval(() => {
          remaining--
          if (remaining <= 0) {
            clearInterval(interval)
            timer.textContent =
              lang === 'de'
                ? '60 Sekunden geschafft — Konzept gelernt?'
                : '60 seconds done — got the concept?'
            btn.disabled = false
            btn.classList.remove('opacity-50', 'cursor-not-allowed')
          } else {
            updateTimer()
          }
        }, 1000)
      }
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
    const label = lang === 'de' ? 'Verstanden ✓' : 'Got it ✓'
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
    const totalCount = parseInt(totalEl.dataset.progressTotal, 10)
    totalEl.textContent = `${progress.length}/${totalCount}`
    totalEl.setAttribute('aria-valuenow', progress.length.toString())
    const bar = document.getElementById('total-progress-bar')
    if (bar) bar.style.width = `${(progress.length / totalCount) * 100}%`
  }
  document.querySelectorAll('[data-concept-seen]').forEach((el) => {
    el.textContent = progress.includes(el.dataset.conceptSeen) ? '✓' : '○'
  })

  // Stem hint on path pages
  const stemHint = document.getElementById('stem-hint')
  if (stemHint) {
    const stemIds = JSON.parse(stemHint.dataset.stemIds || '[]')
    const stemTotal = parseInt(stemHint.dataset.stemTotal, 10) || 0
    const stemSeen = stemIds.filter((id) => progress.includes(id)).length
    if (stemTotal > 0 && stemSeen < stemTotal) {
      const lang = document.documentElement.lang || 'de'
      const template = stemHint.dataset[lang] || stemHint.dataset.de || ''
      stemHint.textContent = template.replace('{seen}', stemSeen).replace('{total}', stemTotal)
      stemHint.classList.remove('hidden')
    } else {
      stemHint.classList.add('hidden')
    }
  }
}

const AI_CHATS = {
  claude: (p) => `https://claude.ai/new?q=${encodeURIComponent(p)}`,
  chatgpt: (p) => `https://chatgpt.com/?q=${encodeURIComponent(p)}`,
  perplexity: (p) => `https://www.perplexity.ai/?q=${encodeURIComponent(p)}`,
}

function initAiDeepDive() {
  const btn = document.getElementById('ai-deep-dive')
  const select = document.getElementById('ai-chat-select')
  if (!btn || !select) return

  // Restore saved choice
  try {
    const saved = localStorage.getItem('sa60s-ai-chat')
    if (saved && AI_CHATS[saved]) select.value = saved
  } catch {
    // private mode
  }

  select.addEventListener('change', () => {
    try {
      localStorage.setItem('sa60s-ai-chat', select.value)
    } catch {
      // private mode
    }
  })

  btn.addEventListener('click', () => {
    const lang = document.documentElement.lang || 'de'
    const prompt = btn.dataset[`prompt${lang === 'de' ? 'De' : 'En'}`] || ''
    const buildUrl = AI_CHATS[select.value] || AI_CHATS.claude
    window.open(buildUrl(prompt), '_blank')
  })
}

document.addEventListener('DOMContentLoaded', () => {
  initI18n()
  initProgress()
  initUnlock()
  initAiDeepDive()
  if (document.getElementById('cy')) {
    import('./graph.js').then((m) => m.initGraph())
  }
})
