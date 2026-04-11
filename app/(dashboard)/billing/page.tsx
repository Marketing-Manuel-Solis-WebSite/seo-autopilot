'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Globe, KeyRound } from 'lucide-react'

interface UsageData {
  plan: string
  status: string
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  limits: { sites: number; keywords: number }
  usage: { sites: number; keywords: number }
}

const plans = [
  {
    key: 'starter',
    name: 'Starter',
    price: 49,
    description: 'Para proyectos individuales',
    features: [
      '1 sitio web',
      '50 keywords trackeadas',
      'Auditorias SEO basicas',
      'Monitoreo de rankings',
      'Alertas por email',
      'Generacion de contenido (5/mes)',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 99,
    popular: true,
    description: 'Para freelancers y equipos',
    features: [
      '5 sitios web',
      '250 keywords trackeadas',
      'Auditorias profundas con Claude Opus',
      'Monitoreo en tiempo real',
      'Content Studio completo',
      'Generacion de contenido (25/mes)',
      'Analisis de competidores',
      'A/B testing de meta tags',
    ],
  },
  {
    key: 'agency',
    name: 'Agency',
    price: 249,
    description: 'Para agencias SEO',
    features: [
      '20 sitios web',
      '1,000 keywords trackeadas',
      'Todas las funciones Pro',
      'Generacion de contenido ilimitada',
      'Publicacion multi-CMS',
      'Local SEO avanzado',
      'Reportes white-label',
      'Soporte prioritario',
    ],
  },
]

function UsageBar({ label, icon: Icon, current, limit }: { label: string; icon: React.ElementType; current: number; limit: number }) {
  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {label}
        </span>
        <span className="text-muted-foreground">{current} / {limit}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function BillingPage() {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('status') === 'success') {
      setMessage({ type: 'success', text: 'Suscripcion activada exitosamente.' })
    } else if (params.get('status') === 'cancelled') {
      setMessage({ type: 'error', text: 'Pago cancelado.' })
    }

    fetch('/api/stripe/usage')
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({ plan: 'free', status: 'inactive', limits: { sites: 1, keywords: 10 }, usage: { sites: 0, keywords: 0 } }))
      .finally(() => setLoading(false))
  }, [])

  async function handleCheckout(plan: string) {
    setCheckoutLoading(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const json = await res.json()
      if (json.url) {
        window.location.href = json.url
      } else {
        setMessage({ type: 'error', text: json.error || 'Error al iniciar el pago' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexion' })
    } finally {
      setCheckoutLoading(null)
    }
  }

  async function handlePortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const json = await res.json()
      if (json.url) {
        window.location.href = json.url
      } else {
        setMessage({ type: 'error', text: json.error || 'Error al abrir portal' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexion' })
    } finally {
      setPortalLoading(false)
    }
  }

  const isActive = data?.status === 'active'
  const currentPlan = data?.plan || 'free'

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Facturacion" description="Gestiona tu suscripcion y plan de Solis SEO" />

      {message && (
        <div className={`rounded-md p-3 text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
          {message.text}
        </div>
      )}

      {/* Usage + Subscription status */}
      {!loading && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Uso actual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <UsageBar label="Sitios" icon={Globe} current={data?.usage.sites ?? 0} limit={data?.limits.sites ?? 1} />
              <UsageBar label="Keywords" icon={KeyRound} current={data?.usage.keywords ?? 0} limit={data?.limits.keywords ?? 10} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Suscripcion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge variant="default" className={isActive ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-400'}>
                  {isActive ? 'Activa' : data?.status === 'past_due' ? 'Pago pendiente' : 'Inactiva'}
                </Badge>
                <span className="text-sm font-medium capitalize">{currentPlan === 'free' ? 'Sin plan' : currentPlan}</span>
                {data?.cancelAtPeriodEnd && (
                  <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                    Se cancela al final del periodo
                  </Badge>
                )}
              </div>
              {data?.currentPeriodEnd && (
                <p className="text-xs text-muted-foreground">
                  Proximo cobro: {new Date(data.currentPeriodEnd).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
              {isActive && (
                <Button variant="outline" size="sm" onClick={handlePortal} disabled={portalLoading}>
                  {portalLoading ? 'Abriendo...' : 'Gestionar suscripcion'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pricing cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map(plan => {
          const isCurrent = isActive && currentPlan === plan.key
          return (
            <Card key={plan.key} className={`relative ${plan.popular ? 'border-primary shadow-md' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Mas popular</Badge>
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">${plan.price}</span>
                  <span className="text-sm text-muted-foreground">/mes</span>
                </div>

                <ul className="space-y-2">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button className="w-full" variant="outline" disabled>
                    Plan actual
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    disabled={checkoutLoading === plan.key || loading}
                    onClick={() => isActive ? handlePortal() : handleCheckout(plan.key)}
                  >
                    {checkoutLoading === plan.key
                      ? 'Procesando...'
                      : isActive
                        ? 'Cambiar plan'
                        : 'Suscribirse'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* API costs breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Costos de APIs incluidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: 'Claude AI (Opus + Sonnet)', desc: 'Analisis, auditorias, contenido' },
              { name: 'DataForSEO', desc: 'SERP, keywords, backlinks' },
              { name: 'Google Search Console', desc: 'Rankings y analytics' },
              { name: 'Upstash Redis + QStash', desc: 'Cache y jobs programados' },
              { name: 'Resend', desc: 'Alertas por email' },
              { name: 'Supabase', desc: 'Base de datos PostgreSQL' },
            ].map(api => (
              <div key={api.name} className="flex items-start gap-2 rounded-md border p-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                <div>
                  <p className="text-sm font-medium">{api.name}</p>
                  <p className="text-xs text-muted-foreground">{api.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
