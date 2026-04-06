'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Globe,
  FileText,
  Bell,
  BarChart3,
  Settings,
  Shield,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface SidebarProps {
  alertCount?: number
  fixCount?: number
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sites', label: 'Sitios', icon: Globe },
  { href: '/content', label: 'Content Studio', icon: FileText },
  { href: '/alerts', label: 'Alertas', icon: Bell, countKey: 'alerts' as const },
  { href: '/reports', label: 'Reportes', icon: BarChart3 },
  { href: '/settings', label: 'Configuración', icon: Settings },
]

export default function Sidebar({ alertCount = 0, fixCount = 0 }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Shield className="h-6 w-6 text-primary" />
        <span className="font-heading text-lg font-semibold">Solis SEO</span>
        <Zap className="h-4 w-4 text-yellow-500" />
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(item => {
          const isActive = pathname?.startsWith(item.href)
          const Icon = item.icon
          const count = item.countKey === 'alerts' ? alertCount : 0

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {count > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 px-1 text-xs">
                  {count}
                </Badge>
              )}
            </Link>
          )
        })} 
      </nav>

      {fixCount > 0 && (
        <div className="border-t p-3">
          <div className="rounded-md bg-yellow-500/10 p-3 text-sm">
            <p className="font-medium text-yellow-500">{fixCount} fixes pendientes</p>
            <p className="text-xs text-muted-foreground">Requieren aprobación</p>
          </div>
        </div>
      )}
    </aside>
  )
}
