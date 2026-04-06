'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import ContentApproval from './ContentApproval'

interface Site {
  id: string
  name: string
  domain: string
}

export default function ContentGenerator() {
  const [sites, setSites] = useState<Site[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [formData, setFormData] = useState({
    siteId: '',
    contentType: 'blog',
    targetKeyword: '',
    wordCount: 1500,
    additionalContext: '',
  })

  useEffect(() => {
    fetch('/api/sites').then(r => r.json()).then(setSites)
  }, [])

  async function handleGenerate() {
    if (!formData.siteId || !formData.targetKeyword) return
    setIsGenerating(true)
    setGeneratedContent(null)
    try {
      const res = await fetch('/api/claude/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      setGeneratedContent(data)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuración</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sitio</label>
              <Select value={formData.siteId} onValueChange={v => setFormData(d => ({ ...d, siteId: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar sitio" /></SelectTrigger>
                <SelectContent>
                  {sites.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de contenido</label>
              <Select value={formData.contentType} onValueChange={v => setFormData(d => ({ ...d, contentType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="blog">Blog post</SelectItem>
                  <SelectItem value="landing">Landing page</SelectItem>
                  <SelectItem value="product">Página de producto</SelectItem>
                  <SelectItem value="faq">FAQ</SelectItem>
                  <SelectItem value="pillar">Pillar content</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Keyword objetivo</label>
              <Input
                value={formData.targetKeyword}
                onChange={e => setFormData(d => ({ ...d, targetKeyword: e.target.value }))}
                placeholder="ej: best seo tools 2025"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Palabras objetivo</label>
              <Input
                type="number"
                value={formData.wordCount}
                onChange={e => setFormData(d => ({ ...d, wordCount: parseInt(e.target.value) || 1500 }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Contexto adicional (opcional)</label>
            <Textarea
              value={formData.additionalContext}
              onChange={e => setFormData(d => ({ ...d, additionalContext: e.target.value }))}
              placeholder="Instrucciones adicionales, tono, audiencia..."
              rows={3}
            />
          </div>
          <Button onClick={handleGenerate} disabled={isGenerating || !formData.siteId || !formData.targetKeyword} className="w-fit">
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando con Claude Opus...
              </>
            ) : (
              'Generar contenido'
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedContent && (
        <ContentApproval content={generatedContent} siteId={formData.siteId} />
      )}
    </div>
  )
}
