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

export const PLANS = {
  starter: {
    name: 'Starter',
    description: '1 sitio, 50 keywords, auditorias basicas',
    priceId: process.env.STRIPE_PRICE_STARTER!,
    limits: { sites: 1, keywords: 50 },
    price: 49,
  },
  pro: {
    name: 'Pro',
    description: '5 sitios, 250 keywords, todas las funciones',
    priceId: process.env.STRIPE_PRICE_PRO!,
    limits: { sites: 5, keywords: 250 },
    price: 99,
  },
  agency: {
    name: 'Agency',
    description: '20 sitios, 1000 keywords, soporte prioritario',
    priceId: process.env.STRIPE_PRICE_AGENCY!,
    limits: { sites: 20, keywords: 1000 },
    price: 249,
  },
} as const

export type PlanKey = keyof typeof PLANS
