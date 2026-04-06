'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'

interface ApprovalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  isDestructive: boolean
  onApprove: () => void
  onReject: () => void
}

export default function ApprovalModal({
  open,
  onOpenChange,
  title,
  description,
  isDestructive,
  onApprove,
  onReject,
}: ApprovalModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDestructive && <AlertTriangle className="h-5 w-5 text-red-500" />}
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{description}</p>
          {isDestructive && (
            <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
              <p className="text-sm font-medium text-red-500">
                Esta acción es potencialmente destructiva y puede afectar rankings existentes.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onReject}>Rechazar</Button>
          <Button
            variant={isDestructive ? 'destructive' : 'default'}
            onClick={onApprove}
          >
            {isDestructive ? 'Aprobar (con riesgo)' : 'Aprobar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
