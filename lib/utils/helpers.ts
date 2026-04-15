export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

export function rankChangeIndicator(change: number): { label: string; className: string } {
  if (change > 0) return { label: `+${change}`, className: 'text-green-500' }
  if (change < 0) return { label: `${change}`, className: 'text-red-500' }
  return { label: '=', className: 'text-muted-foreground' }
}

export function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20'
    case 'warning': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
    case 'info': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    default: return 'bg-muted text-muted-foreground'
  }
}

/**
 * Safely parse JSON from Claude API responses.
 * Strips markdown code fences and handles edge cases.
 */
export function safeParseJSON<T>(raw: string, label: string): T {
  // Remove markdown code fences (```json ... ``` or ``` ... ```)
  let cleaned = raw.trim()
  // Handle opening fences: ```json, ```JSON, ```
  cleaned = cleaned.replace(/^```(?:json|JSON)?\s*\n?/, '')
  // Handle closing fences
  cleaned = cleaned.replace(/\n?\s*```\s*$/, '')
  cleaned = cleaned.trim()

  // If still starts/ends with fences (edge case with nested blocks), strip again
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json|JSON)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '').trim()
  }

  try {
    return JSON.parse(cleaned) as T
  } catch (e) {
    const preview = cleaned.slice(0, 300)
    throw new Error(
      `[${label}] Failed to parse JSON response. Preview: "${preview}..." — Error: ${e instanceof Error ? e.message : String(e)}`,
    )
  }
}

/**
 * Calculate word count from HTML body, stripping tags first.
 */
export function countWordsInHTML(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return text ? text.split(' ').length : 0
}
