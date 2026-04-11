'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Globe, KeyRound, DollarSign, ArrowUpDown } from 'lucide-react'

interface UsageData {
  tier: string
  monthlyAmount: number
  status: string
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  limits: { sites: number; keywords: number }
  usage: { sites: number; keywords: number }
}

const TIER_INFO = [
  { min: 1, max: 74, label: 'Starter', sites: 1, keywords: 50, features: ['1 sitio web', '50 keywords', 'Auditorias SEO basicas', 'Monitoreo de rankings', 'Alertas por email'] },
  { min: 75, max: 174, label: 'Pro', sites: 5, keywords: 250, features: ['5 sitios web', '250 keywords', 'Auditorias con Claude Opus', 'Content Studio completo', 'Analisis de competidores'] },
  { min: 175, max: 10000, label: 'Agency', sites: 20, keywords: 1000, features: ['20 sitios web', '1,000 keywords', 'Contenido ilimitado', 'Multi-CMS', 'Soporte prioritario'] },
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
  const [amount, setAmount] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [updateLoading, setUpdateLoading] = useState(false)
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
      .then((d: UsageData) => {
        setData(d)
        if (d.monthlyAmount > 0) setAmount(String(d.monthlyAmount))
      })
      .catch(() => setData({ tier: 'Gratis', monthlyAmount: 0, status: 'inactive', limits: { sites: 1, keywords: 10 }, usage: { sites: 0, keywords: 0 } }))
      .finally(() => setLoading(false))
  }, [])

  const parsedAmount = Math.round(Number(amount) || 0)
  const currentTier = TIER_INFO.find(t => parsedAmount >= t.min && parsedAmount <= t.max)

  async function handleCheckout() {
    if (parsedAmount < 1) return
    setCheckoutLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parsedAmount }),
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
      setCheckoutLoading(false)
    }
  }

  async function handleUpdateAmount() {
    if (parsedAmount < 1 || parsedAmount === data?.monthlyAmount) return
    setUpdateLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/stripe/update-amount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parsedAmount }),
      })
      const json = await res.json()
      if (json.monthlyAmount) {
        setData(prev => prev ? { ...prev, monthlyAmount: json.monthlyAmount } : prev)
        setMessage({ type: 'success', text: `Monto actualizado a $${json.monthlyAmount}/mes. Aplica en el proximo ciclo de cobro.` })
      } else {
        setMessage({ type: 'error', text: json.error || 'Error al actualizar' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexion' })
    } finally {
      setUpdateLoading(false)
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

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Facturacion" description="Gestiona tu suscripcion mensual de Solis SEO" />

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
                {isActive && (
                  <>
                    <span className="text-sm font-medium">{data?.tier}</span>
                    <span className="text-lg font-bold">${data?.monthlyAmount}/mes</span>
                  </>
                )}
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

      {/* Amount input + subscribe/update */}
      {!loading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-5 w-5" />
              {isActive ? 'Cambiar monto mensual' : 'Suscribirse'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">$</span>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="150"
                  className="h-12 w-40 rounded-md border bg-background pl-8 pr-3 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <span className="text-lg text-muted-foreground">/mes</span>

              {isActive ? (
                <Button
                  onClick={handleUpdateAmount}
                  disabled={updateLoading || parsedAmount < 1 || parsedAmount === data?.monthlyAmount}
                  className="gap-2"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  {updateLoading ? 'Actualizando...' : 'Actualizar monto'}
                </Button>
              ) : (
                <Button
                  onClick={handleCheckout}
                  disabled={checkoutLoading || parsedAmount < 1}
                  size="lg"
                >
                  {checkoutLoading ? 'Procesando...' : 'Suscribirse'}
                </Button>
              )}
            </div>

            {parsedAmount > 0 && currentTier && (
              <div className="rounded-md border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline">{currentTier.label}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {currentTier.sites} sitio{currentTier.sites > 1 ? 's' : ''} + {currentTier.keywords.toLocaleString()} keywords
                  </span>
                </div>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {currentTier.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-3.5 w-3.5 shrink-0 text-green-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isActive && parsedAmount !== data?.monthlyAmount && parsedAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                El nuevo monto aplica a partir del proximo ciclo de cobro. No se hacen cobros prorrateados.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tier reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Niveles de servicio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {TIER_INFO.map(tier => (
              <div key={tier.label} className="rounded-md border p-4 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">{tier.label}</span>
                  <span className="text-sm text-muted-foreground">${tier.min}–${tier.max}/mes</span>
                </div>
                <ul className="space-y-1">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 shrink-0 text-green-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
