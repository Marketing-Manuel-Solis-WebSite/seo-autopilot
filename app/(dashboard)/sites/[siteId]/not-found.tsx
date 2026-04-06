import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function SiteNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12">
      <h2 className="text-lg font-medium">Sitio no encontrado</h2>
      <p className="text-sm text-muted-foreground">
        El sitio que buscas no existe o fue eliminado.
      </p>
      <Link href="/sites">
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Volver a sitios
        </Button>
      </Link>
    </div>
  )
}
