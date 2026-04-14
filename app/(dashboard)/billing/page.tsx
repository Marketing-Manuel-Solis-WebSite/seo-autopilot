'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Settings, XCircle, RotateCcw, Receipt } from 'lucide-react'

interface BillingData {
  status: string
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
}

interface ProviderCost {
  provider: string
  realCostUsd: number
  billedCostUsd: number
}

interface MonthCost {
  month: string
  semrushUsd: number
  providers: ProviderCost[]
  apiTotalUsd: number
  grandTotalUsd: number
}

const PROVIDER_LABELS: Record<string, string> = {
  'claude-opus': 'Claude Opus',
  'claude-sonnet': 'Claude Sonnet',
  'dataforseo': 'DataForSEO',
}

function formatMonth(month: string): string {
  const [year, m] = month.split('-')
  const date = new Date(Number(year), Number(m) - 1)
  return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long' })
}

function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [costs, setCosts] = useState<MonthCost[]>([])
  const [costsLoading, setCostsLoading] = useState(true)
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
      .then((d: { months: MonthCost[] }) => setCosts(d.months ?? []))
      .catch(() => setCosts([]))
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

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Pago mensual" description="Cobro automatico mensual" />

      {message && (
        <div className={`rounded-md p-3 text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
          {message.text}
        </div>
      )}

      {!loading && data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-5 w-5" />
              Suscripcion mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isActive ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {data.cancelAtPeriodEnd ? (
                      <Badge className="bg-yellow-500/10 text-yellow-500">Se cancela al final del periodo</Badge>
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
                <div className="flex justify-end">
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
                  Configura tu tarjeta para activar el cobro automatico mensual.
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

      {!costsLoading && costs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-5 w-5" />
              Desglose de costos mensuales
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Costos de APIs (x3) + Semrush fijo $500 USD/mes
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {costs.map(month => (
              <div key={month.month} className="space-y-3">
                <h3 className="text-sm font-semibold capitalize">{formatMonth(month.month)}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Servicio</th>
                        <th className="pb-2 text-right font-medium">Costo real</th>
                        <th className="pb-2 text-right font-medium">Facturado</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50">
                        <td className="py-2">Semrush</td>
                        <td className="py-2 text-right text-muted-foreground">{formatUsd(500)}</td>
                        <td className="py-2 text-right">{formatUsd(month.semrushUsd)}</td>
                      </tr>
                      {month.providers.map(p => (
                        <tr key={p.provider} className="border-b border-border/50">
                          <td className="py-2">{PROVIDER_LABELS[p.provider] ?? p.provider}</td>
                          <td className="py-2 text-right text-muted-foreground">{formatUsd(p.realCostUsd)}</td>
                          <td className="py-2 text-right">{formatUsd(p.billedCostUsd)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold">
                        <td className="pt-2">Total</td>
                        <td className="pt-2 text-right text-muted-foreground">
                          {formatUsd(500 + month.providers.reduce((s, p) => s + p.realCostUsd, 0))}
                        </td>
                        <td className="pt-2 text-right">{formatUsd(month.grandTotalUsd)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
