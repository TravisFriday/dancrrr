import { useEffect, useState } from 'react'

export interface Palette {
  surface: string
  container: string
  containerHigh: string
  onSurface: string
  onSurfaceVariant: string
  outline: string
  outlineVariant: string
  focus: string[]
  onFocus: string[]
  onFocusContainer: string[]
}

const read = (): Palette => {
  const cs = getComputedStyle(document.documentElement)
  const v = (n: string) => cs.getPropertyValue(n).trim()
  const sys = (n: string) => v(`--md-sys-color-${n}`)
  return {
    surface: sys('surface'),
    container: sys('surface-container-low'),
    containerHigh: sys('surface-container-highest'),
    onSurface: sys('on-surface'),
    onSurfaceVariant: sys('on-surface-variant'),
    outline: sys('outline'),
    outlineVariant: sys('outline-variant'),
    focus: [1, 2, 3, 4, 5].map((i) => v(`--focus-${i}`)),
    onFocus: [1, 2, 3, 4, 5].map((i) => v(`--on-focus-${i}`)),
    onFocusContainer: [1, 2, 3, 4, 5].map((i) => v(`--on-focus-${i}-container`)),
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
export const onFocusColor = (p: Palette, index: number) => p.onFocus[index % p.onFocus.length]

export const withAlpha = (hex: string, a: number) => {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export const LEVEL_WORDS = ['', 'New to it', 'Getting there', 'Comfortable', 'Solid', 'Nailed it']
