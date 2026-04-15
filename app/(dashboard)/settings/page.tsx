'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Globe, Cpu, MapPin, ExternalLink } from 'lucide-react'

interface SiteData {
  id: string
  name: string
  domain: string
  gscPropertyUrl: string | null
  gscCredentials: unknown
}

export default function SettingsPage() {
  const [newSite, setNewSite] = useState({ name: '', domain: '', url: '', cmsType: '', cmsApiUrl: '', cmsApiKey: '', targetCountry: 'us', targetLanguage: 'en' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [newLocation, setNewLocation] = useState({ siteId: '', name: '', address: '', city: '', state: '', zip: '', phone: '', email: '', businessType: 'LegalService', gbpPlaceId: '' })
  const [locLoading, setLocLoading] = useState(false)
  const [locMessage, setLocMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [gscResult, setGscResult] = useState<string | null>(null)
  const [sites, setSites] = useState<SiteData[]>([])
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
      const res = await fetch('/api/auth/gsc/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      })
      if (!res.ok) {
        console.error('Failed to disconnect GSC')
      }
      loadSites()
    } catch (err) {
      console.error('Error disconnecting GSC:', err)
    } finally {
      setDisconnecting(null)
    }
  }

  async function handleAddSite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSite, url: newSite.url || `https://${newSite.domain}` }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Sitio agregado correctamente' })
        setNewSite({ name: '', domain: '', url: '', cmsType: '', cmsApiUrl: '', cmsApiKey: '', targetCountry: 'us', targetLanguage: 'en' })
        loadSites()
      } else {
        const data = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: data.error || 'Error al agregar sitio' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexion' })
    } finally {
      setLoading(false)
    }
  }

  async function handleAddLocation(e: React.FormEvent) {
    e.preventDefault()
    setLocLoading(true)
    setLocMessage(null)
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLocation),
      })
      if (res.ok) {
        setLocMessage({ type: 'success', text: 'Ubicacion agregada correctamente' })
        setNewLocation({ siteId: newLocation.siteId, name: '', address: '', city: '', state: '', zip: '', phone: '', email: '', businessType: 'LegalService', gbpPlaceId: '' })
      } else {
        const data = await res.json().catch(() => ({}))
        setLocMessage({ type: 'error', text: data.error || 'Error al agregar ubicacion' })
      }
    } catch {
      setLocMessage({ type: 'error', text: 'Error de conexion' })
    } finally {
      setLocLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Configuracion" description="Gestion del sistema Solis SEO" />

      {/* ── ADD SITE ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            Agregar nuevo sitio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddSite} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nombre</label>
              <Input value={newSite.name} onChange={e => setNewSite(s => ({ ...s, name: e.target.value }))} placeholder="Mi sitio web" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Dominio</label>
              <Input value={newSite.domain} onChange={e => setNewSite(s => ({ ...s, domain: e.target.value }))} placeholder="ejemplo.com" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">URL completa</label>
              <Input value={newSite.url} onChange={e => setNewSite(s => ({ ...s, url: e.target.value }))} placeholder="https://ejemplo.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Pais objetivo</label>
              <Select value={newSite.targetCountry} onValueChange={v => setNewSite(s => ({ ...s, targetCountry: v }))}>
                <SelectTrigger><SelectValue placeholder="Pais" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="us">United States</SelectItem>
                  <SelectItem value="uk">United Kingdom</SelectItem>
                  <SelectItem value="es">Espana</SelectItem>
                  <SelectItem value="mx">Mexico</SelectItem>
                  <SelectItem value="ar">Argentina</SelectItem>
                  <SelectItem value="co">Colombia</SelectItem>
                  <SelectItem value="de">Deutschland</SelectItem>
                  <SelectItem value="fr">France</SelectItem>
                  <SelectItem value="br">Brasil</SelectItem>
                  <SelectItem value="it">Italia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Idioma</label>
              <Select value={newSite.targetLanguage} onValueChange={v => setNewSite(s => ({ ...s, targetLanguage: v }))}>
                <SelectTrigger><SelectValue placeholder="Idioma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Espanol</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="fr">Francais</SelectItem>
                  <SelectItem value="pt">Portugues</SelectItem>
                  <SelectItem value="it">Italiano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
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
                <div className="space-y-1.5">
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
                <div className="space-y-1.5">
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
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={loading} className="gap-2">
                <Plus className="h-4 w-4" />
                {loading ? 'Agregando...' : 'Agregar sitio'}
              </Button>
              {message && (
                <p className={`text-sm ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                  {message.text}
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── SYSTEM CONFIG ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cpu className="h-4 w-4" />
            Configuracion del sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { name: 'Monitoreo automatico', desc: 'Claude Sonnet analiza cada hora', active: true },
            { name: 'Auditoria profunda semanal', desc: 'Claude Opus cada lunes a las 2am', active: true },
            { name: 'Generacion de contenido diaria', desc: 'Claude Opus cada dia a las 8am', active: true },
            { name: 'Check de rankings', desc: 'GSC + DataForSEO cada 6 horas', active: true },
            { name: 'Content Refresh', desc: 'Claude Opus cada miercoles a las 6am', active: true },
          ].map(item => (
            <div key={item.name} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Activo</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── GOOGLE SEARCH CONSOLE ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ExternalLink className="h-4 w-4" />
            Google Search Console
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Conecta GSC para habilitar monitoreo de rankings, CTR Optimizer y A/B testing de meta titles.
          </p>
          {gscResult === 'connected' && (
            <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-500">GSC conectado exitosamente.</div>
          )}
          {gscResult === 'error' && (
            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500">Error al conectar GSC. Intenta de nuevo.</div>
          )}

          {sites.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay sitios configurados. Agrega uno arriba primero.</p>
          )}

          {sites.map(s => {
            const isConnected = !!s.gscCredentials && !!s.gscPropertyUrl
            return (
              <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                  <div>
                    <p className="text-sm font-medium">{s.name} <span className="text-muted-foreground">({s.domain})</span></p>
                    {isConnected
                      ? <p className="text-xs text-green-600 dark:text-green-400">Conectado: {s.gscPropertyUrl}</p>
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

      {/* ── ADD LOCATION (Local SEO) ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            Agregar ubicacion (Local SEO)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddLocation} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium">Sitio</label>
              {sites.length > 0 ? (
                <Select value={newLocation.siteId} onValueChange={v => setNewLocation(s => ({ ...s, siteId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un sitio" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.domain})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">Agrega un sitio primero para poder agregar ubicaciones.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nombre de ubicacion</label>
              <Input value={newLocation.name} onChange={e => setNewLocation(s => ({ ...s, name: e.target.value }))} placeholder="Houston Office" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Direccion</label>
              <Input value={newLocation.address} onChange={e => setNewLocation(s => ({ ...s, address: e.target.value }))} placeholder="123 Main St" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ciudad</label>
              <Input value={newLocation.city} onChange={e => setNewLocation(s => ({ ...s, city: e.target.value }))} placeholder="Houston" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Estado</label>
              <Input value={newLocation.state} onChange={e => setNewLocation(s => ({ ...s, state: e.target.value }))} placeholder="TX" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ZIP</label>
              <Input value={newLocation.zip} onChange={e => setNewLocation(s => ({ ...s, zip: e.target.value }))} placeholder="77001" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Telefono</label>
              <Input value={newLocation.phone} onChange={e => setNewLocation(s => ({ ...s, phone: e.target.value }))} placeholder="(713) 555-0100" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input value={newLocation.email} onChange={e => setNewLocation(s => ({ ...s, email: e.target.value }))} placeholder="office@example.com" />
            </div>
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
              <label className="text-sm font-medium">GBP Place ID</label>
              <Input value={newLocation.gbpPlaceId} onChange={e => setNewLocation(s => ({ ...s, gbpPlaceId: e.target.value }))} placeholder="ChIJ... (opcional)" />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={locLoading || !newLocation.siteId} className="gap-2">
                <Plus className="h-4 w-4" />
                {locLoading ? 'Agregando...' : 'Agregar ubicacion'}
              </Button>
              {locMessage && (
                <p className={`text-sm ${locMessage.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                  {locMessage.text}
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
