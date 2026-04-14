'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Settings, XCircle, RotateCcw } from 'lucide-react'

interface BillingData {
  status: string
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  monthlyAmount?: number
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
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
      <PageHeader title="Pago mensual" description="Cobro automatico mensual — $700 USD/mes" />

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
    </div>
  )
}
