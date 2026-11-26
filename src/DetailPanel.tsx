import { useState } from 'react'
import type { DanceMap, Item, StyleNode } from './types'
import { progress } from './store'

const LEVEL_WORDS = ['', 'New to it', 'Getting there', 'Comfortable', 'Solid', 'Nailed it']

interface Props {
  map: DanceMap
  node: StyleNode
  onClose: () => void
  onSelect: (id: string) => void
  setLevel: (nodeId: string, itemId: string, level: number) => void
  addItem: (nodeId: string, name: string, type: Item['type']) => void
  removeItem: (nodeId: string, itemId: string) => void
  removeStyle: (id: string) => void
}

export default function DetailPanel({ map, node, onClose, onSelect, setLevel, addItem, removeItem, removeStyle }: Props) {
  const [name, setName] = useState('')
  const [type, setType] = useState<Item['type']>('move')
  const name_ = (id: string) => map.nodes.find((n) => n.id === id)?.name ?? id
  const p = progress(node)
  const connections =
    node.kind === 'focus'
      ? map.links.filter((l) => l.to === node.id).map((l) => ({ id: l.from, label: `${name_(l.from)}`, builds: l.builds, why: l.why }))
      : map.links.filter((l) => l.from === node.id).map((l) => ({ id: l.to, label: `${name_(l.to)}`, builds: l.builds, why: l.why }))

  return (
    <aside className="panel" aria-label={`${node.name} details`}>
      <header className="panel-head">
        <div>
          <span className={`badge ${node.kind}`}>{node.kind === 'focus' ? 'Focus style' : 'Supporting style'}</span>
          <h2>{node.name}</h2>
        </div>
        <button className="icon" onClick={onClose} aria-label="Close">✕</button>
      </header>
      {node.about && <p className="about">{node.about}</p>}

      <div className="overall">
        <div className="bar"><div style={{ width: `${(p ?? 0) * 100}%` }} /></div>
        <span>{p == null ? 'No moves yet' : `${Math.round(p * 100)}% there`}</span>
      </div>

      {connections.length > 0 && (
        <section>
          <h3>{node.kind === 'focus' ? 'Styles that help' : 'Helps with'}</h3>
          <ul className="conns">
            {connections.map((c) => (
              <li key={c.id + c.builds}>
                <button className="link" onClick={() => onSelect(c.id)}>{c.label}</button>
                <span className="skill">{c.builds}</span>
                {c.why && <p>{c.why}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3>Moves and concepts</h3>
        {node.items.length === 0 && <p className="muted">Add the moves or ideas you want to take from {node.name}.</p>}
        <ul className="items">
          {node.items.map((i) => (
            <li key={i.id}>
              <div className="item-row">
                <span className="item-name">{i.name}</span>
                <span className={`tag ${i.type}`}>{i.type}</span>
                <button className="icon small" onClick={() => removeItem(node.id, i.id)} aria-label={`Remove ${i.name}`}>✕</button>
              </div>
              <div className="slider-row">
                <input
                  type="range" min={1} max={5} step={1} value={i.level}
                  onChange={(e) => setLevel(node.id, i.id, Number(e.target.value))}
                  aria-label={`How good you are at ${i.name}`}
                />
                <span className="level"><b>{i.level}</b> {LEVEL_WORDS[i.level]}</span>
              </div>
            </li>
          ))}
        </ul>
        <form
          className="add"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            addItem(node.id, name.trim(), type)
            setName('')
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add a move or concept" />
          <select value={type} onChange={(e) => setType(e.target.value as Item['type'])}>
            <option value="move">move</option>
            <option value="concept">concept</option>
          </select>
          <button type="submit">Add</button>
        </form>
      </section>

      {node.kind === 'support' && (
        <button
          className="danger"
          onClick={() => {
            if (window.confirm(`Remove ${node.name} from your map?`)) removeStyle(node.id)
          }}
        >
          Remove this style
        </button>
      )}
    </aside>
  )
}
