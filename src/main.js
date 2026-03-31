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
    totalEl.textContent = `${progress.length}/${parseInt(totalEl.dataset.progressTotal, 10)}`
    totalEl.setAttribute('aria-valuenow', progress.length.toString())
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

const AI_CHATS = [
  { id: 'claude', name: 'Claude', url: 'https://claude.ai/new?q=' },
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/?q=' },
  { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/app?q=' },
  { id: 'copilot', name: 'Copilot', url: 'https://copilot.microsoft.com/?q=' },
  { id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai/?q=' },
]

function initAiDeepDive() {
  const btn = document.getElementById('ai-deep-dive')
  if (!btn) return

  let saved = null
  try {
    saved = localStorage.getItem('sa60s-ai-chat')
  } catch {
    // private mode
  }

  const chat = AI_CHATS.find((c) => c.id === saved)
  if (chat) {
    btn.textContent = `🤖 ${chat.name}`
  }

  btn.addEventListener('click', () => {
    const lang = document.documentElement.lang || 'de'
    const prompt = btn.dataset[`prompt${lang === 'de' ? 'De' : 'En'}`] || ''

    let selected = null
    try {
      selected = localStorage.getItem('sa60s-ai-chat')
    } catch {
      // private mode
    }

    if (selected) {
      const c = AI_CHATS.find((x) => x.id === selected)
      if (c) {
        window.open(c.url + encodeURIComponent(prompt), '_blank')
        return
      }
    }

    // Show picker
    const picker = document.createElement('div')
    picker.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-50'
    picker.innerHTML = `
      <div class="bg-bg-card rounded-lg p-6 max-w-sm w-full mx-4">
        <p class="text-text font-medium mb-4" data-de="Chat wählen" data-en="Choose your AI">${lang === 'de' ? 'Chat wählen' : 'Choose your AI'}</p>
        <div class="flex flex-col gap-2">
          ${AI_CHATS.map(
            (c) =>
              `<button data-chat="${c.id}" class="py-3 px-4 rounded-lg border border-text-muted text-text hover:border-accent-cyan hover:text-accent-cyan transition text-left">${c.name}</button>`
          ).join('')}
        </div>
      </div>`
    document.body.appendChild(picker)

    picker.addEventListener('click', (e) => {
      const chatBtn = e.target.closest('[data-chat]')
      if (chatBtn) {
        const id = chatBtn.dataset.chat
        try {
          localStorage.setItem('sa60s-ai-chat', id)
        } catch {
          // private mode
        }
        const c = AI_CHATS.find((x) => x.id === id)
        btn.textContent = `🤖 ${c.name}`
        window.open(c.url + encodeURIComponent(prompt), '_blank')
        picker.remove()
      } else if (!e.target.closest('.bg-bg-card')) {
        picker.remove()
      }
    })
  })
}

document.addEventListener('DOMContentLoaded', () => {
  initI18n()
  initProgress()
  initAiDeepDive()
  if (document.getElementById('cy')) {
    import('./graph.js').then((m) => m.initGraph())
  }
})
