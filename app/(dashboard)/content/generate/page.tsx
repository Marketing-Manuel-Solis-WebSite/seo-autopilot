import PageHeader from '@/components/layout/PageHeader'
import ContentGenerator from '@/components/content/ContentGenerator'

export default function GenerateContentPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Generador de Contenido SEO"
        description="Claude Opus genera contenido optimizado — Requiere aprobación antes de publicar"
      />
      <ContentGenerator />
    </div>
  )
}
