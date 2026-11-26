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
