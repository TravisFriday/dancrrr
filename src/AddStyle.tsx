import { useState, type CSSProperties } from 'react'
import type { DanceMap, Link } from './types'
import { Dialog, FilledButton, Switch, TextButton, TextField } from './md'

interface Props {
  map: DanceMap
  colorOf: (focusId: string) => string
  onAdd: (name: string, about: string, links: Omit<Link, 'from'>[]) => void
  onClose: () => void
}

const val = (e: Event) => (e.target as HTMLInputElement).value

export default function AddStyle({ map, colorOf, onAdd, onClose }: Props) {
  const focus = map.nodes.filter((n) => n.kind === 'focus')
  const [name, setName] = useState('')
  const [about, setAbout] = useState('')
  const [targets, setTargets] = useState<Record<string, { on: boolean; builds: string }>>(
    Object.fromEntries(focus.map((f) => [f.id, { on: false, builds: '' }])),
  )
  const valid = !!name.trim()
  const submit = () =>
    valid &&
    onAdd(
      name.trim(),
      about.trim(),
      Object.entries(targets)
        .filter(([, t]) => t.on)
        .map(([to, t]) => ({ to, builds: t.builds.trim(), why: '' })),
    )

  return (
    <Dialog open onClosed={onClose}>
      <div slot="headline">Add a style</div>
      <form slot="content" id="add-style" method="dialog" className="dialog-form" onSubmit={(e) => (e.preventDefault(), submit())}>
        <TextField label="Style" placeholder="Krump, Dancehall, Breaking…" value={name} onInput={(e) => setName(val(e))} />
        <TextField label="Short description (optional)" value={about} onInput={(e) => setAbout(val(e))} />
        <p className="title-small section-title">Connect it to</p>
        <div className="connections">
          {focus.map((f, fi) => {
            const t = targets[f.id]
            const set = (patch: Partial<typeof t>) => setTargets((prev) => ({ ...prev, [f.id]: { ...prev[f.id], ...patch } }))
            return (
              <div key={f.id} className={t.on ? 'connection on' : 'connection'} style={{ '--fc': colorOf(f.id), '--on-fc': `var(--on-focus-${(fi % 5) + 1})` } as CSSProperties}>
                <label className="connection-row">
                  <span className="avatar">{f.name.slice(0, 1)}</span>
                  <span className="body-large grow">{f.name}</span>
                  <Switch selected={t.on} onChange={(e) => set({ on: (e.target as HTMLElement & { selected: boolean }).selected })} aria-label={`Connect to ${f.name}`} />
                </label>
                {t.on && (
                  <div className="connection-fields">
                    <TextField label="What it builds" placeholder="e.g. footwork" value={t.builds} onInput={(e) => set({ builds: val(e) })} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </form>
      <div slot="actions">
        <TextButton onClick={onClose}>Cancel</TextButton>
        <FilledButton onClick={submit} disabled={!valid}>Add style</FilledButton>
      </div>
    </Dialog>
  )
}
