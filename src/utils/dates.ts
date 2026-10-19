import type { HistoryEntry } from '../types'

export function localDateInput(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function historyPurchaseDate(entry: HistoryEntry): Date {
  // Shopping dates are local calendar dates, not UTC timestamps.
  return entry.targetDate ? new Date(`${entry.targetDate}T12:00:00`) : new Date(entry.date)
}
