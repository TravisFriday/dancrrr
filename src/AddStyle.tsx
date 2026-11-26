import { useState, type CSSProperties } from 'react'
import type { DanceMap, Link } from './types'
import { ChipSet, Dialog, FilledButton, FilterChip, Switch, TextButton, TextField } from './md'

interface Props {
  map: DanceMap
  colorOf: (focusId: string) => string
  onAdd: (name: string, about: string, links: Omit<Link, 'from'>[], parent?: string) => void
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
  const [mode, setMode] = useState<'helps' | 'part'>('helps')
  const [parent, setParent] = useState<string | null>(null)
  const valid = !!name.trim() && (mode === 'helps' || !!parent)
  const submit = () =>
    valid &&
    onAdd(
      name.trim(),
      about.trim(),
      Object.entries(targets)
        .filter(([, t]) => t.on)
        .map(([to, t]) => ({ to, builds: t.builds.trim(), why: '' })),
      mode === 'part' ? parent ?? undefined : undefined,
    )

  return (
    <Dialog open onClosed={onClose}>
      <div slot="headline">Add a style</div>
      <form slot="content" id="add-style" method="dialog" className="dialog-form" onSubmit={(e) => (e.preventDefault(), submit())}>
        <TextField label="Style" placeholder="Krump, Dancehall, Breaking…" value={name} onInput={(e) => setName(val(e))} />
        <TextField label="Short description (optional)" value={about} onInput={(e) => setAbout(val(e))} />
        <ChipSet aria-label="How it relates">
          <FilterChip label="Helps a focus style" selected={mode === 'helps'} onClick={(e) => (e.preventDefault(), setMode('helps'))} />
          <FilterChip label="Part of a focus style" selected={mode === 'part'} onClick={(e) => (e.preventDefault(), setMode('part'))} />
        </ChipSet>
        {mode === 'part' ? (
          <>
            <p className="title-small section-title">Put it inside</p>
            <ChipSet>
              {focus.map((f, fi) => (
                <FilterChip
                  key={f.id}
                  className={`focus-chip f${(fi % 5) + 1}`}
                  label={f.name}
                  selected={parent === f.id}
                  onClick={(e) => (e.preventDefault(), setParent(f.id))}
                />
              ))}
            </ChipSet>
          </>
        ) : (
        <>
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
        </>
        )}
      </form>
      <div slot="actions">
        <TextButton onClick={onClose}>Cancel</TextButton>
        <FilledButton onClick={submit} disabled={!valid}>Add style</FilledButton>
      </div>
    </Dialog>
  )
}
