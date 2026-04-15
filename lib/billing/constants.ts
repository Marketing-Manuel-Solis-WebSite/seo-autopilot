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

/**
 * Fixed operational costs billed monthly.
 * These are platform costs independent of API usage.
 */
export const FIXED_COSTS = [
  {
    id: 'semrush',
    label: 'Semrush — Plataforma SEO',
    description: 'Suite completa de herramientas SEO: auditorias, keywords, backlinks, competencia',
    monthlyCostUsd: 500,
  },
  {
    id: 'infrastructure',
    label: 'Infraestructura Cloud',
    description: 'Servidores, base de datos, CDN, almacenamiento y procesamiento',
    monthlyCostUsd: 85,
  },
  {
    id: 'monitoring',
    label: 'Monitoreo y Automatizacion',
    description: 'Cron jobs, colas de trabajo, cache Redis, alertas en tiempo real',
    monthlyCostUsd: 35,
  },
] as const

/** Total fixed costs per month */
export const TOTAL_FIXED_COSTS_USD = FIXED_COSTS.reduce((sum, c) => sum + c.monthlyCostUsd, 0)

/** Variable API cost labels (Claude, DataForSEO) tracked per-call */
export const VARIABLE_COST_LABELS: Record<string, string> = {
  'claude-opus': 'Claude Opus — Analisis profundo IA',
  'claude-sonnet': 'Claude Sonnet — Monitoreo y fixes IA',
  'dataforseo': 'DataForSEO — SERP y datos de keywords',
}
