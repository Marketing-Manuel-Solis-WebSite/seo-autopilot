'use client'

import { useState, useEffect } from 'react'
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
  const [gscResult, setGscResult] = useState<string | null>(null)
  const [sites, setSites] = useState<{ id: string; name: string; domain: string; gscPropertyUrl: string | null; gscCredentials: unknown }[]>([])
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  function loadSites() {
    fetch('/api/sites').then(r => r.ok ? r.json() : []).then(setSites).catch(() => {})
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setGscResult(params.get('gsc'))
    loadSites()
  }, [])

  async function handleDisconnectGSC(siteId: string) {
    setDisconnecting(siteId)
    try {
      await fetch('/api/auth/gsc/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      })
      loadSites()
    } finally {
      setDisconnecting(null)
    }
  }

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
                  <SelectItem value="github">GitHub (Next.js / static)</SelectItem>
                  <SelectItem value="shopify">Shopify</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newSite.cmsType && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {newSite.cmsType === 'github' ? 'GitHub repo (org/repo-name)' : newSite.cmsType === 'webflow' ? 'Collection ID' : 'CMS API URL'}
                  </label>
                  <Input
                    value={newSite.cmsApiUrl}
                    onChange={e => setNewSite(s => ({ ...s, cmsApiUrl: e.target.value }))}
                    placeholder={
                      newSite.cmsType === 'github' ? 'LawOfficesManuelSolis/manuelsolis-com'
                      : newSite.cmsType === 'wordpress' ? 'https://ejemplo.com'
                      : newSite.cmsType === 'webflow' ? 'collection_id_here'
                      : 'https://api.ejemplo.com'
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {newSite.cmsType === 'github' ? 'Blog folder path' : 'CMS API Key'}
                  </label>
                  <Input
                    type={newSite.cmsType === 'github' ? 'text' : 'password'}
                    value={newSite.cmsApiKey}
                    onChange={e => setNewSite(s => ({ ...s, cmsApiKey: e.target.value }))}
                    placeholder={
                      newSite.cmsType === 'github' ? 'app/blog'
                      : newSite.cmsType === 'wordpress' ? 'user:application_password'
                      : 'Bearer token / API key'
                    }
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
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Conecta GSC para habilitar monitoreo de rankings, CTR Optimizer y A/B testing de meta titles.
          </p>
          {gscResult === 'connected' && <p className="text-sm text-green-500">GSC conectado exitosamente.</p>}
          {gscResult === 'error' && <p className="text-sm text-red-500">Error al conectar GSC. Intenta de nuevo.</p>}

          {sites.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay sitios configurados. Agrega uno arriba primero.</p>
          )}

          {sites.map(s => {
            const isConnected = !!s.gscCredentials && !!s.gscPropertyUrl
            return (
              <div key={s.id} className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <div>
                    <p className="text-sm font-medium">{s.name} ({s.domain})</p>
                    {isConnected
                      ? <p className="text-xs text-green-600">Conectado: {s.gscPropertyUrl}</p>
                      : <p className="text-xs text-muted-foreground">No conectado</p>
                    }
                  </div>
                </div>
                {isConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disconnecting === s.id}
                    onClick={() => handleDisconnectGSC(s.id)}
                  >
                    {disconnecting === s.id ? 'Desconectando...' : 'Desconectar'}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = `/api/auth/gsc?siteId=${s.id}`}
                  >
                    Conectar GSC
                  </Button>
                )}
              </div>
            )
          })}
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
