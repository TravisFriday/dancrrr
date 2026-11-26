export type ItemType = 'move' | 'concept'

export interface Item {
  id: string
  name: string
  type: ItemType
  level: number // 1 to 5
}

export interface StyleNode {
  id: string
  name: string
  kind: 'focus' | 'support'
  /** Set when this style is one of the styles a focus style is made of (e.g. Pantsula in Amapiano). */
  parent?: string
  about: string
  items: Item[]
}

export interface Link {
  from: string
  to: string
  builds: string
  why: string
}

export interface DanceMap {
  version: number
  nodes: StyleNode[]
  links: Link[]
}
