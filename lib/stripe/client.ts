import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function stripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { typescript: true })
  }
  return _stripe
}

/**
 * Unit price ID — $1/unit/month recurring.
 * quantity = monthly amount in dollars (e.g. quantity=150 → $150/mo).
 */
export function getUnitPriceId(): string {
  const id = process.env.STRIPE_PRICE_UNIT
  if (!id) throw new Error('STRIPE_PRICE_UNIT is not set')
  return id
}

/** Derive resource limits from the monthly dollar amount. */
export function getLimitsForAmount(amount: number): { sites: number; keywords: number } {
  if (amount <= 0) return { sites: 1, keywords: 10 }
  if (amount < 75) return { sites: 1, keywords: 50 }
  if (amount < 175) return { sites: 5, keywords: 250 }
  return { sites: 20, keywords: 1000 }
}

/** Human-readable tier label based on amount. */
export function getTierLabel(amount: number): string {
  if (amount <= 0) return 'Gratis'
  if (amount < 75) return 'Starter'
  if (amount < 175) return 'Pro'
  return 'Agency'
}
