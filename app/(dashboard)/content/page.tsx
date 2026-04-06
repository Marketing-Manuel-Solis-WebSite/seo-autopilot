import { prisma } from '@/lib/prisma'
import PageHeader from '@/components/layout/PageHeader'
import ContentCard from '@/components/content/ContentCard'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ContentStudioPage() {
  const [all, pending, published] = await Promise.all([
    prisma.content.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { site: { select: { name: true, domain: true } } },
    }),
    prisma.content.findMany({
      where: { status: 'pending_approval' },
      orderBy: { createdAt: 'desc' },
      include: { site: { select: { name: true, domain: true } } },
    }),
    prisma.content.findMany({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      take: 20,
      include: { site: { select: { name: true, domain: true } } },
    }),
  ])

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Content Studio" description="Gestión global de contenido SEO">
        <Link href="/content/generate">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Generar contenido</Button>
        </Link>
      </PageHeader>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todo ({all.length})</TabsTrigger>
          <TabsTrigger value="pending">Pendientes ({pending.length})</TabsTrigger>
          <TabsTrigger value="published">Publicados ({published.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {all.map(c => <ContentCard key={c.id} content={c} />)}
          </div>
        </TabsContent>
        <TabsContent value="pending" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {pending.map(c => <ContentCard key={c.id} content={c} />)}
          </div>
        </TabsContent>
        <TabsContent value="published" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {published.map(c => <ContentCard key={c.id} content={c} />)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
