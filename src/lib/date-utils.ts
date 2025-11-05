export function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === "number") {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value === "string") {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

export function compareDateValues(a: unknown, b: unknown): number {
  const da = toDate(a)
  const db = toDate(b)
  if (!da && !db) return 0
  if (!da) return -1
  if (!db) return 1
  return da.getTime() - db.getTime()
}

export function isBetween(date: unknown, from?: unknown, to?: unknown): boolean {
  const value = toDate(date)
  const fromDate = toDate(from ?? null)
  const toDateValue = toDate(to ?? null)
  if (!value) return false
  if (fromDate && value.getTime() < fromDate.getTime()) return false
  if (toDateValue && value.getTime() > toDateValue.getTime()) return false
  return true
}

export function isSameDay(a: unknown, b: unknown): boolean {
  const da = toDate(a)
  const db = toDate(b)
  if (!da || !db) return false
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}
