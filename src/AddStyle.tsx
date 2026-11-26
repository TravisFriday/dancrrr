import { useState, type CSSProperties } from 'react'
import type { DanceMap, Link } from './types'

interface Props {
  map: DanceMap
  colorOf: (focusId: string) => string
  onAdd: (name: string, about: string, links: Omit<Link, 'from'>[]) => void
  onClose: () => void
}

export default function AddStyle({ map, colorOf, onAdd, onClose }: Props) {
  const focus = map.nodes.filter((n) => n.kind === 'focus')
  const [name, setName] = useState('')
  const [about, setAbout] = useState('')
  const [targets, setTargets] = useState<Record<string, { on: boolean; builds: string }>>(
    Object.fromEntries(focus.map((f) => [f.id, { on: false, builds: '' }])),
  )
  const chosen = Object.entries(targets).filter(([, t]) => t.on)
  const valid = !!name.trim()

  return (
    <div className="scrim" onClick={onClose}>
      <form
        className="dialog"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          onAdd(name.trim(), about.trim(), chosen.map(([to, t]) => ({ to, builds: t.builds.trim(), why: '' })))
        }}
      >
        <p className="eyebrow">New building block</p>
        <h2>Add a style</h2>
        <input className="big-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Krump, Dancehall, Breaking…" autoFocus aria-label="Style name" />
        <input value={about} onChange={(e) => setAbout(e.target.value)} placeholder="One line about it (optional)" aria-label="Description" />
        <h3>Connect it to</h3>
        <ul className="conns">
          {focus.map((f) => {
            const t = targets[f.id]
            const set = (patch: Partial<typeof t>) => setTargets({ ...targets, [f.id]: { ...t, ...patch } })
            return (
              <li key={f.id} className={t.on ? 'conn on' : 'conn'} style={{ '--fc': colorOf(f.id) } as CSSProperties}>
                <label className="conn-row">
                  <i className="dot" />
                  <span className="conn-name">{f.name}</span>
                  <input type="checkbox" className="switch" checked={t.on} onChange={(e) => set({ on: e.target.checked })} aria-label={`Connect to ${f.name}`} />
                </label>
                {t.on && (
                  <div className="conn-fields">
                    <input value={t.builds} onChange={(e) => set({ builds: e.target.value })} placeholder="What it builds, e.g. footwork" aria-label={`What it builds for ${f.name}`} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        <div className="dialog-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={!valid} className="btn-ink">Add style</button>
        </div>
      </form>
    </div>
  )
}
