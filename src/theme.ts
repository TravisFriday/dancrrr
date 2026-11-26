import { useEffect, useState } from 'react'

export interface Palette {
  paper: string
  card: string
  ink: string
  ink2: string
  ink3: string
  line: string
  focus: string[]
}

const read = (): Palette => {
  const cs = getComputedStyle(document.documentElement)
  const v = (n: string) => cs.getPropertyValue(n).trim()
  return {
    paper: v('--paper'),
    card: v('--card'),
    ink: v('--ink'),
    ink2: v('--ink-2'),
    ink3: v('--ink-3'),
    line: v('--line'),
    focus: [1, 2, 3, 4, 5].map((i) => v(`--f${i}`)),
  }
}

/** Colours for the canvas, read from the CSS tokens so the graph follows light and dark mode. */
export function usePalette(): Palette {
  const [p, setP] = useState(read)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => setP(read())
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return p
}

/** Becomes true once the web fonts have loaded, so canvas labels can redraw in them. */
export function useFontsReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    document.fonts?.ready.then(() => setReady(true))
  }, [])
  return ready
}

export const focusColor = (p: Palette, index: number) => p.focus[index % p.focus.length]

export const withAlpha = (hex: string, a: number) => {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export const LEVEL_WORDS = ['', 'New to it', 'Getting there', 'Comfortable', 'Solid', 'Nailed it']
