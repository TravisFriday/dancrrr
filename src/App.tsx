import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Graph from './Graph'
import DetailPanel from './DetailPanel'
import AddStyle from './AddStyle'
import { progress, useDanceMap } from './store'
import { focusColor, usePalette } from './theme'

export default function App() {
  const store = useDanceMap()
  const { map } = store
  const pal = usePalette()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusFilter, setFocusFilter] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [menu, setMenu] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const selected = map.nodes.find((n) => n.id === selectedId) ?? null
  const focus = map.nodes.filter((n) => n.kind === 'focus')
  const colorOf = (id: string) => focusColor(pal, Math.max(focus.findIndex((f) => f.id === id), 0))
  const colorForNode = (id: string) => {
    const n = map.nodes.find((x) => x.id === id)
    if (!n || n.kind === 'focus') return colorOf(id)
    const t = map.links.filter((l) => l.from === id)
    return t.length === 1 ? colorOf(t[0].to) : pal.ink
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (setSelectedId(null), setMenu(false), setAdding(false))
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
    <div className={`app ${selected ? 'has-panel' : ''}`}>
      <header className="top">
        <h1 className="wordmark" aria-label="dancrrr">
          danc
          {['r', 'r', 'r'].map((r, i) => (
            <span key={i} style={{ color: focusColor(pal, i) }}>{r}</span>
          ))}
        </h1>

        <nav className="tabs" aria-label="Focus styles">
          <button className={!focusFilter ? 'tab on' : 'tab'} onClick={() => setFocusFilter(null)}>
            Everything
          </button>
          {focus.map((f) => {
            const p = progress(f)
            return (
              <button
                key={f.id}
                className={focusFilter === f.id ? 'tab on' : 'tab'}
                style={{ '--c': colorOf(f.id) } as CSSProperties}
                onClick={() => {
                  setFocusFilter(focusFilter === f.id ? null : f.id)
                  setSelectedId(null)
                }}
              >
                <i className="dot" />
                {f.name}
                <span className="pct">{p == null ? '—' : `${Math.round(p * 100)}%`}</span>
              </button>
            )
          })}
        </nav>

        <div className="menu-wrap">
          <button className="round" onClick={() => setMenu(!menu)} aria-label="More" aria-expanded={menu}>
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden><circle cx="3" cy="8" r="1.4" fill="currentColor" /><circle cx="8" cy="8" r="1.4" fill="currentColor" /><circle cx="13" cy="8" r="1.4" fill="currentColor" /></svg>
          </button>
          {menu && (
            <>
              <div className="menu-scrim" onClick={() => setMenu(false)} />
              <div className="menu" onClick={() => setMenu(false)}>
                <button onClick={exportMap}>Save my map to a file</button>
                <button onClick={() => fileRef.current?.click()}>Load a map from a file</button>
                <hr />
                <button className="danger" onClick={() => window.confirm('Reset to the starter map? Your ratings will be lost.') && store.reset()}>
                  Reset to the starter map
                </button>
              </div>
            </>
          )}
        </div>
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
        {!selected && <p className="hint">Tap a style to open it</p>}
        <button className="fab" onClick={() => setAdding(true)}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          Add style
        </button>
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
