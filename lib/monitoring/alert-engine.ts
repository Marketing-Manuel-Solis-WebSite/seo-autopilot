import { prisma } from '@/lib/prisma'

export interface AlertInput {
  siteId: string
  alertType: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  message: string
  data?: unknown
}

export async function triggerAlert(input: AlertInput) {
  // Deduplication: skip if identical alert (same site + type) already exists today
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const existing = await prisma.alert.findFirst({
    where: {
      siteId: input.siteId,
      alertType: input.alertType,
      createdAt: { gte: startOfDay },
    },
  })

  if (existing) {
    return existing
  }

  const alert = await prisma.alert.create({
    data: {
      siteId: input.siteId,
      alertType: input.alertType,
      severity: input.severity,
      title: input.title,
      message: input.message,
      data: input.data as never,
    },
  })

  // Send email notification for critical alerts
  if (input.severity === 'critical') {
    await sendCriticalAlertEmail(alert.id, input)
  }

  return alert
}

async function sendCriticalAlertEmail(alertId: string, input: AlertInput) {
  if (!process.env.RESEND_API_KEY) return

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: 'Solis SEO <alerts@solisseo.com>',
      to: ['admin@solisseo.com'],
      subject: `[CRITICAL] ${input.title}`,
      html: `
        <h2>Alerta Crítica SEO</h2>
        <p><strong>Sitio:</strong> ${input.siteId}</p>
        <p><strong>Tipo:</strong> ${input.alertType}</p>
        <p><strong>${input.title}</strong></p>
        <p>${input.message}</p>
        <p><a href="${process.env.APP_URL}/alerts">Ver en Solis Dashboard</a></p>
      `,
    })
  } catch (error) {
    console.error('Failed to send alert email:', error)
  }
}

export async function resolveAlert(alertId: string) {
  return prisma.alert.update({
    where: { id: alertId },
    data: { isResolved: true, resolvedAt: new Date() },
  })
}

export async function markAlertRead(alertId: string) {
  return prisma.alert.update({
    where: { id: alertId },
    data: { isRead: true },
  })
}

export async function getUnreadAlerts(siteId?: string) {
  return prisma.alert.findMany({
    where: {
      isRead: false,
      ...(siteId ? { siteId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { site: { select: { name: true, domain: true } } },
  })
}
