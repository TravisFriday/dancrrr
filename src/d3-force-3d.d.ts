declare module 'd3-force-3d' {
  // Only the piece we use.
  export function forceCollide<N>(radius?: number | ((node: N) => number)): unknown
}
