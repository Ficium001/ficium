// =============================================================
// Ficium 3 — Institution Portal Utils
// =============================================================

/**
 * Returns a human-readable relative time string.
 * e.g. "in 3 hours", "2 days ago"
 */
export function formatDistanceToNow(dateStr: string): string {
  const date = new Date(dateStr)
  const now  = new Date()
  const diff = date.getTime() - now.getTime()
  const abs  = Math.abs(diff)
  const past = diff < 0

  const minutes = Math.floor(abs / 60000)
  const hours   = Math.floor(abs / 3600000)
  const days    = Math.floor(abs / 86400000)

  let label: string
  if (minutes < 1)   label = 'just now'
  else if (minutes < 60) label = `${minutes}m`
  else if (hours < 24)   label = `${hours}h`
  else                   label = `${days}d`

  if (label === 'just now') return label
  return past ? `${label} ago` : `in ${label}`
}

/**
 * Format a rate (0.0875) to percentage string "8.75%"
 */
export function formatRate(rate: number | null | undefined): string {
  if (rate == null) return '—'
  return (rate * 100).toFixed(2) + '%'
}

/**
 * Format a MUR amount
 */
export function formatAmount(amount: number | null | undefined, currency = 'MUR'): string {
  if (amount == null) return '—'
  return `${currency} ${Number(amount).toLocaleString('en-MU')}`
}

/**
 * Truncate a UUID for display
 */
export function shortId(id: string): string {
  return id.slice(0, 8) + '…'
}
