import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D, { type ForceGraphMethods, type NodeObject, type LinkObject } from 'react-force-graph-2d'
import { forceCollide } from 'd3-force-3d'
import type { DanceMap, StyleNode } from './types'
import { progress } from './store'
import { usePalette, useFontsReady, withAlpha, type Palette } from './theme'

type GNode = { id: string }
type GLink = { builds: string }
type N = NodeObject<GNode>
type L = LinkObject<GNode, GLink>

const FONT = 'Roboto, system-ui, sans-serif'
const R_MEMBER = 13
const R_SUPPORT = 12

/** Radius of a focus style's bubble: room for the styles it is made of. */
const bubbleRadius = (members: number) => (members === 0 ? 36 : 46 + 20 * Math.sqrt(members))

/** Where member k of n sits inside its bubble, relative to the bubble's centre. */
function memberOffset(k: number, n: number, R: number) {
  if (n === 1) return { x: 0, y: -4 }
  const ring = R * 0.5
  const a = (k / n) * Math.PI * 2 - Math.PI / 2
  return { x: Math.cos(a) * ring, y: Math.sin(a) * ring - 4 }
}

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

  const byId = useMemo(() => new Map(map.nodes.map((n) => [n.id, n])), [map.nodes])
  const focusIds = useMemo(() => map.nodes.filter((n) => n.kind === 'focus').map((n) => n.id), [map.nodes])
  const membersOf = useMemo(() => {
    const m = new Map<string, string[]>()
    map.nodes.forEach((n) => n.parent && byId.get(n.parent)?.kind === 'focus' && m.set(n.parent, [...(m.get(n.parent) ?? []), n.id]))
    return m
  }, [map.nodes, byId])
  const radiusOf = (id: string) => {
    const n = byId.get(id)
    if (!n) return R_SUPPORT
    if (n.kind === 'focus') return bubbleRadius(membersOf.get(id)?.length ?? 0)
    return n.parent ? R_MEMBER : R_SUPPORT
  }
  const radiusRef = useRef(radiusOf)
  radiusRef.current = radiusOf

  const isMember = (n?: StyleNode) => !!n?.parent && byId.get(n.parent)?.kind === 'focus'

  // Rebuild only when styles, membership or connections change. Node objects are reused so
  // nothing jumps around when you connect or move a style.
  const structureKey =
    map.nodes.map((n) => `${n.id}^${n.parent ?? ''}`).join('|') + '#' + map.links.map((l) => `${l.from}>${l.to}:${l.builds}`).join('|')
  const data = useMemo(() => {
    const cache = nodeCache.current
    const maxR = Math.max(36, ...focusIds.map((id) => bubbleRadius(membersOf.get(id)?.length ?? 0)))
    const ringR = Math.max(150, maxR * 1.9 + 40)
    const pos = new Map<string, { x: number; y: number }>()
    focusIds.forEach((id, i) => {
      const a = (i / focusIds.length) * Math.PI * 2 - Math.PI / 2
      pos.set(id, { x: Math.cos(a) * ringR, y: Math.sin(a) * ringR })
    })
    const get = (id: string) => {
      const node = cache.get(id) ?? { id }
      cache.set(id, node)
      return node
    }
    // Paint order matters: bubbles first, then the styles inside them, then everything else.
    const focus = focusIds.map((id) => {
      const node = get(id)
      const p = pos.get(id)!
      node.fx = p.x
      node.fy = p.y
      return node
    })
    const members: N[] = []
    focusIds.forEach((fid) => {
      const ids = membersOf.get(fid) ?? []
      const R = bubbleRadius(ids.length)
      ids.forEach((id, k) => {
        const node = get(id)
        const o = memberOffset(k, ids.length, R)
        node.fx = pos.get(fid)!.x + o.x
        node.fy = pos.get(fid)!.y + o.y
        members.push(node)
      })
    })
    const others = map.nodes
      .filter((n) => n.kind !== 'focus' && !isMember(n))
      .map((n) => {
        const node = get(n.id)
        node.fx = undefined
        node.fy = undefined
        return node
      })
    const links: L[] = map.links
      .filter((l) => byId.has(l.from) && byId.has(l.to) && !isMember(byId.get(l.from)))
      .map((l) => ({ source: l.from, target: l.to, builds: l.builds }))
    return { nodes: [...focus, ...members, ...others], links }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureKey])

  // Which styles stay bright: the selected (or filtered) style and everything tied to it.
  const active = selectedId ?? focusFilter
  const lit = useMemo(() => {
    if (!active) return null
    const s = new Set([active])
    const n = byId.get(active)
    const focusOfActive = n?.kind === 'focus' ? active : isMember(n) ? n!.parent! : null
    if (focusOfActive) {
      s.add(focusOfActive)
      ;(membersOf.get(focusOfActive) ?? []).forEach((m) => s.add(m))
    }
    map.links.forEach((l) => {
      if (l.to === active) s.add(l.from)
      if (l.from === active) s.add(l.to)
    })
    return s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, map.links, membersOf, byId])
  const linkLit = (l: L) => !lit || idOf(l.source) === active || idOf(l.target) === active

  const focusIndex = (id: string) => Math.max(focusIds.indexOf(id), 0)
  const familyColor = (n: StyleNode, p: Palette) => {
    if (n.kind === 'focus') return p.focus[focusIndex(n.id) % p.focus.length]
    if (isMember(n)) return p.focus[focusIndex(n.parent!) % p.focus.length]
    return p.outline
  }

  useEffect(() => {
    const g = fg.current
    if (!g) return
    g.d3Force('charge')?.strength(-320)
    g.d3Force('link')?.distance((l: L) => radiusRef.current(idOf(l.target)) + 80)
    g.d3Force('collide', forceCollide<N>((n) => {
      const node = byId.get(n.id)
      if (node?.kind === 'focus') return radiusRef.current(n.id) + 34
      return isMember(node) ? 0 : 44
    }) as never)
    g.d3ReheatSimulation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  // On phones the sheet covers the lower part of the screen, so keep the chosen style in view above it.
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

  // Like zoomToFit, but counts each bubble's size and the label under it.
  const fitAll = () => {
    const g = fg.current
    if (!g || !data.nodes.length) return
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const n of data.nodes) {
      if (n.x == null || n.y == null) continue
      const r = radiusOf(n.id) + 10
      x0 = Math.min(x0, n.x - r - 30)
      x1 = Math.max(x1, n.x + r + 30)
      y0 = Math.min(y0, n.y - r)
      y1 = Math.max(y1, n.y + r + 28)
    }
    const pad = w < 600 ? 16 : 40
    const k = Math.min((w - pad * 2) / (x1 - x0), (h - pad * 2 - (w < 600 ? 64 : 0)) / (y1 - y0), 2)
    g.zoom(k, 500)
    g.centerAt((x0 + x1) / 2, (y0 + y1) / 2 + (w < 600 ? 32 / k : 0), 500)
  }

  const drawLabel = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, weight: number, color: string, halo: string | null, scale: number) => {
    ctx.font = `${weight} ${size}px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    if (halo) {
      ctx.lineWidth = 4 / scale
      ctx.lineJoin = 'round'
      ctx.strokeStyle = halo
      ctx.strokeText(text, x, y)
    }
    ctx.fillStyle = color
    ctx.fillText(text, x, y)
  }

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
          fitAll()
        }}
        onNodeClick={(n) => onSelect(n.id)}
        onBackgroundClick={() => onSelect(null)}
        linkCanvasObjectMode={() => 'replace'}
        linkCanvasObject={(l, ctx, scale) => {
          const s = l.source as N, t = l.target as N
          if (s.x == null || t.x == null || s.y == null || t.y == null) return
          const on = linkLit(l)
          const strong = !!lit && on
          // Curve from the edge of one style to the edge of the other's bubble.
          const dx = t.x - s.x, dy = t.y - s.y
          const len = Math.hypot(dx, dy) || 1
          const ux = dx / len, uy = dy / len
          const rs = radiusOf(s.id) + 5, rt = radiusOf(t.id) + 7
          if (len <= rs + rt) return
          const x1 = s.x + ux * rs, y1 = s.y + uy * rs
          const x2 = t.x - ux * rt, y2 = t.y - uy * rt
          const bend = (len - rs - rt) * 0.12
          const cx = (x1 + x2) / 2 + uy * bend, cy = (y1 + y2) / 2 - ux * bend
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.quadraticCurveTo(cx, cy, x2, y2)
          ctx.lineWidth = strong ? 2.2 : 1.4
          ctx.strokeStyle = !on ? withAlpha(pal.outline, 0.12) : strong ? pal.onSurfaceVariant : withAlpha(pal.outline, 0.6)
          ctx.stroke()
          // End dot where it meets the bubble.
          ctx.beginPath()
          ctx.arc(x2, y2, strong ? 3 : 2.2, 0, Math.PI * 2)
          ctx.fillStyle = ctx.strokeStyle
          ctx.fill()

          const showLabel = l.builds && ((scale > 1.5 && !lit) || strong)
          if (!showLabel) return
          const mx = 0.25 * x1 + 0.5 * cx + 0.25 * x2
          const my = 0.25 * y1 + 0.5 * cy + 0.25 * y2
          const fs = 11 / scale
          ctx.font = `500 ${fs}px ${FONT}`
          const tw = ctx.measureText(l.builds).width
          const px = 8 / scale, hh = 22 / scale
          ctx.fillStyle = pal.container
          ctx.strokeStyle = pal.outlineVariant
          ctx.lineWidth = 1 / scale
          ctx.beginPath()
          ctx.roundRect(mx - tw / 2 - px, my - hh / 2, tw + px * 2, hh, 8 / scale)
          ctx.fill()
          ctx.stroke()
          ctx.fillStyle = pal.onSurfaceVariant
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(l.builds, mx, my + 0.5 / scale)
        }}
        nodePointerAreaPaint={(n, color, ctx) => {
          ctx.fillStyle = color
          ctx.beginPath()
          const node = byId.get(n.id)
          ctx.arc(n.x!, n.y!, radiusOf(n.id) + (node?.kind === 'focus' ? 4 : 8), 0, Math.PI * 2)
          ctx.fill()
        }}
        nodeCanvasObject={(n, ctx, scale) => {
          const node = byId.get(n.id)
          if (!node) return
          const x = n.x!, y = n.y!
          const r = radiusOf(node.id)
          const color = familyColor(node, pal)
          const p = progress(node)
          const selected = selectedId === node.id
          const dimmed = !!lit && !lit.has(node.id)
          ctx.globalAlpha = dimmed ? 0.2 : 1
          const labelScale = Math.min(Math.max(scale, 0.6), 2.2)

          if (node.kind === 'focus') {
            const fi = focusIndex(node.id)
            const hasMembers = (membersOf.get(node.id)?.length ?? 0) > 0
            // See-through bubble.
            ctx.beginPath()
            ctx.arc(x, y, r, 0, Math.PI * 2)
            ctx.fillStyle = withAlpha(color, selected ? 0.26 : 0.14)
            ctx.fill()
            ctx.lineWidth = selected ? 2.5 : 1.5
            ctx.strokeStyle = withAlpha(color, selected ? 0.9 : 0.55)
            ctx.stroke()
            // Progress around the rim.
            const ringR = r + 6
            ctx.lineCap = 'round'
            ctx.beginPath()
            ctx.arc(x, y, ringR, 0, Math.PI * 2)
            ctx.lineWidth = 4
            ctx.strokeStyle = withAlpha(color, 0.16)
            ctx.stroke()
            if (p != null && p > 0) {
              ctx.beginPath()
              ctx.arc(x, y, ringR, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2)
              ctx.strokeStyle = color
              ctx.stroke()
            }
            ctx.lineCap = 'butt'
            if (!hasMembers) {
              ctx.fillStyle = pal.onFocusContainer[fi % 5]
              ctx.font = `500 13px ${FONT}`
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillText(p == null ? '–' : `${Math.round(p * 100)}%`, x, y + 0.5)
            }
            const label = hasMembers && p != null ? `${node.name}  ${Math.round(p * 100)}%` : node.name
            drawLabel(ctx, label, x, y + ringR + 7, 15 / labelScale, 500, pal.onSurface, pal.surface, scale)
          } else if (isMember(node)) {
            const fi = focusIndex(node.parent!)
            if (selected) {
              ctx.beginPath()
              ctx.arc(x, y, r + 9, 0, Math.PI * 2)
              ctx.fillStyle = withAlpha(color, 0.3)
              ctx.fill()
            }
            ctx.beginPath()
            ctx.arc(x, y, r, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.fill()
            if (p != null && p > 0) {
              ctx.beginPath()
              ctx.arc(x, y, r + 3.5, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2)
              ctx.lineWidth = 2.5
              ctx.lineCap = 'round'
              ctx.strokeStyle = color
              ctx.stroke()
              ctx.lineCap = 'butt'
            }
            // Fixed map units so labels inside a bubble keep their spacing at any zoom.
            drawLabel(ctx, node.name, x, y + r + 4, 10.5, selected ? 700 : 500, pal.onFocusContainer[fi % 5], null, scale)
          } else {
            if (selected) {
              ctx.beginPath()
              ctx.arc(x, y, r + 12, 0, Math.PI * 2)
              ctx.fillStyle = withAlpha(pal.onSurfaceVariant, 0.14)
              ctx.fill()
            }
            const ringR = r + 5
            ctx.beginPath()
            ctx.arc(x, y, ringR, 0, Math.PI * 2)
            ctx.lineWidth = 3
            ctx.strokeStyle = withAlpha(pal.outline, 0.22)
            ctx.stroke()
            if (p != null && p > 0) {
              ctx.beginPath()
              ctx.arc(x, y, ringR, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2)
              ctx.lineCap = 'round'
              ctx.strokeStyle = pal.onSurfaceVariant
              ctx.stroke()
              ctx.lineCap = 'butt'
            }
            ctx.beginPath()
            ctx.arc(x, y, r, 0, Math.PI * 2)
            ctx.fillStyle = pal.containerHigh
            ctx.fill()
            ctx.lineWidth = 1.5
            ctx.strokeStyle = pal.outline
            ctx.stroke()
            drawLabel(ctx, node.name, x, y + ringR + 6, 12.5 / labelScale, selected ? 500 : 400, selected ? pal.onSurface : pal.onSurfaceVariant, pal.surface, scale)
          }
          ctx.globalAlpha = 1
        }}
      />
    </div>
  )
}
