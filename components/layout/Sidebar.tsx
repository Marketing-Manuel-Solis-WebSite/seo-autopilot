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
  CreditCard,
  Wrench,
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
  { href: '/billing', label: 'Facturacion', icon: CreditCard },
  { href: '/settings', label: 'Configuracion', icon: Settings },
]

export default function Sidebar({ alertCount = 0, fixCount = 0 }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Shield className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold tracking-tight">Solis SEO</span>
          <Zap className="h-3.5 w-3.5 text-yellow-500" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Menu
        </p>
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))
          const Icon = item.icon
          const count = item.countKey === 'alerts' ? alertCount : 0

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', isActive ? '' : 'group-hover:text-foreground')} />
              <span className="flex-1">{item.label}</span>
              {count > 0 && (
                <Badge
                  variant="destructive"
                  className="h-5 min-w-5 px-1.5 text-[10px] font-bold"
                >
                  {count}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Pending fixes notification */}
      {fixCount > 0 && (
        <div className="border-t px-3 py-3">
          <Link href="/alerts" className="block">
            <div className="flex items-center gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 transition-colors hover:bg-yellow-500/10">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-yellow-500/10">
                <Wrench className="h-4 w-4 text-yellow-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-yellow-500">{fixCount} fixes</p>
                <p className="text-[11px] text-muted-foreground">Requieren aprobacion</p>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Version */}
      <div className="border-t px-5 py-3">
        <p className="text-[10px] text-muted-foreground">Solis SEO Autopilot v1.0</p>
      </div>
    </aside>
  )
}
