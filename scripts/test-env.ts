import { config } from 'dotenv'
config({ path: '.env.local' })
import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

async function main() {
  console.log('Testing environment variables...')

  const required = [
    'DATABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ANTHROPIC_API_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'CRON_SECRET',
    'APP_URL'
  ]

  const missing = required.filter(key => !process.env[key])
  if (missing.length > 0) {
    console.error('MISSING ENV VARS:', missing)
  } else {
    console.log('All env vars present ✓')
  }

  console.log('Testing Prisma connection...')
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' })
  const prisma = new PrismaClient({ adapter })
  try {
    const siteCount = await prisma.site.count()
    console.log('Prisma connected ✓ Sites in DB:', siteCount)
  } catch (e) {
    console.error('Prisma connection FAILED:', e)
  }

  console.log('Testing Supabase connection...')
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data, error } = await supabase.auth.admin.listUsers()
    if (error) console.error('Supabase FAILED:', error)
    else console.log('Supabase connected ✓ Users:', data.users.length)
  } catch (e) {
    console.error('Supabase error:', e)
  }
}

main()
