'use client'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface AlertFiltersProps {
  filter: { severity: string; unreadOnly: boolean }
  onChange: (filter: { severity: string; unreadOnly: boolean }) => void
}

export default function AlertFilters({ filter, onChange }: AlertFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <Select
        value={filter.severity || 'all'}
        onValueChange={v => onChange({ ...filter, severity: v === 'all' ? '' : v })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Severidad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="critical">Críticas</SelectItem>
          <SelectItem value="warning">Warnings</SelectItem>
          <SelectItem value="info">Info</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant={filter.unreadOnly ? 'default' : 'outline'}
        size="sm"
        onClick={() => onChange({ ...filter, unreadOnly: !filter.unreadOnly })}
      >
        {filter.unreadOnly ? 'Solo no leídas' : 'Todas'}
      </Button>
    </div>
  )
}
