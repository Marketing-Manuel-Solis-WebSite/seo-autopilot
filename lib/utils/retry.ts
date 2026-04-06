const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 529])

export interface RetryOptions {
  maxAttempts: number
  baseDelayMs: number
  label: string
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { maxAttempts, baseDelayMs, label } = options

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const isLast = attempt === maxAttempts - 1
      if (isLast || !isRetryableError(error)) {
        throw new Error(
          `[${label}] Failed after ${attempt + 1} attempt(s): ${error instanceof Error ? error.message : String(error)}`,
        )
      }
      const delay = baseDelayMs * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  // Unreachable, but TypeScript needs it
  throw new Error(`[${label}] Exhausted retries`)
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  // Anthropic SDK errors expose a `status` property
  const status = (error as { status?: number }).status
  if (status && RETRYABLE_STATUS_CODES.has(status)) return true

  // Match status codes embedded in error messages (e.g. "SEMrush API error: 503")
  const match = error.message.match(/\b(429|500|502|503|529)\b/)
  if (match) return true

  // Network-level failures are retryable
  if (error.message.includes('fetch failed') || error.message.includes('ECONNRESET')) {
    return true
  }

  return false
}
