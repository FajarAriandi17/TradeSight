export function fmtPrice(v: number | null | undefined, precision = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return v.toLocaleString('en-US', { minimumFractionDigits: precision, maximumFractionDigits: precision })
}

export function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

export function fmtTime(unix: number): string {
  return new Date(unix * 1000).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
}
