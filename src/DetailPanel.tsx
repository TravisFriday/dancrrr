import { useState, type CSSProperties } from 'react'
import type { DanceMap, Item, Link, StyleNode } from './types'
import { progress } from './store'
import { LEVEL_WORDS } from './theme'
import { ChipSet, Divider, FilterChip, Icon, IconButton, LinearProgress, List, ListItem, Slider, Switch, TextButton, TextField, TonalButton } from './md'

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

const val = (e: Event) => (e.target as HTMLInputElement).value

export default function DetailPanel(props: Props) {
  const { map, node, color, colorOf, onClose, onSelect, setLevel, addItem, removeItem, removeStyle, setConnected, updateLink } = props
  const [draft, setDraft] = useState('')
  const [type, setType] = useState<Item['type']>('move')
  const focus = node.kind === 'focus'
  const p = progress(node)
  const nameOf = (id: string) => map.nodes.find((n) => n.id === id)?.name ?? id
  const focusStyles = map.nodes.filter((n) => n.kind === 'focus')
  const feeders = map.links.filter((l) => l.to === node.id)

  const submit = () => {
    if (!draft.trim()) return
    addItem(node.id, draft.trim(), type)
    setDraft('')
  }

  return (
    <aside className="sheet" style={{ '--c': color } as CSSProperties} aria-label={`${node.name} details`}>
      <button className="drag-handle" onClick={onClose} aria-label="Close" />
      <header className="sheet-header">
        <div className="sheet-title">
          <span className="overline">
            <span className="swatch" />
            {focus ? 'Focus style' : 'Supporting style'}
          </span>
          <h2 className="headline-small">{node.name}</h2>
        </div>
        <IconButton onClick={onClose} aria-label="Close">
          <Icon>close</Icon>
        </IconButton>
      </header>

      <div className="progress-block">
        <LinearProgress value={p ?? 0} />
        <p className="body-medium muted">
          {p == null ? 'No moves yet. Add one below to start tracking.' : `${Math.round(p * 100)}% across ${node.items.length} ${node.items.length === 1 ? 'move' : 'moves'}`}
        </p>
      </div>

      {node.about && <p className="body-large about">{node.about}</p>}

      {focus ? (
        <section>
          <h3 className="title-small section-title">Styles that help</h3>
          {feeders.length === 0 ? (
            <p className="body-medium muted pad">Nothing connected yet. Open a supporting style to connect it.</p>
          ) : (
            <List>
              {feeders.map((l) => (
                <ListItem key={l.from} type="button" onClick={() => onSelect(l.from)}>
                  <span slot="start" className="avatar neutral">{nameOf(l.from).slice(0, 1)}</span>
                  <div slot="headline">{nameOf(l.from)}</div>
                  {(l.builds || l.why) && <div slot="supporting-text">{[l.builds, l.why].filter(Boolean).join(' · ')}</div>}
                  <Icon slot="end">chevron_right</Icon>
                </ListItem>
              ))}
            </List>
          )}
        </section>
      ) : (
        <section>
          <h3 className="title-small section-title">Connected to</h3>
          <div className="connections">
            {focusStyles.map((f, fi) => {
              const link = map.links.find((l) => l.from === node.id && l.to === f.id)
              return (
                <div key={f.id} className={link ? 'connection on' : 'connection'} style={{ '--fc': colorOf(f.id), '--on-fc': `var(--on-focus-${(fi % 5) + 1})` } as CSSProperties}>
                  <label className="connection-row">
                    <span className="avatar">{f.name.slice(0, 1)}</span>
                    <span className="body-large grow">{f.name}</span>
                    <Switch
                      selected={!!link}
                      onChange={(e) => setConnected(node.id, f.id, (e.target as HTMLInputElement & { selected: boolean }).selected)}
                      aria-label={`Connect ${node.name} to ${f.name}`}
                    />
                  </label>
                  {link && (
                    <div className="connection-fields">
                      <TextField label="What it builds" placeholder="e.g. footwork" value={link.builds} onInput={(e) => updateLink(node.id, f.id, { builds: val(e) })} />
                      <TextField label="Why it helps" value={link.why} onInput={(e) => updateLink(node.id, f.id, { why: val(e) })} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section>
        <h3 className="title-small section-title">Moves and concepts</h3>
        {node.items.length === 0 && <p className="body-medium muted pad">What do you want to take from {node.name}? Add it below and rate yourself.</p>}
        <div className="moves">
          {node.items.map((i) => (
            <div className="move-card" key={i.id}>
              <div className="move-head">
                <div className="grow">
                  <div className="title-medium">{i.name}</div>
                  <div className="body-small muted">
                    {i.type === 'move' ? 'Move' : 'Concept'} · {i.level} of 5, {LEVEL_WORDS[i.level].toLowerCase()}
                  </div>
                </div>
                <IconButton onClick={() => removeItem(node.id, i.id)} aria-label={`Remove ${i.name}`}>
                  <Icon>delete</Icon>
                </IconButton>
              </div>
              <Slider
                min={1}
                max={5}
                step={1}
                ticks
                labeled
                value={i.level}
                onInput={(e) => setLevel(node.id, i.id, Number(val(e)))}
                aria-label={`How good you are at ${i.name}`}
              />
            </div>
          ))}
        </div>

        <form
          className="add-move"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <TextField
            label={type === 'move' ? 'Add a move' : 'Add a concept'}
            value={draft}
            onInput={(e) => setDraft(val(e))}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), submit())}
          />
          <div className="add-move-row">
            <ChipSet>
              <FilterChip label="Move" selected={type === 'move'} onClick={(e) => (e.preventDefault(), setType('move'))} />
              <FilterChip label="Concept" selected={type === 'concept'} onClick={(e) => (e.preventDefault(), setType('concept'))} />
            </ChipSet>
            <TonalButton onClick={submit} disabled={!draft.trim()}>
              <Icon slot="icon">add</Icon>
              Add
            </TonalButton>
          </div>
        </form>
      </section>

      {!focus && (
        <>
          <Divider />
          <TextButton
            className="danger"
            onClick={() => {
              if (window.confirm(`Remove ${node.name} from your map?`)) removeStyle(node.id)
            }}
          >
            <Icon slot="icon">delete</Icon>
            Remove {node.name}
          </TextButton>
        </>
      )}
    </aside>
  )
}
