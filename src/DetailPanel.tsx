import { useState, type CSSProperties } from 'react'
import type { DanceMap, Item, Link, StyleNode } from './types'
import { progress } from './store'
import { LEVEL_WORDS } from './theme'

interface Props {
  map: DanceMap
  node: StyleNode
  color: string
  colorOf: (focusId: string) => string
  onClose: () => void
  onSelect: (id: string) => void
  setLevel: (nodeId: string, itemId: string, level: number) => void
  addItem: (nodeId: string, name: string, type: Item['type']) => void
  removeItem: (nodeId: string, itemId: string) => void
  removeStyle: (id: string) => void
  setConnected: (from: string, to: string, on: boolean) => void
  updateLink: (from: string, to: string, patch: Partial<Pick<Link, 'builds' | 'why'>>) => void
}

export function Rating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="rating" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          aria-label={`${v}: ${LEVEL_WORDS[v]}`}
          className={v <= value ? 'seg on' : 'seg'}
          onClick={() => onChange(v)}
        >
          <span />
        </button>
      ))}
      <span className="rating-word">
        <b>{value}</b>
        {LEVEL_WORDS[value]}
      </span>
    </div>
  )
}

export default function DetailPanel(props: Props) {
  const { map, node, color, colorOf, onClose, onSelect, setLevel, addItem, removeItem, removeStyle, setConnected, updateLink } = props
  const [draft, setDraft] = useState('')
  const [type, setType] = useState<Item['type']>('move')
  const focus = node.kind === 'focus'
  const p = progress(node)
  const nameOf = (id: string) => map.nodes.find((n) => n.id === id)?.name ?? id
  const focusStyles = map.nodes.filter((n) => n.kind === 'focus')
  const feeders = map.links.filter((l) => l.to === node.id)

  return (
    <aside className="panel" style={{ '--c': color } as CSSProperties} aria-label={`${node.name} details`}>
      <button className="sheet-handle" onClick={onClose} aria-label="Close" />
      <header className="panel-head">
        <div>
          <p className="eyebrow">
            <i className="dot" /> {focus ? 'Focus style' : 'Building block'}
          </p>
          <h2>{node.name}</h2>
        </div>
        <button className="round" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      </header>

      {p == null ? (
        <p className="score-empty">No moves yet. Add one below to start tracking.</p>
      ) : (
        <div className="score">
          <span className="score-num">{Math.round(p * 100)}<small>%</small></span>
          <div className="score-body">
            <div className="meter"><div style={{ width: `${p * 100}%` }} /></div>
            <span>across {node.items.length} {node.items.length === 1 ? 'thing' : 'things'} you're working on</span>
          </div>
        </div>
      )}

      {node.about && <p className="about">{node.about}</p>}

      {focus ? (
        <section>
          <h3>Feeds into it</h3>
          {feeders.length === 0 && <p className="muted">Nothing connected yet. Open a building block and connect it here.</p>}
          <ul className="feeders">
            {feeders.map((l) => (
              <li key={l.from}>
                <button className="feeder" onClick={() => onSelect(l.from)}>
                  <span className="feeder-name">{nameOf(l.from)}</span>
                  {l.builds && <span className="chip-mono">{l.builds}</span>}
                  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section>
          <h3>Connected to</h3>
          <ul className="conns">
            {focusStyles.map((f) => {
              const link = map.links.find((l) => l.from === node.id && l.to === f.id)
              const on = !!link
              return (
                <li key={f.id} className={on ? 'conn on' : 'conn'} style={{ '--fc': colorOf(f.id) } as CSSProperties}>
                  <label className="conn-row">
                    <i className="dot" />
                    <span className="conn-name">{f.name}</span>
                    <input
                      type="checkbox"
                      className="switch"
                      checked={on}
                      onChange={(e) => setConnected(node.id, f.id, e.target.checked)}
                      aria-label={`Connect ${node.name} to ${f.name}`}
                    />
                  </label>
                  {link && (
                    <div className="conn-fields">
                      <input
                        value={link.builds}
                        onChange={(e) => updateLink(node.id, f.id, { builds: e.target.value })}
                        placeholder="What it builds, e.g. footwork"
                        aria-label={`What ${node.name} builds for ${f.name}`}
                      />
                      <input
                        value={link.why}
                        onChange={(e) => updateLink(node.id, f.id, { why: e.target.value })}
                        placeholder="Why it helps (optional)"
                        aria-label={`Why ${node.name} helps ${f.name}`}
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section>
        <h3>Moves &amp; concepts</h3>
        {node.items.length === 0 && <p className="muted">What do you want to take from {node.name}? Add it below and rate yourself.</p>}
        <ul className="items">
          {node.items.map((i) => (
            <li key={i.id}>
              <div className="item-top">
                <span className="item-name">{i.name}</span>
                <span className="kind">{i.type}</span>
                <button className="remove" onClick={() => removeItem(node.id, i.id)} aria-label={`Remove ${i.name}`}>
                  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                </button>
              </div>
              <Rating value={i.level} onChange={(v) => setLevel(node.id, i.id, v)} label={`How good you are at ${i.name}`} />
            </li>
          ))}
        </ul>
        <form
          className="add-item"
          onSubmit={(e) => {
            e.preventDefault()
            if (!draft.trim()) return
            addItem(node.id, draft.trim(), type)
            setDraft('')
          }}
        >
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Add a ${type}…`} aria-label="New move or concept" />
          <div className="toggle" role="radiogroup" aria-label="Type">
            {(['move', 'concept'] as const).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={type === t} className={type === t ? 'on' : ''} onClick={() => setType(t)}>
                {t}
              </button>
            ))}
          </div>
          <button type="submit" className="btn-ink" disabled={!draft.trim()}>Add</button>
        </form>
      </section>

      {!focus && (
        <button
          className="text-danger"
          onClick={() => {
            if (window.confirm(`Remove ${node.name} from your map?`)) removeStyle(node.id)
          }}
        >
          Remove {node.name} from my map
        </button>
      )}
    </aside>
  )
}
