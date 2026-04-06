import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import Link from 'next/link'

export default function DashboardNotFound() {
  return (
    <div className="flex items-center justify-center p-12">
      <Card className="max-w-md text-center">
        <CardHeader>
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <CardTitle className="mt-4">Página no encontrada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            La página que buscas no existe o fue movida.
          </p>
          <Link href="/dashboard">
            <Button>Volver al dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
