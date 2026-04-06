import PageHeader from '@/components/layout/PageHeader'
import AlertCenter from '@/components/alerts/AlertCenter'

export default function AlertsPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Centro de Alertas" description="Alertas y notificaciones de todos los sitios" />
      <AlertCenter />
    </div>
  )
}
