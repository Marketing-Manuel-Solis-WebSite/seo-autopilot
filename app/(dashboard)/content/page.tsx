import { prisma } from '@/lib/prisma'
import PageHeader from '@/components/layout/PageHeader'
import ContentCard from '@/components/content/ContentCard'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

const TABS = [
  { value: 'blog_post', label: 'Artículos' },
  { value: 'landing', label: 'Landings' },
  { value: 'oficina', label: 'Oficinas' },
  { value: 'servicio', label: 'Servicios' },
  { value: 'abogado', label: 'Abogados' },
  { value: 'pagina', label: 'Páginas' },
  { value: 'newsletter', label: 'Boletín' },
] as const

const nf = new Intl.NumberFormat('es-MX')

export default async function ContentStudioPage() {
  // Only what is live on the site: published content, most recent first
  const all = await prisma.content.findMany({
    where: { status: 'published' },
    orderBy: { publishedAt: 'desc' },
    include: { site: { select: { name: true, domain: true } } },
  })
  const byType = (t: string) => all.filter(c => c.contentType === t)
  const clicks = all.reduce((s, c) => s + ((c.schema as { clicks12m?: number } | null)?.clicks12m ?? 0), 0)

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Content Studio"
        description={`${nf.format(all.length)} páginas publicadas en www.manuelsolis.com · ${nf.format(clicks)} clics desde Google en 12 meses`}
      >
        <Link href="/content/generate">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Generar contenido</Button>
        </Link>
      </PageHeader>

      <Tabs defaultValue="all">
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">Todo ({all.length})</TabsTrigger>
          {TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value}>{t.label} ({byType(t.value).length})</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {all.map(c => <ContentCard key={c.id} content={c} />)}
          </div>
        </TabsContent>
        {TABS.map(t => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {byType(t.value).map(c => <ContentCard key={c.id} content={c} />)}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
