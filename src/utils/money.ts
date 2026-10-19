// Calculate in cents so an exact €25 basket always qualifies for the target.
export function toCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100)
}

export function roundMoney(amount: number): number {
  return toCents(amount) / 100
}

export function defaultDiscount(target: number): number {
  return Number.isFinite(target) && target > 0 ? Math.floor(toCents(target) / 2500) * 5 : 0
}
