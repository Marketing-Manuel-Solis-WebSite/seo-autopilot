import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface CalendarItem {
  id: string
  title: string
  contentType: string
  targetKeyword: string
  status: string
  createdAt: string | Date
  site?: { name: string }
}

interface EditorialCalendarProps {
  items: CalendarItem[]
}

export default function EditorialCalendar({ items }: EditorialCalendarProps) {
  const grouped = items.reduce<Record<string, CalendarItem[]>>((acc, item) => {
    const week = getWeekLabel(new Date(item.createdAt))
    if (!acc[week]) acc[week] = []
    acc[week].push(item)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([week, weekItems]) => (
        <Card key={week}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{week}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {weekItems.map(item => (
                <div key={item.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <div>
                    <span className="font-medium">{item.title}</span>
                    <span className="text-muted-foreground"> — {item.targetKeyword}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{item.contentType}</Badge>
                    <Badge variant="secondary" className="text-xs">{item.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function getWeekLabel(date: Date): string {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return `${start.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })} — ${end.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}`
}
