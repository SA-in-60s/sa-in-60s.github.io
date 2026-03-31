import cytoscape from 'cytoscape'

export async function initGraph() {
  const container = document.getElementById('cy')
  if (!container) return

  const res = await fetch('/data/graph-data.json')
  const data = await res.json()

  const pathColors = Object.fromEntries(data.paths.map((p) => [p.id, p.color]))
  pathColors.stem = '#22d3ee'

  const progress = getProgress()
  const lang = document.documentElement.lang || 'de'

  const elements = [
    ...data.nodes.map((n) => ({
      data: {
        id: n.id,
        label: n[`title_${lang}`] || n.title_de,
        title_de: n.title_de,
        title_en: n.title_en,
        path: n.path,
        seen: progress.includes(n.id) ? 1 : 0,
      },
    })),
    ...data.edges.map((e) => ({
      data: { source: e.source, target: e.target },
    })),
  ]

  const cy = cytoscape({
    container,
    elements,
    style: [
      {
        selector: 'node',
        style: {
          label: 'data(label)',
          'font-size': 9,
          color: '#e2e8f0',
          'text-valign': 'bottom',
          'text-margin-y': 4,
          'text-outline-width': 2,
          'text-outline-color': '#0f172a',
          width: 20,
          height: 20,
          'background-color': '#64748b',
          opacity: 0.5,
          'text-opacity': 0,
        },
      },
      // Path-colored nodes
      ...data.paths.map((p) => ({
        selector: `node[path = "${p.id}"]`,
        style: { 'background-color': p.color },
      })),
      {
        selector: 'node[path = "stem"]',
        style: {
          'background-color': '#22d3ee',
          width: 30,
          height: 30,
        },
      },
      {
        selector: 'node[seen = 1]',
        style: {
          opacity: 1,
          'border-width': 3,
          'border-color': '#22d3ee',
        },
      },
      {
        selector: 'edge',
        style: {
          width: 1,
          'line-color': '#334155',
          'target-arrow-color': '#334155',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'arrow-scale': 0.6,
          opacity: 0.6,
        },
      },
      {
        selector: '.dimmed',
        style: { opacity: 0.08 },
      },
      {
        selector: '.highlighted',
        style: { opacity: 1, 'text-opacity': 1 },
      },
    ],
    layout: {
      name: 'cose',
      animate: false,
      nodeRepulsion: () => 12000,
      gravity: 0.4,
      idealEdgeLength: () => 60,
      padding: 30,
    },
    minZoom: 0.3,
    maxZoom: 3,
    wheelSensitivity: 0.3,
  })

  // Show labels when zoomed in
  cy.on('zoom', () => {
    const zoom = cy.zoom()
    const showLabels = zoom > 0.8
    cy.style()
      .selector('node')
      .style('text-opacity', showLabels ? 1 : 0)
      .update()
    // Keep highlighted nodes visible
    cy.style().selector('.highlighted').style('text-opacity', 1).update()
  })

  // Click → navigate
  cy.on('tap', 'node', (evt) => {
    window.location.href = `/concept/${evt.target.id()}`
  })

  // Hover tooltip
  const tooltip = document.getElementById('graph-tooltip')
  if (tooltip) {
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target
      const currentLang = document.documentElement.lang || 'de'
      const title = node.data(`title_${currentLang}`) || node.data('title_de')
      const pathId = node.data('path')
      const pathInfo = data.paths.find((p) => p.id === pathId)
      const pathName = pathInfo ? pathInfo[`name_${currentLang}`] || pathInfo.name_de : pathId
      const seen = node.data('seen') ? ' ✓' : ''
      tooltip.innerHTML = `<strong>${escapeText(title)}</strong>${seen}<br><span class="text-text-muted text-xs">${escapeText(pathName)}</span>`
      tooltip.classList.remove('hidden')
      const pos = evt.renderedPosition
      const rect = container.getBoundingClientRect()
      tooltip.style.left = `${rect.left + pos.x + 10}px`
      tooltip.style.top = `${rect.top + pos.y - 10}px`
    })
    cy.on('mouseout', 'node', () => {
      tooltip.classList.add('hidden')
    })
  }

  // Path filter
  const filter = document.getElementById('graph-filter')
  if (filter) {
    filter.addEventListener('change', () => {
      const pathId = filter.value
      if (!pathId) {
        cy.elements().removeClass('dimmed highlighted')
        return
      }
      // BFS: find all transitive dependencies of selected path
      const pathNodes = cy.nodes().filter((n) => n.data('path') === pathId)
      const visible = new Set(pathNodes.map((n) => n.id()))
      const queue = [...pathNodes]
      while (queue.length > 0) {
        const node = queue.shift()
        node.incomers('node').forEach((pred) => {
          if (!visible.has(pred.id())) {
            visible.add(pred.id())
            queue.push(pred)
          }
        })
      }
      cy.nodes().forEach((n) => {
        if (visible.has(n.id())) {
          n.removeClass('dimmed').addClass('highlighted')
        } else {
          n.removeClass('highlighted').addClass('dimmed')
        }
      })
      cy.edges().forEach((e) => {
        if (visible.has(e.source().id()) && visible.has(e.target().id())) {
          e.removeClass('dimmed')
        } else {
          e.addClass('dimmed')
        }
      })
    })
  }

  // Language reactivity
  const observer = new MutationObserver(() => {
    const newLang = document.documentElement.lang || 'de'
    cy.nodes().forEach((n) => {
      n.data('label', n.data(`title_${newLang}`) || n.data('title_de'))
    })
    // Update filter options
    if (filter) {
      Array.from(filter.options).forEach((opt) => {
        if (opt.dataset[newLang]) opt.textContent = opt.dataset[newLang]
      })
    }
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
}

function getProgress() {
  try {
    const raw = localStorage.getItem('sa60s-progress')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function escapeText(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
