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

export function getUnitPriceId(): string {
  const id = process.env.STRIPE_PRICE_UNIT
  if (!id) throw new Error('STRIPE_PRICE_UNIT is not set')
  return id
}
