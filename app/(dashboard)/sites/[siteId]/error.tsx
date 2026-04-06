'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Site page error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h2 className="text-lg font-medium">Error al cargar el sitio</h2>
      <p className="text-sm text-muted-foreground">
        {error.message || 'No se pudo cargar la información del sitio.'}
      </p>
      <div className="flex gap-3">
        <Link href="/sites">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Volver a sitios
          </Button>
        </Link>
        <Button onClick={reset} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Reintentar
        </Button>
      </div>
    </div>
  )
}
