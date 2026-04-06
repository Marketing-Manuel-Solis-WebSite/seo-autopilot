import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' })
const prisma = new PrismaClient({ adapter })

async function testDashboardData() {
  console.log('=== Testing getDashboardData() queries ===\n')

  try {
    console.log('[1] prisma.site.findMany (with includes)...')
    const sites = await prisma.site.findMany({
      where: { isActive: true },
      include: {
        audits: { orderBy: { createdAt: 'desc' }, take: 1 },
        alerts: { where: { isRead: false }, orderBy: { createdAt: 'desc' }, take: 5 },
        rankings: { orderBy: { checkedAt: 'desc' }, take: 10 },
      },
    })
    console.log('  OK - sites:', sites.length)
  } catch (e) {
    console.error('  FAILED:', e)
  }

  try {
    console.log('[2] prisma.alert.findMany...')
    const alerts = await prisma.alert.findMany({
      where: { isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { site: { select: { name: true, domain: true } } },
    })
    console.log('  OK - alerts:', alerts.length)
  } catch (e) {
    console.error('  FAILED:', e)
  }

  try {
    console.log('[3] prisma.monitoringLog.findMany...')
    const logs = await prisma.monitoringLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { site: { select: { name: true } } },
    })
    console.log('  OK - logs:', logs.length)
  } catch (e) {
    console.error('  FAILED:', e)
  }

  try {
    console.log('[4] Count queries...')
    const [pendingFixes, pendingContent, totalKeywords, totalBacklinks] = await Promise.all([
      prisma.fix.count({ where: { status: 'pending_approval' } }),
      prisma.content.count({ where: { status: 'pending_approval' } }),
      prisma.keyword.count({ where: { isTracking: true } }),
      prisma.backlink.count({ where: { isActive: true } }),
    ])
    console.log('  OK -', { pendingFixes, pendingContent, totalKeywords, totalBacklinks })
  } catch (e) {
    console.error('  FAILED:', e)
  }

  console.log('\n=== Testing getLayoutData() queries ===\n')

  try {
    console.log('[5] Alert + fix counts...')
    const [alertCount, fixCount] = await Promise.all([
      prisma.alert.count({ where: { isRead: false } }),
      prisma.fix.count({ where: { status: 'pending_approval' } }),
    ])
    console.log('  OK -', { alertCount, fixCount })
  } catch (e) {
    console.error('  FAILED:', e)
  }

  try {
    console.log('[6] Critical alerts count...')
    const criticalAlerts = await prisma.alert.count({
      where: { isRead: false, severity: 'critical' },
    })
    console.log('  OK - criticalAlerts:', criticalAlerts)
  } catch (e) {
    console.error('  FAILED:', e)
  }

  console.log('\n=== All queries completed ===')
  process.exit(0)
}

testDashboardData()
