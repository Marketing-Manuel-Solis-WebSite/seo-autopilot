/** Fixed monthly subscription amount in USD */
export const MONTHLY_AMOUNT_USD = 700

/** Fixed monthly subscription amount in cents */
export const MONTHLY_AMOUNT_CENTS = 70000

/**
 * Quantity to use with the $1/unit Stripe price.
 * 700 units × $1 = $700/month.
 */
export const SUBSCRIPTION_QUANTITY = 700

/** Human-readable labels for API providers (informational cost breakdown) */
export const PROVIDER_LABELS: Record<string, string> = {
  'claude-opus': 'Claude Opus — Analisis IA',
  'claude-sonnet': 'Claude Sonnet — Monitoreo IA',
  'dataforseo': 'DataForSEO — Datos SERP',
}
