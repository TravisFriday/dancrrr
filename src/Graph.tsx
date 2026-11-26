import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D, { type ForceGraphMethods, type NodeObject, type LinkObject } from 'react-force-graph-2d'
import type { DanceMap, StyleNode } from './types'
import { progress } from './store'
import { forceCollide } from 'd3-force-3d'

type GNode = { id: string }
type GLink = { builds: string }
type N = NodeObject<GNode>
type L = LinkObject<GNode, GLink>

const FOCUS_COLORS = ['#ff5d73', '#ffb547', '#3ec7a8', '#7c8cff', '#e46fff']

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

export default function Graph({ map, selectedId, focusFilter, onSelect }: Props) {
  const { ref, w, h } = useSize<HTMLDivElement>()
  const fg = useRef<ForceGraphMethods<GNode, GLink> | undefined>(undefined)

  // Rebuild graph data only when the structure changes, so positions survive slider moves.
  const structureKey =
    map.nodes.map((n) => n.id).join('|') + '#' + map.links.map((l) => `${l.from}>${l.to}:${l.builds}`).join('|')
  const data = useMemo(() => {
    const focus = map.nodes.filter((n) => n.kind === 'focus')
    const nodes: N[] = map.nodes.map((n) => {
      const fi = focus.findIndex((f) => f.id === n.id)
      if (fi < 0) return { id: n.id }
      // Pin focus styles evenly on a circle so the layout stays familiar.
      const a = (fi / focus.length) * Math.PI * 2 - Math.PI / 2
      return { id: n.id, fx: Math.cos(a) * 150, fy: Math.sin(a) * 150 }
    })
    const links: L[] = map.links.map((l) => ({ source: l.from, target: l.to, builds: l.builds }))
    return { nodes, links }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureKey])

  const byId = useMemo(() => new Map(map.nodes.map((n) => [n.id, n])), [map.nodes])
  const byIdRef = useRef(byId)
  byIdRef.current = byId
  const focusColor = useMemo(() => {
    const m = new Map<string, string>()
    map.nodes.filter((n) => n.kind === 'focus').forEach((n, i) => m.set(n.id, FOCUS_COLORS[i % FOCUS_COLORS.length]))
    return m
  }, [map.nodes])

  // Which nodes are "lit" under the current focus filter.
  const lit = useMemo(() => {
    if (!focusFilter) return null
    const s = new Set([focusFilter])
    map.links.forEach((l) => l.to === focusFilter && s.add(l.from))
    return s
  }, [focusFilter, map.links])

  const colorFor = (n: StyleNode) => {
    if (n.kind === 'focus') return focusColor.get(n.id)!
    const targets = map.links.filter((l) => l.from === n.id).map((l) => l.to)
    return targets.length === 1 ? focusColor.get(targets[0]) ?? '#9aa3b2' : '#9aa3b2'
  }

  useEffect(() => {
    const g = fg.current
    if (!g) return
    g.d3Force('charge')?.strength(-300)
    g.d3Force('link')?.distance(110)
    // Keep circles and their labels from piling on top of each other.
    g.d3Force('collide', forceCollide<N>((n) => (byIdRef.current.get(n.id)?.kind === 'focus' ? 50 : 42)) as never)
    g.d3ReheatSimulation()
  }, [data])

  // On phones the detail sheet covers the bottom of the screen, so slide the chosen style into the visible top part.
  useEffect(() => {
    const g = fg.current
    if (!g || !selectedId || window.innerWidth >= 800) return
    const n = data.nodes.find((d) => d.id === selectedId)
    if (n?.x == null || n.y == null) return
    g.centerAt(n.x, n.y + (window.innerHeight * 0.3) / g.zoom(), 400)
  }, [selectedId, data])

  return (
    <div ref={ref} className="graph">
      <ForceGraph2D<GNode, GLink>
        ref={fg}
        width={w}
        height={h}
        graphData={data}
        backgroundColor="rgba(0,0,0,0)"
        cooldownTicks={120}
        onEngineStop={() => fg.current?.zoomToFit(400, 50)}
        onNodeClick={(n) => onSelect(n.id)}
        onBackgroundClick={() => onSelect(null)}
        linkColor={(l) => {
          const s = (l.source as N).id ?? l.source
          const t = (l.target as N).id ?? l.target
          const on = !lit || (lit.has(s as string) && lit.has(t as string))
          return on ? 'rgba(160,170,190,0.55)' : 'rgba(160,170,190,0.08)'
        }}
        linkWidth={1.5}
        linkDirectionalArrowLength={5}
        linkDirectionalArrowRelPos={0.85}
        linkCanvasObjectMode={() => 'after'}
        linkCanvasObject={(l, ctx, scale) => {
          if (scale < 1.6) return
          const s = l.source as N, t = l.target as N
          if (s.x == null || t.x == null || s.y == null || t.y == null) return
          if (lit && !(lit.has(s.id) && lit.has(t.id))) return
          ctx.font = `${10 / scale}px system-ui, sans-serif`
          ctx.fillStyle = 'rgba(160,170,190,0.9)'
          ctx.textAlign = 'center'
          ctx.fillText(l.builds, (s.x + t.x) / 2, (s.y + t.y) / 2 - 2 / scale)
        }}
        nodePointerAreaPaint={(n, color, ctx) => {
          const node = byId.get(n.id)
          const r = node?.kind === 'focus' ? 18 : 11
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(n.x!, n.y!, r + 4, 0, Math.PI * 2)
          ctx.fill()
        }}
        nodeCanvasObject={(n, ctx, scale) => {
          const node = byId.get(n.id)
          if (!node) return
          const focus = node.kind === 'focus'
          const r = focus ? 18 : 11
          const x = n.x!, y = n.y!
          const dim = lit && !lit.has(node.id)
          ctx.globalAlpha = dim ? 0.15 : 1
          const color = colorFor(node)

          // body
          ctx.beginPath()
          ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.fillStyle = focus ? color : 'rgba(30,34,44,1)'
          ctx.fill()
          ctx.lineWidth = 2
          ctx.strokeStyle = color
          ctx.stroke()

          // progress ring
          const p = progress(node)
          if (p != null && p > 0) {
            ctx.beginPath()
            ctx.arc(x, y, r + 4, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2)
            ctx.lineWidth = 3
            ctx.strokeStyle = '#ffffff'
            ctx.stroke()
          }

          if (selectedId === node.id) {
            ctx.beginPath()
            ctx.arc(x, y, r + 8, 0, Math.PI * 2)
            ctx.lineWidth = 1.5
            ctx.setLineDash([3, 3])
            ctx.strokeStyle = '#ffffff'
            ctx.stroke()
            ctx.setLineDash([])
          }

          // label
          const fs = Math.max((focus ? 13 : 11) / Math.sqrt(scale), 3)
          ctx.font = `${focus ? 700 : 500} ${fs}px system-ui, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.fillStyle = '#e8ebf2'
          ctx.fillText(node.name, x, y + r + 6)
          ctx.globalAlpha = 1
        }}
      />
    </div>
  )
}
