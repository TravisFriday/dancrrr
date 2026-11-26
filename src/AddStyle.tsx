import { useState } from 'react'
import type { DanceMap, Link } from './types'

interface Props {
  map: DanceMap
  onAdd: (name: string, about: string, links: Omit<Link, 'from'>[]) => void
  onClose: () => void
}

export default function AddStyle({ map, onAdd, onClose }: Props) {
  const focus = map.nodes.filter((n) => n.kind === 'focus')
  const [name, setName] = useState('')
  const [about, setAbout] = useState('')
  const [targets, setTargets] = useState<Record<string, { on: boolean; builds: string; why: string }>>(
    Object.fromEntries(focus.map((f) => [f.id, { on: false, builds: '', why: '' }])),
  )
  const chosen = Object.entries(targets).filter(([, t]) => t.on)
  const valid = name.trim() && chosen.length > 0 && chosen.every(([, t]) => t.builds.trim())

  return (
    <div className="modal-bg" onClick={onClose}>
      <form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          onAdd(name.trim(), about.trim(), chosen.map(([to, t]) => ({ to, builds: t.builds.trim(), why: t.why.trim() })))
        }}
      >
        <h2>Add a supporting style</h2>
        <label>Style<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Krump" autoFocus /></label>
        <label>Short description<input value={about} onChange={(e) => setAbout(e.target.value)} placeholder="optional" /></label>
        <p className="muted">Which focus styles does it help, and with what?</p>
        {focus.map((f) => {
          const t = targets[f.id]
          const set = (patch: Partial<typeof t>) => setTargets({ ...targets, [f.id]: { ...t, ...patch } })
          return (
            <div key={f.id} className="target">
              <label className="check"><input type="checkbox" checked={t.on} onChange={(e) => set({ on: e.target.checked })} /> {f.name}</label>
              {t.on && (
                <>
                  <input value={t.builds} onChange={(e) => set({ builds: e.target.value })} placeholder="Skill it builds (e.g. footwork)" />
                  <input value={t.why} onChange={(e) => set({ why: e.target.value })} placeholder="Why it helps (optional)" />
                </>
              )}
            </div>
          )
        })}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={!valid} className="primary">Add style</button>
        </div>
      </form>
    </div>
  )
}
