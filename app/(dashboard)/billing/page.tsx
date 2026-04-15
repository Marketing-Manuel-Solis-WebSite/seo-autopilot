'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  Settings,
  XCircle,
  RotateCcw,
  DollarSign,
  TrendingUp,
  Server,
  Bot,
  BarChart3,
} from 'lucide-react'

interface BillingData {
  status: string
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  monthlyAmount?: number
}

interface FixedCostItem {
  id: string
  label: string
  description: string
  costUsd: number
}

interface VariableCostItem {
  provider: string
  label: string
  costUsd: number
}

interface MonthCost {
  month: string
  fixedCosts: FixedCostItem[]
  fixedTotalUsd: number
  variableCosts: VariableCostItem[]
  variableTotalUsd: number
  totalOperationalUsd: number
  subscriptionUsd: number
}

interface CostsData {
  months: MonthCost[]
  fixedCosts: FixedCostItem[]
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-')
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long' })
}

function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
}

const COST_ICONS: Record<string, typeof DollarSign> = {
  semrush: BarChart3,
  infrastructure: Server,
  monitoring: Bot,
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null)
  const [costs, setCosts] = useState<CostsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [costsLoading, setCostsLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('status') === 'success') {
      setMessage({ type: 'success', text: 'Pago configurado correctamente.' })
    } else if (params.get('status') === 'cancelled') {
      setMessage({ type: 'error', text: 'Configuracion cancelada.' })
    }

    fetch('/api/stripe/usage')
      .then(r => r.json())
      .then((d: BillingData) => setData(d))
      .catch(() => setData({ status: 'inactive' }))
      .finally(() => setLoading(false))

    fetch('/api/stripe/costs')
      .then(r => r.json())
      .then((d: CostsData) => setCosts(d))
      .catch(() => setCosts({ months: [], fixedCosts: [] }))
      .finally(() => setCostsLoading(false))
  }, [])

  async function handleSetupCard() {
    setCheckoutLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      if (json.url) {
        window.location.href = json.url
      } else {
        setMessage({ type: 'error', text: json.error || 'Error al configurar pago' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexion' })
    } finally {
      setCheckoutLoading(false)
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

  async function handleCancel() {
    const willCancel = !data?.cancelAtPeriodEnd
    if (willCancel && !confirm('Se cancelara tu suscripcion al final del periodo actual. Puedes reactivarla en cualquier momento antes de esa fecha.')) {
      return
    }
    setCancelLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/stripe/cancel', { method: 'POST' })
      const json = await res.json()
      if (res.ok) {
        setData(prev => prev ? { ...prev, cancelAtPeriodEnd: json.cancelAtPeriodEnd } : prev)
        setMessage({
          type: json.cancelAtPeriodEnd ? 'error' : 'success',
          text: json.cancelAtPeriodEnd
            ? 'Suscripcion programada para cancelarse al final del periodo.'
            : 'Suscripcion reactivada correctamente.',
        })
      } else {
        setMessage({ type: 'error', text: json.error || 'Error al procesar' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexion' })
    } finally {
      setCancelLoading(false)
    }
  }

  const isActive = data?.status === 'active'
  const isPastDue = data?.status === 'past_due'

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Facturacion" description="Suscripcion, costos operativos y desglose mensual" />

      {message && (
        <div className={`rounded-md p-3 text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
          {message.text}
        </div>
      )}

      {/* ── SUSCRIPCION ── */}
      {!loading && data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-5 w-5" />
              Suscripcion mensual — $700 USD
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isActive || isPastDue ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {data.cancelAtPeriodEnd ? (
                      <Badge className="bg-yellow-500/10 text-yellow-500">Se cancela al final del periodo</Badge>
                    ) : isPastDue ? (
                      <Badge className="bg-red-500/10 text-red-500">Pago pendiente</Badge>
                    ) : (
                      <Badge className="bg-green-500/10 text-green-500">Activa</Badge>
                    )}
                    {data.currentPeriodEnd && (
                      <span className="text-sm text-muted-foreground">
                        {data.cancelAtPeriodEnd ? 'Activa hasta:' : 'Proximo cobro:'}{' '}
                        {new Date(data.currentPeriodEnd).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={handlePortal} disabled={portalLoading}>
                    <Settings className="mr-2 h-4 w-4" />
                    {portalLoading ? 'Abriendo...' : 'Cambiar tarjeta'}
                  </Button>
                </div>

                {isPastDue && (
                  <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500">
                    Tu ultimo pago fallo. Actualiza tu metodo de pago para evitar la cancelacion.
                  </div>
                )}

                <div className="flex items-center justify-between border-t pt-4">
                  <div className="text-sm text-muted-foreground">
                    Monto mensual: <span className="font-semibold text-foreground">${data.monthlyAmount ?? 700} USD</span>
                  </div>
                  {data.cancelAtPeriodEnd ? (
                    <Button variant="outline" size="sm" onClick={handleCancel} disabled={cancelLoading}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      {cancelLoading ? 'Procesando...' : 'Reactivar suscripcion'}
                    </Button>
                  ) : (
                    <Button variant="destructive" size="sm" onClick={handleCancel} disabled={cancelLoading}>
                      <XCircle className="mr-2 h-4 w-4" />
                      {cancelLoading ? 'Procesando...' : 'Cancelar suscripcion'}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Configura tu tarjeta para activar el cobro automatico mensual de $700 USD.
                </p>
                <Button onClick={handleSetupCard} disabled={checkoutLoading}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  {checkoutLoading ? 'Procesando...' : 'Configurar pago'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── COSTOS FIJOS MENSUALES ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-5 w-5" />
            Costos fijos mensuales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(costs?.fixedCosts ?? [
              { id: 'semrush', label: 'Semrush — Plataforma SEO', description: 'Suite completa de herramientas SEO: auditorias, keywords, backlinks, competencia', costUsd: 500 },
              { id: 'infrastructure', label: 'Infraestructura Cloud', description: 'Servidores, base de datos, CDN, almacenamiento y procesamiento', costUsd: 85 },
              { id: 'monitoring', label: 'Monitoreo y Automatizacion', description: 'Cron jobs, colas de trabajo, cache Redis, alertas en tiempo real', costUsd: 35 },
            ]).map(cost => {
              const Icon = COST_ICONS[cost.id] ?? DollarSign
              return (
                <div key={cost.id} className="flex items-start justify-between rounded-lg border p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{cost.label}</p>
                      <p className="text-xs text-muted-foreground">{cost.description}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">{formatUsd(cost.costUsd)}</span>
                </div>
              )
            })}
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-sm font-medium">Total costos fijos</span>
              <span className="text-base font-bold text-primary">
                {formatUsd(
                  (costs?.fixedCosts ?? [
                    { costUsd: 500 }, { costUsd: 85 }, { costUsd: 35 },
                  ]).reduce((sum, c) => sum + c.costUsd, 0)
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── DESGLOSE MENSUAL MES POR MES ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5" />
            Desglose de costos — mes por mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {costsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : costs && costs.months.length > 0 ? (
            <div className="space-y-4">
              {costs.months.map(month => (
                <div key={month.month} className="rounded-lg border">
                  {/* Month header */}
                  <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
                    <span className="text-sm font-semibold capitalize">{formatMonth(month.month)}</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      Total: {formatUsd(month.totalOperationalUsd)}
                    </Badge>
                  </div>

                  <div className="divide-y px-4">
                    {/* Fixed costs section */}
                    <div className="py-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Costos fijos</p>
                      {month.fixedCosts.map(fc => (
                        <div key={fc.id} className="flex items-center justify-between py-1">
                          <span className="text-sm text-muted-foreground">{fc.label}</span>
                          <span className="text-sm font-medium">{formatUsd(fc.costUsd)}</span>
                        </div>
                      ))}
                      <div className="mt-1 flex items-center justify-between border-t border-dashed pt-1">
                        <span className="text-xs font-medium text-muted-foreground">Subtotal fijos</span>
                        <span className="text-sm font-semibold">{formatUsd(month.fixedTotalUsd)}</span>
                      </div>
                    </div>

                    {/* Variable API costs section */}
                    <div className="py-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Costos variables (API)</p>
                      {month.variableCosts.length > 0 ? (
                        <>
                          {month.variableCosts.map((vc, i) => (
                            <div key={`${vc.provider}-${i}`} className="flex items-center justify-between py-1">
                              <span className="text-sm text-muted-foreground">{vc.label}</span>
                              <span className="text-sm font-medium">{formatUsd(vc.costUsd)}</span>
                            </div>
                          ))}
                          <div className="mt-1 flex items-center justify-between border-t border-dashed pt-1">
                            <span className="text-xs font-medium text-muted-foreground">Subtotal variables</span>
                            <span className="text-sm font-semibold">{formatUsd(month.variableTotalUsd)}</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">Sin costos de API registrados este mes</p>
                      )}
                    </div>

                    {/* Month total */}
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm font-bold">Total operativo del mes</span>
                      <span className="text-base font-bold text-primary">{formatUsd(month.totalOperationalUsd)}</span>
                    </div>

                    {/* Subscription comparison */}
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-muted-foreground">Cobro al cliente</span>
                      <span className="text-sm font-medium text-green-500">{formatUsd(month.subscriptionUsd)}</span>
                    </div>

                    {/* Margin */}
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm font-medium">Margen</span>
                      <span className={`text-sm font-bold ${month.subscriptionUsd - month.totalOperationalUsd >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatUsd(Math.round((month.subscriptionUsd - month.totalOperationalUsd) * 100) / 100)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay datos de costos registrados aun.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
