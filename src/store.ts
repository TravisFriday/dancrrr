import { useEffect, useState } from 'react'
import seed from './data/seed.json'
import type { DanceMap, Item, Link, StyleNode } from './types'

const KEY = 'dancrrr.map.v1'

export const newId = () => Math.random().toString(36).slice(2, 10)

function fromSeed(): DanceMap {
  return {
    version: 1,
    nodes: seed.nodes.map((n) => ({
      id: n.id,
      name: n.name,
      kind: n.kind as StyleNode['kind'],
      about: n.about,
      items: n.items.map((i) => ({ ...i, id: newId(), type: i.type as Item['type'] })),
    })),
    links: seed.links,
  }
}

function isMap(x: unknown): x is DanceMap {
  const m = x as DanceMap
  return !!m && Array.isArray(m.nodes) && Array.isArray(m.links)
}

function load(): DanceMap {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (isMap(parsed)) return parsed
    }
  } catch {
    /* storage unavailable or corrupt: fall back to the seed */
  }
  return fromSeed()
}

export function useDanceMap() {
  const [map, setMap] = useState<DanceMap>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(map))
    } catch {
      /* ignore */
    }
  }, [map])

  const updateNode = (id: string, fn: (n: StyleNode) => StyleNode) =>
    setMap((m) => ({ ...m, nodes: m.nodes.map((n) => (n.id === id ? fn(n) : n)) }))

  return {
    map,
    setLevel: (nodeId: string, itemId: string, level: number) =>
      updateNode(nodeId, (n) => ({
        ...n,
        items: n.items.map((i) => (i.id === itemId ? { ...i, level } : i)),
      })),
    addItem: (nodeId: string, name: string, type: Item['type']) =>
      updateNode(nodeId, (n) => ({ ...n, items: [...n.items, { id: newId(), name, type, level: 1 }] })),
    removeItem: (nodeId: string, itemId: string) =>
      updateNode(nodeId, (n) => ({ ...n, items: n.items.filter((i) => i.id !== itemId) })),
    addStyle: (name: string, about: string, links: Omit<Link, 'from'>[]) => {
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + newId().slice(0, 4)
      setMap((m) => ({
        ...m,
        nodes: [...m.nodes, { id, name, kind: 'support', about, items: [] }],
        links: [...m.links, ...links.map((l) => ({ ...l, from: id }))],
      }))
      return id
    },
    removeStyle: (id: string) =>
      setMap((m) => ({
        ...m,
        nodes: m.nodes.filter((n) => n.id !== id),
        links: m.links.filter((l) => l.from !== id && l.to !== id),
      })),
    // Connect a supporting style to a focus style, or cut that connection.
    setConnected: (from: string, to: string, on: boolean) =>
      setMap((m) => {
        const exists = m.links.some((l) => l.from === from && l.to === to)
        if (on && !exists) return { ...m, links: [...m.links, { from, to, builds: '', why: '' }] }
        if (!on && exists) return { ...m, links: m.links.filter((l) => !(l.from === from && l.to === to)) }
        return m
      }),
    updateLink: (from: string, to: string, patch: Partial<Pick<Link, 'builds' | 'why'>>) =>
      setMap((m) => ({
        ...m,
        links: m.links.map((l) => (l.from === from && l.to === to ? { ...l, ...patch } : l)),
      })),
    replace: (next: unknown) => {
      if (!isMap(next)) return false
      setMap(next)
      return true
    },
    reset: () => setMap(fromSeed()),
  }
}

export function progress(n: StyleNode): number | null {
  if (!n.items.length) return null
  const avg = n.items.reduce((s, i) => s + i.level, 0) / n.items.length
  return (avg - 1) / 4 // 0..1
}
