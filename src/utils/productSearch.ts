import MiniSearch from 'minisearch'
import type { CatalogProduct } from '../types'

export type ProductComparator = (a: CatalogProduct, b: CatalogProduct) => number

const alphabetical: ProductComparator = (a, b) => a.name.localeCompare(b.name)
const normalize = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ')

// Build once per catalog change, then reuse for every query and search box.
export function createProductSearch(products: readonly CatalogProduct[]) {
  const index = new MiniSearch<CatalogProduct>({
    fields: ['name', 'category'],
    processTerm: normalize,
    searchOptions: {
      combineWith: 'AND',
      boost: { name: 3, category: 1 },
      prefix: true,
      fuzzy: term => term.length >= 4 ? 0.2 : false,
      maxFuzzy: 1
    }
  })
  index.addAll(products)
  const byId = new Map(products.map(product => [product.id, product]))

  return (query: string, compare: ProductComparator = alphabetical): CatalogProduct[] => {
    const q = normalize(query)
    if (!q) return [...products].sort(compare)

    return index.search(q)
      .map(result => ({ product: byId.get(result.id)!, score: result.score }))
      .sort((a, b) =>
        Number(normalize(b.product.name) === q) - Number(normalize(a.product.name) === q) ||
        b.score - a.score || compare(a.product, b.product)
      )
      .map(result => result.product)
  }
}
