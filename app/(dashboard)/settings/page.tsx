'use client'

import { useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'

export default function SettingsPage() {
  const [newSite, setNewSite] = useState({ name: '', domain: '', url: '', cmsType: '', cmsApiUrl: '', cmsApiKey: '', targetCountry: 'us', targetLanguage: 'en' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [newLocation, setNewLocation] = useState({ siteId: '', name: '', address: '', city: '', state: '', zip: '', phone: '', email: '', businessType: 'LegalService', gbpPlaceId: '' })
  const [locLoading, setLocLoading] = useState(false)
  const [locMessage, setLocMessage] = useState('')
  const [gscSiteId, setGscSiteId] = useState('')

  // Check for GSC callback result
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const gscResult = params?.get('gsc')

  async function handleAddSite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSite, url: newSite.url || `https://${newSite.domain}` }),
      })
      if (res.ok) {
        setMessage('Sitio agregado correctamente')
        setNewSite({ name: '', domain: '', url: '', cmsType: '', cmsApiUrl: '', cmsApiKey: '', targetCountry: 'us', targetLanguage: 'en' })
      } else {
        setMessage('Error al agregar sitio')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Configuración" description="Gestión del sistema Solis SEO" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agregar nuevo sitio</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddSite} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input value={newSite.name} onChange={e => setNewSite(s => ({ ...s, name: e.target.value }))} placeholder="Mi sitio web" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dominio</label>
              <Input value={newSite.domain} onChange={e => setNewSite(s => ({ ...s, domain: e.target.value }))} placeholder="ejemplo.com" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">URL completa</label>
              <Input value={newSite.url} onChange={e => setNewSite(s => ({ ...s, url: e.target.value }))} placeholder="https://ejemplo.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">País objetivo</label>
              <Select value={newSite.targetCountry} onValueChange={v => setNewSite(s => ({ ...s, targetCountry: v }))}>
                <SelectTrigger><SelectValue placeholder="País" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="us">United States</SelectItem>
                  <SelectItem value="uk">United Kingdom</SelectItem>
                  <SelectItem value="es">España</SelectItem>
                  <SelectItem value="mx">México</SelectItem>
                  <SelectItem value="ar">Argentina</SelectItem>
                  <SelectItem value="co">Colombia</SelectItem>
                  <SelectItem value="de">Deutschland</SelectItem>
                  <SelectItem value="fr">France</SelectItem>
                  <SelectItem value="br">Brasil</SelectItem>
                  <SelectItem value="it">Italia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Idioma</label>
              <Select value={newSite.targetLanguage} onValueChange={v => setNewSite(s => ({ ...s, targetLanguage: v }))}>
                <SelectTrigger><SelectValue placeholder="Idioma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="it">Italiano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">CMS</label>
              <Select value={newSite.cmsType} onValueChange={v => setNewSite(s => ({ ...s, cmsType: v }))}>
                <SelectTrigger><SelectValue placeholder="Tipo de CMS" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wordpress">WordPress</SelectItem>
                  <SelectItem value="webflow">Webflow</SelectItem>
                  <SelectItem value="shopify">Shopify</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="nextjs">Next.js</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newSite.cmsType && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {newSite.cmsType === 'webflow' ? 'Collection ID' : 'CMS API URL'}
                  </label>
                  <Input
                    value={newSite.cmsApiUrl}
                    onChange={e => setNewSite(s => ({ ...s, cmsApiUrl: e.target.value }))}
                    placeholder={newSite.cmsType === 'wordpress' ? 'https://ejemplo.com' : newSite.cmsType === 'webflow' ? 'collection_id_here' : 'https://api.ejemplo.com'}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">CMS API Key</label>
                  <Input
                    type="password"
                    value={newSite.cmsApiKey}
                    onChange={e => setNewSite(s => ({ ...s, cmsApiKey: e.target.value }))}
                    placeholder={newSite.cmsType === 'wordpress' ? 'user:application_password' : 'Bearer token / API key'}
                  />
                </div>
              </>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading} className="gap-2">
                <Plus className="h-4 w-4" />
                {loading ? 'Agregando...' : 'Agregar sitio'}
              </Button>
              {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuración del sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Monitoreo automático</p>
              <p className="text-xs text-muted-foreground">Claude Sonnet analiza cada hora</p>
            </div>
            <Badge variant="default" className="bg-green-500/10 text-green-500">Activo</Badge>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Auditoría profunda semanal</p>
              <p className="text-xs text-muted-foreground">Claude Opus cada lunes a las 2am</p>
            </div>
            <Badge variant="default" className="bg-green-500/10 text-green-500">Activo</Badge>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Generación de contenido diaria</p>
              <p className="text-xs text-muted-foreground">Claude Opus cada día a las 8am</p>
            </div>
            <Badge variant="default" className="bg-green-500/10 text-green-500">Activo</Badge>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Check de rankings</p>
              <p className="text-xs text-muted-foreground">GSC + DataForSEO cada 6 horas</p>
            </div>
            <Badge variant="default" className="bg-green-500/10 text-green-500">Activo</Badge>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Content Refresh</p>
              <p className="text-xs text-muted-foreground">Claude Opus cada miércoles a las 6am</p>
            </div>
            <Badge variant="default" className="bg-green-500/10 text-green-500">Activo</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Google Search Console</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Conecta GSC para habilitar monitoreo de rankings, CTR Optimizer y A/B testing de meta titles.
            GSC debe conectarse por cada sitio individualmente.
          </p>
          {gscResult === 'connected' && <p className="mb-3 text-sm text-green-500">GSC conectado exitosamente.</p>}
          {gscResult === 'error' && <p className="mb-3 text-sm text-red-500">Error al conectar GSC. Intenta de nuevo.</p>}
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Site ID para conectar</label>
              <Input value={gscSiteId} onChange={e => setGscSiteId(e.target.value)} placeholder="ID del sitio" />
            </div>
            <Button
              variant="outline"
              disabled={!gscSiteId}
              onClick={() => window.location.href = `/api/auth/gsc?siteId=${gscSiteId}`}
            >
              Conectar Google Search Console
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agregar ubicación (Local SEO)</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={async (e) => {
            e.preventDefault()
            setLocLoading(true)
            setLocMessage('')
            try {
              const res = await fetch('/api/locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newLocation),
              })
              if (res.ok) {
                setLocMessage('Ubicación agregada correctamente')
                setNewLocation({ siteId: '', name: '', address: '', city: '', state: '', zip: '', phone: '', email: '', businessType: 'LegalService', gbpPlaceId: '' })
              } else {
                setLocMessage('Error al agregar ubicación')
              }
            } finally {
              setLocLoading(false)
            }
          }} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Site ID</label>
              <Input value={newLocation.siteId} onChange={e => setNewLocation(s => ({ ...s, siteId: e.target.value }))} placeholder="ID del sitio" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre de ubicación</label>
              <Input value={newLocation.name} onChange={e => setNewLocation(s => ({ ...s, name: e.target.value }))} placeholder="Manuel Solís - Houston Office" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dirección</label>
              <Input value={newLocation.address} onChange={e => setNewLocation(s => ({ ...s, address: e.target.value }))} placeholder="123 Main St" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ciudad</label>
              <Input value={newLocation.city} onChange={e => setNewLocation(s => ({ ...s, city: e.target.value }))} placeholder="Houston" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Input value={newLocation.state} onChange={e => setNewLocation(s => ({ ...s, state: e.target.value }))} placeholder="TX" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">ZIP</label>
              <Input value={newLocation.zip} onChange={e => setNewLocation(s => ({ ...s, zip: e.target.value }))} placeholder="77001" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Teléfono</label>
              <Input value={newLocation.phone} onChange={e => setNewLocation(s => ({ ...s, phone: e.target.value }))} placeholder="(713) 555-0100" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input value={newLocation.email} onChange={e => setNewLocation(s => ({ ...s, email: e.target.value }))} placeholder="office@example.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de negocio</label>
              <Select value={newLocation.businessType} onValueChange={v => setNewLocation(s => ({ ...s, businessType: v }))}>
                <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LegalService">Legal Service</SelectItem>
                  <SelectItem value="Attorney">Attorney</SelectItem>
                  <SelectItem value="LocalBusiness">Local Business</SelectItem>
                  <SelectItem value="MedicalBusiness">Medical Business</SelectItem>
                  <SelectItem value="RealEstateAgent">Real Estate Agent</SelectItem>
                  <SelectItem value="Restaurant">Restaurant</SelectItem>
                  <SelectItem value="Store">Store</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">GBP Place ID</label>
              <Input value={newLocation.gbpPlaceId} onChange={e => setNewLocation(s => ({ ...s, gbpPlaceId: e.target.value }))} placeholder="ChIJ... (opcional)" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={locLoading} className="gap-2">
                <Plus className="h-4 w-4" />
                {locLoading ? 'Agregando...' : 'Agregar ubicación'}
              </Button>
              {locMessage && <p className="mt-2 text-sm text-muted-foreground">{locMessage}</p>}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
