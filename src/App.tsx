import { useRef, useState } from 'react'
import Graph from './Graph'
import DetailPanel from './DetailPanel'
import AddStyle from './AddStyle'
import { useDanceMap } from './store'

export default function App() {
  const store = useDanceMap()
  const { map } = store
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusFilter, setFocusFilter] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [menu, setMenu] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const selected = map.nodes.find((n) => n.id === selectedId) ?? null
  const focus = map.nodes.filter((n) => n.kind === 'focus')

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
        <h1>dancrrr</h1>
        <nav className="chips" aria-label="Filter by focus style">
          <button className={!focusFilter ? 'chip on' : 'chip'} onClick={() => setFocusFilter(null)}>All</button>
          {focus.map((f) => (
            <button key={f.id} className={focusFilter === f.id ? 'chip on' : 'chip'} onClick={() => setFocusFilter(focusFilter === f.id ? null : f.id)}>
              {f.name}
            </button>
          ))}
        </nav>
        <div className="menu-wrap">
          <button className="icon" onClick={() => setMenu(!menu)} aria-label="Menu">⋯</button>
          {menu && (
            <div className="menu" onClick={() => setMenu(false)}>
              <button onClick={() => setAdding(true)}>Add a style</button>
              <button onClick={exportMap}>Save map to a file</button>
              <button onClick={() => fileRef.current?.click()}>Load map from a file</button>
              <button onClick={() => window.confirm('Reset to the starter map? Your ratings will be lost.') && store.reset()}>Reset to starter map</button>
            </div>
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
        {!selected && <p className="hint">Tap a style to see its moves and track your progress</p>}
      </main>

      {selected && (
        <DetailPanel
          map={map}
          node={selected}
          onClose={() => setSelectedId(null)}
          onSelect={setSelectedId}
          setLevel={store.setLevel}
          addItem={store.addItem}
          removeItem={store.removeItem}
          removeStyle={(id) => { store.removeStyle(id); setSelectedId(null) }}
        />
      )}

      {adding && (
        <AddStyle
          map={map}
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
