import { useEffect, useRef, useState } from 'react'
import Graph from './Graph'
import DetailPanel from './DetailPanel'
import AddStyle from './AddStyle'
import { progress, useDanceMap } from './store'
import { focusColor, usePalette } from './theme'
import { ChipSet, Divider, Fab, FilterChip, Icon, IconButton, Menu, MenuItem } from './md'

export default function App() {
  const store = useDanceMap()
  const { map } = store
  const pal = usePalette()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusFilter, setFocusFilter] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const selected = map.nodes.find((n) => n.id === selectedId) ?? null
  const focus = map.nodes.filter((n) => n.kind === 'focus')
  const colorOf = (id: string) => focusColor(pal, Math.max(focus.findIndex((f) => f.id === id), 0))
  const colorForNode = (id: string) => {
    const n = map.nodes.find((x) => x.id === id)
    if (!n || n.kind === 'focus') return colorOf(id)
    const t = map.links.filter((l) => l.from === id)
    return t.length === 1 ? colorOf(t[0].to) : pal.outline
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelectedId(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const exportMap = () => {
    const blob = new Blob([JSON.stringify(map, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'dancrrr-map.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className={`app ${selected ? 'has-sheet' : ''}`}>
      <header className="top-app-bar">
        <div className="app-bar-row">
          <span className="logo" aria-hidden>
            <Icon>graph_3</Icon>
          </span>
          <h1 className="title-large grow">dancrrr</h1>
          <span style={{ position: 'relative' }}>
            <IconButton id="menu-anchor" aria-label="More options" onClick={() => setMenuOpen(!menuOpen)}>
              <Icon>more_vert</Icon>
            </IconButton>
            <Menu anchor="menu-anchor" positioning="popover" open={menuOpen} onClosed={() => setMenuOpen(false)}>
              <MenuItem onClick={exportMap}>
                <Icon slot="start">download</Icon>
                <div slot="headline">Save map to a file</div>
              </MenuItem>
              <MenuItem onClick={() => fileRef.current?.click()}>
                <Icon slot="start">upload</Icon>
                <div slot="headline">Load map from a file</div>
              </MenuItem>
              <Divider role="separator" />
              <MenuItem onClick={() => window.confirm('Reset to the starter map? Your ratings will be lost.') && store.reset()}>
                <Icon slot="start">restart_alt</Icon>
                <div slot="headline">Reset to starter map</div>
              </MenuItem>
            </Menu>
          </span>
        </div>
        <ChipSet className="filters" aria-label="Show one focus style">
          {focus.map((f, i) => {
            const p = progress(f)
            return (
              <FilterChip
                key={f.id}
                className={`focus-chip f${(i % 5) + 1}`}
                label={`${f.name}  ${p == null ? '–' : Math.round(p * 100) + '%'}`}
                selected={focusFilter === f.id}
                onClick={(e) => {
                  e.preventDefault()
                  setFocusFilter(focusFilter === f.id ? null : f.id)
                  setSelectedId(null)
                }}
              />
            )
          })}
        </ChipSet>
        <input
          ref={fileRef} type="file" accept="application/json" hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            try {
              if (!store.replace(JSON.parse(await f.text()))) alert('That file is not a dancrrr map.')
            } catch {
              alert('Could not read that file.')
            }
            e.target.value = ''
          }}
        />
      </header>

      <main className="stage">
        <Graph map={map} selectedId={selectedId} focusFilter={focusFilter} onSelect={setSelectedId} />
        <Fab className="fab" variant="primary" label="Add style" onClick={() => setAdding(true)}>
          <Icon slot="icon">add</Icon>
        </Fab>
      </main>

      {selected && (
        <DetailPanel
          key={selected.id}
          map={map}
          node={selected}
          color={colorForNode(selected.id)}
          colorOf={colorOf}
          onClose={() => setSelectedId(null)}
          onSelect={setSelectedId}
          setLevel={store.setLevel}
          addItem={store.addItem}
          removeItem={store.removeItem}
          removeStyle={(id) => {
            store.removeStyle(id)
            setSelectedId(null)
          }}
          setConnected={store.setConnected}
          updateLink={store.updateLink}
        />
      )}

      {adding && (
        <AddStyle
          map={map}
          colorOf={colorOf}
          onClose={() => setAdding(false)}
          onAdd={(name, about, links) => {
            const id = store.addStyle(name, about, links)
            setAdding(false)
            setSelectedId(id)
          }}
        />
      )}
    </div>
  )
}
