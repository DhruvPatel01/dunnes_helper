export interface CatalogProduct {
  id?: number
  name: string
  category: string
  price: number
  purchaseCount: number
  lastUpdated: string
  lastPurchasedAt: string | null
}

export interface ListItem {
  productId: number
  name: string
  catalogPrice: number
  sessionPrice: number
  quantity: number
  checked: boolean
  unavailable: boolean
}

export interface ShoppingList {
  id: string
  name: string
  isInbox: boolean
  target: number | null
  discount: number
  items: ListItem[]
  createdAt: string
  targetDate: string
}

export interface HistoryItem {
  productId: number
  name: string
  price: number
  quantity: number
}

export interface HistoryEntry {
  id?: number
  date: string
  name: string
  target: number
  discount: number
  items: HistoryItem[]
  unavailableItems: Array<{ name: string }>
  totalSpent: number
}

export interface AppBackup {
  version: number
  exportedAt: string
  catalog: CatalogProduct[]
  history: HistoryEntry[]
  lists: ShoppingList[]
}

export type ViewType = 'lists' | 'catalog' | 'history'
export type StoreName = 'catalog' | 'history' | 'lists' | 'activeSession'
