import { Badge } from '@/components/ui/badge'

interface AlertBadgeProps {
  severity: string
  count: number
}

export default function AlertBadge({ severity, count }: AlertBadgeProps) {
  if (count === 0) return null

  const colors: Record<string, string> = {
    critical: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-black',
    info: 'bg-blue-500 text-white',
  }

  return (
    <Badge className={colors[severity] ?? ''}>
      {count} {severity}
    </Badge>
  )
}
