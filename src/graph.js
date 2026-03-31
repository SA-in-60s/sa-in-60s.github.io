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
        degree: 0,
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
          width: 22,
          height: 22,
          'background-color': '#64748b',
          opacity: 0.6,
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
        },
      },
      {
        selector: 'node[seen = 1]',
        style: {
          opacity: 1,
          'border-width': 3,
          'border-color': '#22d3ee',
          'background-image':
            'data:image/svg+xml,' +
            encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><circle cx="5" cy="5" r="4" fill="#0f172a"/></svg>'
            ),
          'background-width': '40%',
          'background-height': '40%',
          'background-position-x': '50%',
          'background-position-y': '50%',
        },
      },
      {
        selector: 'edge',
        style: {
          width: 1.5,
          'line-color': '#64748b',
          'target-arrow-color': '#64748b',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'arrow-scale': 0.7,
          opacity: 0.5,
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
      {
        selector: '.highlighted edge',
        style: { opacity: 0.8 },
      },
    ],
    layout: { name: 'preset' },
    userZoomingEnabled: true,
    userPanningEnabled: true,
    minZoom: 0.2,
    maxZoom: 5,
    wheelSensitivity: 0.5,
  })

  // Run initial COSE layout for good starting positions
  cy.layout({
    name: 'cose',
    animate: false,
    nodeRepulsion: () => 12000,
    gravity: 0.4,
    idealEdgeLength: () => 60,
    padding: 30,
  }).run()

  // Fit to content with minimal padding
  cy.fit(cy.elements(), 10)

  // Dynamic force simulation: spring physics on all edges
  const SPRING_LENGTH = 80
  const SPRING_STRENGTH = 0.04
  const REPULSION = 2000
  const DAMPING = 0.85
  const CENTER_GRAVITY = 0.002

  let simulating = false
  let autoFit = true
  const velocities = new Map()

  function startSimulation() {
    if (simulating) return
    simulating = true
    cy.nodes().forEach((n) => velocities.set(n.id(), { vx: 0, vy: 0 }))
    simulationLoop()
  }

  function stopSimulation() {
    simulating = false
    velocities.clear()
  }

  function simulationLoop() {
    if (!simulating) return

    const nodes = cy.nodes()
    const edges = cy.edges()
    const forces = new Map()
    nodes.forEach((n) => forces.set(n.id(), { fx: 0, fy: 0 }))

    // Center of graph for gravity
    const bb = cy.extent()
    const cx = (bb.x1 + bb.x2) / 2
    const cy2 = (bb.y1 + bb.y2) / 2

    // Spring forces along edges
    edges.forEach((e) => {
      const src = e.source()
      const tgt = e.target()
      const sp = src.position()
      const tp = tgt.position()
      const dx = tp.x - sp.x
      const dy = tp.y - sp.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = (dist - SPRING_LENGTH) * SPRING_STRENGTH
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      const sf = forces.get(src.id())
      const tf = forces.get(tgt.id())
      sf.fx += fx
      sf.fy += fy
      tf.fx -= fx
      tf.fy -= fy
    })

    // Node repulsion (only nearby nodes for performance)
    const nodeArr = nodes.toArray()
    for (let i = 0; i < nodeArr.length; i++) {
      for (let j = i + 1; j < nodeArr.length; j++) {
        const a = nodeArr[i]
        const b = nodeArr[j]
        const ap = a.position()
        const bp = b.position()
        const dx = bp.x - ap.x
        const dy = bp.y - ap.y
        const distSq = dx * dx + dy * dy || 1
        if (distSq > 40000) continue // skip if far apart
        const dist = Math.sqrt(distSq)
        const force = REPULSION / distSq
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        const af = forces.get(a.id())
        const bf = forces.get(b.id())
        af.fx -= fx
        af.fy -= fy
        bf.fx += fx
        bf.fy += fy
      }
    }

    // Apply forces + gravity + damping
    let totalMovement = 0
    nodes.forEach((n) => {
      if (n.grabbed()) return
      const f = forces.get(n.id())
      const v = velocities.get(n.id()) || { vx: 0, vy: 0 }
      const pos = n.position()
      // Gravity toward center
      f.fx += (cx - pos.x) * CENTER_GRAVITY
      f.fy += (cy2 - pos.y) * CENTER_GRAVITY
      v.vx = (v.vx + f.fx) * DAMPING
      v.vy = (v.vy + f.fy) * DAMPING
      totalMovement += Math.abs(v.vx) + Math.abs(v.vy)
      n.position({ x: pos.x + v.vx, y: pos.y + v.vy })
      velocities.set(n.id(), v)
    })

    // Auto-fit viewport to graph while no node is grabbed
    if (autoFit && cy.nodes(':grabbed').length === 0) {
      cy.fit(cy.elements(), 20)
    }

    // Stop when settled (low movement) or keep going while dragging
    if (totalMovement > 0.5 || cy.nodes(':grabbed').length > 0) {
      requestAnimationFrame(simulationLoop)
    } else {
      autoFit = false
      stopSimulation()
    }
  }

  // Start simulation immediately — graph assembles itself on load
  startSimulation()

  // Delay user-interaction listeners so initial fit() doesn't disable autoFit
  setTimeout(() => {
    cy.on('zoom pan', () => {
      autoFit = false
    })
  }, 500)

  cy.on('grab', 'node', () => {
    autoFit = false
    startSimulation()
  })

  cy.on('free', 'node', () => {
    // Let simulation settle after release
  })

  // Prevent tap-to-navigate when dragging
  let wasDragged = false
  cy.on('grab', 'node', () => {
    wasDragged = false
  })
  cy.on('drag', 'node', () => {
    wasDragged = true
  })

  // Show labels when zoomed in
  cy.on('zoom', () => {
    const zoom = cy.zoom()
    const showLabels = zoom > 0.8
    cy.style()
      .selector('node')
      .style('text-opacity', showLabels ? 1 : 0)
      .update()
    cy.style().selector('.highlighted').style('text-opacity', 1).update()
  })

  // Click → navigate (only if not dragging)
  cy.on('tap', 'node', (evt) => {
    if (wasDragged) return
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
