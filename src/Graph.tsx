import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D, { type ForceGraphMethods, type NodeObject, type LinkObject } from 'react-force-graph-2d'
import { forceCollide } from 'd3-force-3d'
import type { DanceMap, StyleNode } from './types'
import { progress } from './store'
import { focusColor, useFontsReady, usePalette, withAlpha } from './theme'

type GNode = { id: string }
type GLink = { builds: string }
type N = NodeObject<GNode>
type L = LinkObject<GNode, GLink>

const DISPLAY = '"Bricolage Grotesque", system-ui, sans-serif'
const BODY = '"Instrument Sans", system-ui, sans-serif'
const MONO = '"IBM Plex Mono", ui-monospace, monospace'

const R_FOCUS = 22
const R_SUPPORT = 11

interface Props {
  map: DanceMap
  selectedId: string | null
  focusFilter: string | null
  onSelect: (id: string | null) => void
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ w: 300, h: 300 })
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return { ref, ...size }
}

const idOf = (x: unknown) => (typeof x === 'object' && x ? (x as N).id : (x as string))

export default function Graph({ map, selectedId, focusFilter, onSelect }: Props) {
  const { ref, w, h } = useSize<HTMLDivElement>()
  const fg = useRef<ForceGraphMethods<GNode, GLink> | undefined>(undefined)
  const pal = usePalette()
  const fontsReady = useFontsReady()
  const fitted = useRef(false)
  const nodeCache = useRef(new Map<string, N>())

  const focusIds = useMemo(() => map.nodes.filter((n) => n.kind === 'focus').map((n) => n.id), [map.nodes])
  const byId = useMemo(() => new Map(map.nodes.map((n) => [n.id, n])), [map.nodes])
  const byIdRef = useRef(byId)
  byIdRef.current = byId

  // Rebuild only when styles or connections change. Existing node objects are reused so
  // nothing jumps when you connect or disconnect a style.
  const structureKey = map.nodes.map((n) => n.id).join('|') + '#' + map.links.map((l) => `${l.from}>${l.to}:${l.builds}`).join('|')
  const data = useMemo(() => {
    const cache = nodeCache.current
    const nodes: N[] = map.nodes.map((n) => {
      const fi = focusIds.indexOf(n.id)
      const node = cache.get(n.id) ?? { id: n.id }
      if (fi >= 0) {
        // Focus styles sit evenly on a circle so the map always has the same shape.
        const a = (fi / focusIds.length) * Math.PI * 2 - Math.PI / 2
        node.fx = Math.cos(a) * 150
        node.fy = Math.sin(a) * 150
      }
      cache.set(n.id, node)
      return node
    })
    const links: L[] = map.links.map((l) => ({ source: l.from, target: l.to, builds: l.builds }))
    return { nodes, links }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureKey])

  const colorOfFocus = (id: string) => focusColor(pal, Math.max(focusIds.indexOf(id), 0))
  const colorFor = (n: StyleNode) => {
    if (n.kind === 'focus') return colorOfFocus(n.id)
    const targets = map.links.filter((l) => l.from === n.id).map((l) => l.to)
    return targets.length === 1 ? colorOfFocus(targets[0]) : pal.ink3
  }

  // The "lit" set: the selected style (or filtered focus style) and its direct neighbours.
  const active = selectedId ?? focusFilter
  const lit = useMemo(() => {
    if (!active) return null
    const s = new Set([active])
    map.links.forEach((l) => {
      if (l.to === active) s.add(l.from)
      if (l.from === active) s.add(l.to)
    })
    return s
  }, [active, map.links])
  const linkLit = (l: L) => !lit || (lit.has(idOf(l.source)) && lit.has(idOf(l.target)) && (idOf(l.source) === active || idOf(l.target) === active))

  useEffect(() => {
    const g = fg.current
    if (!g) return
    g.d3Force('charge')?.strength(-320)
    g.d3Force('link')?.distance(115)
    g.d3Force('collide', forceCollide<N>((n) => (byIdRef.current.get(n.id)?.kind === 'focus' ? 52 : 44)) as never)
    g.d3ReheatSimulation()
  }, [data])

  // On phones the detail sheet covers the lower part of the screen, so keep the chosen style in view above it.
  const recenter = () => {
    const g = fg.current
    if (!g || !selectedId || window.innerWidth >= 800) return
    const n = data.nodes.find((d) => d.id === selectedId)
    const stage = ref.current?.getBoundingClientRect()
    if (n?.x == null || n.y == null || !stage) return
    const sheetTop = window.innerHeight * 0.42 // the sheet is 58dvh tall
    const shift = stage.top + stage.height / 2 - (stage.top + sheetTop) / 2
    g.centerAt(n.x, n.y + shift / g.zoom(), 450)
  }
  const recenterRef = useRef(recenter)
  recenterRef.current = recenter
  useEffect(() => recenterRef.current(), [selectedId, data])

  return (
    <div ref={ref} className="graph" data-fonts={fontsReady}>
      <ForceGraph2D<GNode, GLink>
        ref={fg}
        width={w}
        height={h}
        graphData={data}
        backgroundColor="rgba(0,0,0,0)"
        cooldownTicks={140}
        onEngineStop={() => {
          if (fitted.current) return recenter()
          fitted.current = true
          fg.current?.zoomToFit(500, w < 600 ? 72 : 80)
        }}
        onNodeClick={(n) => onSelect(n.id)}
        onBackgroundClick={() => onSelect(null)}
        linkCurvature={0.14}
        linkColor={(l) => {
          const c = colorOfFocus(idOf(l.target))
          return linkLit(l) ? withAlpha(c, lit ? 0.85 : 0.42) : withAlpha(pal.ink3, 0.1)
        }}
        linkWidth={(l) => (lit && linkLit(l) ? 2.4 : 1.4)}
        linkCanvasObjectMode={() => 'after'}
        linkCanvasObject={(l, ctx, scale) => {
          const showAll = scale > 1.5 && !lit
          if (!l.builds || !(showAll || (lit && linkLit(l)))) return
          const s = l.source as N, t = l.target as N
          if (s.x == null || t.x == null || s.y == null || t.y == null) return
          // Midpoint of the curved link (quadratic Bézier at t = 0.5).
          const dx = t.x - s.x, dy = t.y - s.y
          const len = Math.hypot(dx, dy) || 1
          const cx = (s.x + t.x) / 2 + (dy / len) * len * 0.14
          const cy = (s.y + t.y) / 2 - (dx / len) * len * 0.14
          const mx = 0.25 * s.x + 0.5 * cx + 0.25 * t.x
          const my = 0.25 * s.y + 0.5 * cy + 0.25 * t.y
          const fs = 10.5 / scale
          ctx.font = `500 ${fs}px ${MONO}`
          const text = l.builds.toUpperCase()
          const tw = ctx.measureText(text).width
          const px = 5 / scale, py = 3 / scale
          ctx.fillStyle = pal.card
          ctx.strokeStyle = withAlpha(colorOfFocus(t.id), 0.55)
          ctx.lineWidth = 1 / scale
          ctx.beginPath()
          ctx.roundRect(mx - tw / 2 - px, my - fs / 2 - py, tw + px * 2, fs + py * 2, 4 / scale)
          ctx.fill()
          ctx.stroke()
          ctx.fillStyle = pal.ink2
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(text, mx, my + 0.5 / scale)
        }}
        nodePointerAreaPaint={(n, color, ctx) => {
          const r = byId.get(n.id)?.kind === 'focus' ? R_FOCUS : R_SUPPORT
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(n.x!, n.y!, r + 10, 0, Math.PI * 2)
          ctx.fill()
        }}
        nodeCanvasObject={(n, ctx, scale) => {
          const node = byId.get(n.id)
          if (!node) return
          const focus = node.kind === 'focus'
          const r = focus ? R_FOCUS : R_SUPPORT
          const x = n.x!, y = n.y!
          const color = colorFor(node)
          const p = progress(node)
          const selected = selectedId === node.id
          ctx.globalAlpha = lit && !lit.has(node.id) ? 0.16 : 1

          if (selected) {
            ctx.beginPath()
            ctx.arc(x, y, r + 14, 0, Math.PI * 2)
            ctx.fillStyle = withAlpha(color === pal.ink3 ? pal.ink : color, 0.14)
            ctx.fill()
          }

          // Progress track and arc.
          const ringR = r + (focus ? 7 : 5)
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.arc(x, y, ringR, 0, Math.PI * 2)
          ctx.lineWidth = focus ? 3.5 : 2.5
          ctx.strokeStyle = withAlpha(color === pal.ink3 ? pal.ink : color, 0.16)
          ctx.stroke()
          if (p != null && p > 0) {
            ctx.beginPath()
            ctx.arc(x, y, ringR, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2)
            ctx.strokeStyle = focus ? color : pal.ink
            ctx.stroke()
          }
          ctx.lineCap = 'butt'

          // Body.
          ctx.beginPath()
          ctx.arc(x, y, r, 0, Math.PI * 2)
          if (focus) {
            ctx.fillStyle = color
            ctx.fill()
            ctx.fillStyle = '#fff'
            ctx.font = `600 ${11}px ${MONO}`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(p == null ? '—' : `${Math.round(p * 100)}`, x, y + 0.5)
          } else {
            ctx.fillStyle = pal.card
            ctx.fill()
            ctx.lineWidth = 2
            ctx.strokeStyle = color
            ctx.stroke()
          }

          // Label.
          const fs = (focus ? 15 : 12.5) / Math.min(Math.max(scale, 0.6), 2.2)
          ctx.font = focus ? `750 ${fs}px ${DISPLAY}` : `${selected ? 650 : 520} ${fs}px ${BODY}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          const ly = y + ringR + 5
          ctx.lineWidth = 4 / scale
          ctx.strokeStyle = pal.paper
          ctx.lineJoin = 'round'
          ctx.strokeText(node.name, x, ly)
          ctx.fillStyle = focus || selected ? pal.ink : pal.ink2
          ctx.fillText(node.name, x, ly)
          ctx.globalAlpha = 1
        }}
      />
    </div>
  )
}
