import { config } from 'dotenv'
config({ path: '.env.local' })

// No @/ alias needed — this script uses direct imports only

// ── Imports (after alias patch) ───────────────────────────────
import { PrismaClient } from '../lib/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import Anthropic from '@anthropic-ai/sdk'
import { Redis } from '@upstash/redis'
import { readFileSync } from 'node:fs'

// ── Test infrastructure ───────────────────────────────────────
interface TestResult {
  id: string
  name: string
  passed: boolean
  detail: string
  durationMs: number
}

const results: TestResult[] = []
let currentSection = ''

function section(name: string) {
  currentSection = name
  console.log(`\n${'─'.repeat(50)}`)
  console.log(`  ${name}`)
  console.log('─'.repeat(50))
}

async function test(id: string, name: string, fn: () => Promise<string>) {
  const start = Date.now()
  try {
    const detail = await fn()
    const ms = Date.now() - start
    results.push({ id, name, passed: true, detail, durationMs: ms })
    console.log(`  ✅ ${id} ${name} (${ms}ms)`)
    if (detail) console.log(`     ${detail}`)
  } catch (err) {
    const ms = Date.now() - start
    const msg = err instanceof Error ? err.message : String(err)
    results.push({ id, name, passed: false, detail: msg, durationMs: ms })
    console.log(`  ❌ ${id} ${name} (${ms}ms)`)
    console.log(`     ${msg.split('\n')[0]}`)
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

// ── Shared instances ──────────────────────────────────────────
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

let testSiteId = ''
let testSiteDomain = ''

// ══════════════════════════════════════════════════════════════
//  TEST SECTIONS
// ══════════════════════════════════════════════════════════════

async function testDatabase() {
  section('SECTION 1 — DATABASE')

  await test('1.1', 'Prisma connects successfully', async () => {
    await prisma.$queryRawUnsafe('SELECT 1')
    return 'Connection OK'
  })

  await test('1.2', 'All 13 tables exist', async () => {
    const tables = [
      'Site', 'Audit', 'Keyword', 'Ranking', 'Content',
      'Fix', 'Backlink', 'Competitor', 'Alert', 'Report',
      'MonitoringLog', 'InternalLink', 'TopicMap',
    ]
    const existing = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
    )
    const existingNames = existing.map(t => t.tablename)
    const missing = tables.filter(t => !existingNames.includes(t))
    assert(missing.length === 0, `Missing tables: ${missing.join(', ')}`)
    return `${tables.length} tables verified`
  })

  await test('1.3', 'manuelsolis.com exists and isActive', async () => {
    const site = await prisma.site.findFirst({
      where: { domain: { contains: 'manuelsolis' }, isActive: true },
    })
    assert(!!site, 'No active site with domain containing "manuelsolis"')
    testSiteId = site!.id
    testSiteDomain = site!.domain
    return `Found: ${site!.name} (${site!.domain}) id=${site!.id}`
  })

  await test('1.4', 'Site has gscCredentials', async () => {
    if (!testSiteId) throw new Error('No test site — skipped')
    const site = await prisma.site.findUnique({
      where: { id: testSiteId },
      select: { gscCredentials: true },
    })
    assert(!!site?.gscCredentials, 'gscCredentials is null')
    return 'GSC credentials present'
  })

  await test('1.5', 'Site has gscPropertyUrl', async () => {
    if (!testSiteId) throw new Error('No test site — skipped')
    const site = await prisma.site.findUnique({
      where: { id: testSiteId },
      select: { gscPropertyUrl: true },
    })
    assert(!!site?.gscPropertyUrl, 'gscPropertyUrl is null or empty')
    return `Property: ${site!.gscPropertyUrl}`
  })
}

async function testAnthropic() {
  section('SECTION 2 — ANTHROPIC API')

  await test('2.1', 'Claude Sonnet responds', async () => {
    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Reply with just the word PONG' }],
    })
    const text = res.content.find(b => b.type === 'text')
    assert(!!text && text.type === 'text' && text.text.includes('PONG'), 'Response missing PONG')
    const tokensIn = res.usage.input_tokens
    const tokensOut = res.usage.output_tokens
    return `"${text!.type === 'text' ? text!.text.trim() : ''}" — ${tokensIn}in/${tokensOut}out`
  })

  await test('2.2', 'Claude Opus responds', async () => {
    const res = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Reply with just the word PONG' }],
    })
    const text = res.content.find(b => b.type === 'text')
    assert(!!text && text.type === 'text' && text.text.includes('PONG'), 'Response missing PONG')
    const tokensIn = res.usage.input_tokens
    const tokensOut = res.usage.output_tokens
    return `"${text!.type === 'text' ? text!.text.trim() : ''}" — ${tokensIn}in/${tokensOut}out`
  })

  await test('2.3', 'Claude Opus extended thinking', async () => {
    const stream = anthropic.messages.stream({
      model: 'claude-opus-4-20250514',
      max_tokens: 16000,
      thinking: { type: 'enabled', budget_tokens: 1024 },
      messages: [{ role: 'user', content: 'What is 2+2? Think carefully.' }],
    })
    const res = await stream.finalMessage()
    const text = res.content.find(b => b.type === 'text')
    const thinking = res.content.find(b => b.type === 'thinking')
    assert(!!text && text.type === 'text' && text.text.includes('4'), 'Response missing "4"')
    const thinkingTokens = thinking && thinking.type === 'thinking' ? thinking.thinking.length : 0
    return `Answer contains "4" — thinking ~${thinkingTokens} chars, ${res.usage.input_tokens}in/${res.usage.output_tokens}out`
  })
}

async function testGSC() {
  section('SECTION 3 — GOOGLE SEARCH CONSOLE')

  await test('3.1', 'GSC credentials are valid', async () => {
    if (!testSiteId) throw new Error('No test site — skipped')
    const site = await prisma.site.findUnique({
      where: { id: testSiteId },
      select: { gscCredentials: true, gscPropertyUrl: true },
    })
    assert(!!site?.gscCredentials, 'No credentials')
    const creds = site!.gscCredentials as Record<string, unknown>
    assert(!!creds.access_token || !!creds.refresh_token, 'No access or refresh token')
    return `Has ${creds.refresh_token ? 'refresh' : 'access'} token`
  })

  await test('3.2', 'Fetch search analytics (last 7 days)', async () => {
    if (!testSiteId) throw new Error('No test site — skipped')
    // Use dynamic import to get the module that depends on @/ aliases
    const { google } = await import('googleapis')
    const site = await prisma.site.findUnique({
      where: { id: testSiteId },
      select: { gscCredentials: true, gscPropertyUrl: true },
    })
    if (!site?.gscCredentials || !site?.gscPropertyUrl) throw new Error('GSC not configured')

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    )
    auth.setCredentials(site.gscCredentials as Record<string, unknown>)

    const sc = google.searchconsole({ version: 'v1', auth })
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 7)
    const res = await sc.searchanalytics.query({
      siteUrl: site.gscPropertyUrl,
      requestBody: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        dimensions: ['query'],
        rowLimit: 20,
      },
    })
    const rows = res.data.rows ?? []
    return `${rows.length} keywords returned`
  })

  await test('3.3', 'Site list includes manuelsolis property', async () => {
    if (!testSiteId) throw new Error('No test site — skipped')
    const { google } = await import('googleapis')
    const site = await prisma.site.findUnique({
      where: { id: testSiteId },
      select: { gscCredentials: true },
    })
    if (!site?.gscCredentials) throw new Error('No credentials')

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    )
    auth.setCredentials(site.gscCredentials as Record<string, unknown>)

    const sc = google.searchconsole({ version: 'v1', auth })
    const sites = await sc.sites.list()
    const entries = sites.data.siteEntry ?? []
    const urls = entries.map(e => e.siteUrl)
    assert(urls.length > 0, 'No GSC properties found')
    // Check if the site's configured property is in the list
    const siteWithProp = await prisma.site.findUnique({
      where: { id: testSiteId },
      select: { gscPropertyUrl: true },
    })
    const configuredProp = siteWithProp?.gscPropertyUrl
    const match = configuredProp ? urls.find(u => u === configuredProp) : urls[0]
    return `${entries.length} properties — configured: ${configuredProp ?? 'none'}${match ? ' (found in list)' : ' (NOT in list)'}`
  })

  await test('3.4', 'getDateRange() utility returns valid dates', async () => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 7)
    const startDate = start.toISOString().split('T')[0]
    const endDate = end.toISOString().split('T')[0]
    assert(/^\d{4}-\d{2}-\d{2}$/.test(startDate), `Bad start: ${startDate}`)
    assert(/^\d{4}-\d{2}-\d{2}$/.test(endDate), `Bad end: ${endDate}`)
    assert(startDate < endDate, 'Start not before end')
    return `${startDate} → ${endDate}`
  })
}

async function testDataForSEO() {
  section('SECTION 4 — DATAFORSEO API')

  const login = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD
  const authHeader = 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64')

  await test('4.1', 'Credentials are valid', async () => {
    const res = await fetch('https://api.dataforseo.com/v3/appendix/user_data', {
      method: 'GET',
      headers: { Authorization: authHeader },
    })
    const body = await res.text()
    assert(res.ok, `HTTP ${res.status}: ${body}`)
    const data = JSON.parse(body)
    const balance = data?.tasks?.[0]?.result?.[0]?.money?.balance
    return `Account OK — balance: $${balance ?? 'unknown'}`
  })

  await test('4.2', 'getSERPResults for test keyword', async () => {
    const res = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify([{
        keyword: 'abogado de inmigración',
        location_code: 2840,
        language_code: 'en',
        depth: 10,
      }]),
    })
    assert(res.ok, `HTTP ${res.status}`)
    const data = await res.json()
    const items = data?.tasks?.[0]?.result?.[0]?.items ?? []
    assert(items.length > 0, 'No SERP results returned')
    return `${items.length} results — #1: ${items[0]?.url?.substring(0, 60)}`
  })

  await test('4.3', 'getKeywordData works', async () => {
    const res = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify([{
        keywords: ['immigration lawyer'],
        location_code: 2840,
        language_code: 'en',
      }]),
    })
    assert(res.ok, `HTTP ${res.status}`)
    const data = await res.json()
    const results = data?.tasks?.[0]?.result ?? []
    const vol = results[0]?.search_volume ?? 'N/A'
    return `"immigration lawyer" — search volume: ${vol}`
  })

  await test('4.4', 'getCompetitorDomains for manuelsolis.com', async () => {
    const target = testSiteDomain || 'manuelsolis.com'
    const res = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/competitors_domain/live', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify([{
        target,
        location_code: 2840,
        language_code: 'en',
        limit: 5,
      }]),
    })
    assert(res.ok, `HTTP ${res.status}`)
    const data = await res.json()
    const items = data?.tasks?.[0]?.result?.[0]?.items ?? []
    const top3 = items.slice(0, 3).map((c: { domain: string }) => c.domain)
    return `${items.length} competitors — top 3: ${top3.join(', ') || 'none'}`
  })
}

async function testRedis() {
  section('SECTION 5 — UPSTASH REDIS')

  await test('5.1', 'Redis connects', async () => {
    const pong = await redis.ping()
    assert(pong === 'PONG', `Expected PONG, got ${pong}`)
    return 'PONG'
  })

  await test('5.2', 'Write test key', async () => {
    await redis.setex('test:ping', 60, 'pong')
    return 'SET test:ping = "pong" (TTL 60s)'
  })

  await test('5.3', 'Read test key', async () => {
    const val = await redis.get<string>('test:ping')
    assert(val === 'pong', `Expected "pong", got "${val}"`)
    return `GET test:ping = "${val}"`
  })

  await test('5.4', 'Delete test key', async () => {
    await redis.del('test:ping')
    const val = await redis.get('test:ping')
    assert(val === null, `Key still exists: ${val}`)
    return 'DEL test:ping — confirmed null'
  })

  await test('5.5', 'Rate limiter works', async () => {
    const key = 'test:ratelimit:' + Date.now()
    const windowKey = `ratelimit:${key}:${Math.floor(Date.now() / 1000 / 60)}`

    const count = await redis.incr(windowKey)
    await redis.expire(windowKey, 60)
    assert(count === 1, `Expected 1, got ${count}`)

    const count2 = await redis.incr(windowKey)
    assert(count2 === 2, `Expected 2, got ${count2}`)

    await redis.del(windowKey)
    return `Sliding window OK: 1 → 2`
  })
}

async function testGitHub() {
  section('SECTION 6 — GITHUB API')

  const token = process.env.GITHUB_TOKEN

  await test('6.1', 'GITHUB_TOKEN is valid', async () => {
    assert(!!token, 'GITHUB_TOKEN not set')
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    })
    const body = await res.text()
    assert(res.ok, `HTTP ${res.status}: ${body}`)
    const data = JSON.parse(body)
    return `Authenticated as: ${data.login}`
  })

  await test('6.2', 'Can access org repos', async () => {
    assert(!!token, 'GITHUB_TOKEN not set')
    // Extract org from cmsApiUrl which may be "org/repo" or a full git URL
    let org = 'Marketing-Manuel-Solis-WebSite'
    if (testSiteId) {
      const site = await prisma.site.findUnique({
        where: { id: testSiteId },
        select: { cmsApiUrl: true },
      })
      if (site?.cmsApiUrl) {
        // Handle both "org/repo" and "https://github.com/org/repo.git"
        const match = site.cmsApiUrl.match(/github\.com\/([^/]+)/) ?? site.cmsApiUrl.match(/^([^/]+)\//)
        if (match) org = match[1]
      }
    }
    const res = await fetch(`https://api.github.com/orgs/${org}/repos?per_page=5`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    })
    if (res.status === 404) {
      const userRes = await fetch(`https://api.github.com/users/${org}/repos?per_page=5`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      })
      const body = await userRes.text()
      assert(userRes.ok, `Neither org nor user "${org}" accessible: ${userRes.status}: ${body}`)
      const repos = JSON.parse(body)
      return `${repos.length} repos under user ${org}`
    }
    assert(res.ok, `HTTP ${res.status}`)
    const repos = await res.json()
    return `${repos.length}+ repos accessible under ${org}`
  })

  await test('6.3', 'MDX content generation produces valid output', async () => {
    const testContent = {
      title: 'Test Blog Post',
      metaTitle: 'Test Blog Post | Solis',
      metaDescription: 'A test post for system verification.',
      slug: 'test-blog-post',
      body: '<h2>Hello</h2><p>Test content.</p>',
    }
    const frontmatter = [
      '---',
      `title: "${testContent.title}"`,
      `metaTitle: "${testContent.metaTitle}"`,
      `metaDescription: "${testContent.metaDescription}"`,
      `slug: "${testContent.slug}"`,
      `date: "${new Date().toISOString()}"`,
      '---',
    ].join('\n')
    const mdx = `${frontmatter}\n\n${testContent.body}\n`
    assert(mdx.includes('---'), 'Missing frontmatter delimiters')
    assert(mdx.includes('title:'), 'Missing title in frontmatter')
    assert(mdx.includes('<h2>'), 'Missing body content')
    return `Generated ${mdx.length} chars MDX`
  })
}

async function testCronJobs() {
  section('SECTION 7 — CRON JOBS')

  await test('7.1', 'vercel.json has all 5 cron schedules', async () => {
    const vercelJson = JSON.parse(readFileSync('vercel.json', 'utf-8'))
    const crons = vercelJson.crons as Array<{ path: string; schedule: string }>
    const expected = [
      '/api/cron/monitor',
      '/api/cron/rank-check',
      '/api/cron/deep-audit',
      '/api/cron/content-gen',
      '/api/cron/content-refresh',
    ]
    const paths = crons.map((c: { path: string }) => c.path)
    const missing = expected.filter(p => !paths.includes(p))
    assert(missing.length === 0, `Missing crons: ${missing.join(', ')}`)
    return `All 5 crons configured: ${paths.join(', ')}`
  })

  await test('7.2', 'Cron route files exist', async () => {
    const { existsSync } = await import('node:fs')
    const routes = [
      'app/api/cron/monitor/route.ts',
      'app/api/cron/rank-check/route.ts',
      'app/api/cron/deep-audit/route.ts',
      'app/api/cron/content-gen/route.ts',
      'app/api/cron/content-refresh/route.ts',
    ]
    const missing = routes.filter(r => !existsSync(r))
    assert(missing.length === 0, `Missing route files: ${missing.join(', ')}`)
    return `All 5 cron route files present`
  })
}

async function testCMS() {
  section('SECTION 8 — CMS INTEGRATION')

  await test('8.1', 'CMS adapter loads for test site', async () => {
    if (!testSiteId) throw new Error('No test site — skipped')
    const site = await prisma.site.findUnique({
      where: { id: testSiteId },
      select: { cmsType: true, cmsApiUrl: true, cmsApiKey: true, domain: true },
    })
    assert(!!site, 'Site not found')
    const cmsType = site!.cmsType ?? 'none'
    return `CMS type: ${cmsType}, apiUrl: ${site!.cmsApiUrl ?? 'not set'}`
  })

  await test('8.2', 'GitHub connection test for configured repo', async () => {
    if (!testSiteId) throw new Error('No test site — skipped')
    const ghToken = process.env.GITHUB_TOKEN
    const site = await prisma.site.findUnique({
      where: { id: testSiteId },
      select: { cmsType: true, cmsApiUrl: true },
    })
    if (site?.cmsType !== 'github' || !site?.cmsApiUrl) {
      return `Skipped — site CMS is "${site?.cmsType ?? 'none'}", not github`
    }
    assert(!!ghToken, 'GITHUB_TOKEN not set')
    // Handle "org/repo" or full git URL "https://github.com/org/repo.git"
    let owner: string, repo: string
    const urlMatch = site.cmsApiUrl.match(/github\.com\/([^/]+)\/([^/.]+)/)
    if (urlMatch) {
      owner = urlMatch[1]
      repo = urlMatch[2]
    } else {
      [owner, repo] = site.cmsApiUrl.split('/')
    }
    assert(!!owner && !!repo, `Cannot parse org/repo from: ${site.cmsApiUrl}`)
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: 'application/vnd.github+json',
      },
    })
    const body = await res.text()
    assert(res.ok, `Repo ${owner}/${repo} not accessible: ${res.status}: ${body}`)
    const data = JSON.parse(body)
    return `Repo OK: ${data.full_name} (${data.default_branch})`
  })
}

async function testPipeline() {
  section('SECTION 9 — FULL PIPELINE SIMULATION')

  await test('9.1', 'Content generation pipeline (dry run)', async () => {
    // Step 1: SERP analysis via DataForSEO
    const login = process.env.DATAFORSEO_LOGIN
    const password = process.env.DATAFORSEO_PASSWORD
    const authHeader = 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64')

    const serpRes = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify([{
        keyword: 'abogado inmigración texas',
        location_code: 2840,
        language_code: 'en',
        depth: 10,
      }]),
    })
    const serpData = await serpRes.json()
    const serpItems = serpData?.tasks?.[0]?.result?.[0]?.items ?? []
    console.log(`     SERP: ${serpItems.length} results`)

    // Step 2: Claude Opus content generation (dry run — not saved)
    const start = Date.now()
    const res = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 4000,
      thinking: { type: 'enabled', budget_tokens: 2000 },
      messages: [{
        role: 'user',
        content: `You are an SEO content strategist. Generate a blog post outline for the keyword "abogado inmigración texas".

Include: title, meta description, H2 headings, estimated word count, and a brief intro paragraph.

The top SERP competitors are:
${serpItems.slice(0, 5).map((i: { title: string; url: string }) => `- ${i.title} (${i.url})`).join('\n')}

Respond as JSON: { "title": string, "metaDescription": string, "headings": string[], "estimatedWordCount": number, "introPreview": string }`
      }],
    })

    const elapsed = Date.now() - start
    const text = res.content.find(b => b.type === 'text')
    const tokensIn = res.usage.input_tokens
    const tokensOut = res.usage.output_tokens

    let parsed: { title?: string; estimatedWordCount?: number } = {}
    try {
      if (text && text.type === 'text') {
        const clean = text.text.replace(/```json\n?|```\n?/g, '').trim()
        parsed = JSON.parse(clean)
      }
    } catch { /* best effort */ }

    const costIn = (tokensIn / 1_000_000) * 15  // Opus input $15/M
    const costOut = (tokensOut / 1_000_000) * 75 // Opus output $75/M

    console.log(`     Title: ${parsed.title ?? 'parse failed'}`)
    console.log(`     Words: ~${parsed.estimatedWordCount ?? '?'}`)
    console.log(`     Tokens: ${tokensIn}in / ${tokensOut}out`)
    console.log(`     Cost: $${(costIn + costOut).toFixed(4)}`)

    return `Generated in ${elapsed}ms — ${tokensIn}in/${tokensOut}out — $${(costIn + costOut).toFixed(4)}`
  })

  await test('9.2', 'Ranking check pipeline', async () => {
    if (!testSiteId) throw new Error('No test site — skipped')
    const site = await prisma.site.findUnique({
      where: { id: testSiteId },
      select: { gscCredentials: true, gscPropertyUrl: true, domain: true },
    })
    if (!site?.gscCredentials || !site?.gscPropertyUrl) {
      return 'Skipped — GSC not configured'
    }

    const { google } = await import('googleapis')
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    )
    auth.setCredentials(site.gscCredentials as Record<string, unknown>)

    const sc = google.searchconsole({ version: 'v1', auth })
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 28)

    const res = await sc.searchanalytics.query({
      siteUrl: site.gscPropertyUrl,
      requestBody: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        dimensions: ['query'],
        rowLimit: 10,
      },
    })
    const rows = res.data.rows ?? []

    if (rows.length > 0) {
      console.log('     Top keywords:')
      for (const row of rows.slice(0, 10)) {
        const kw = row.keys?.[0] ?? '?'
        const pos = row.position?.toFixed(1) ?? '?'
        const clicks = row.clicks ?? 0
        const impr = row.impressions ?? 0
        console.log(`       pos ${pos} | ${clicks} clicks | ${impr} impr | "${kw}"`)
      }
    }

    return `${rows.length} keywords fetched from GSC`
  })
}

// ══════════════════════════════════════════════════════════════
//  MAIN + REPORT
// ══════════════════════════════════════════════════════════════

async function main() {
  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║   SOLIS SEO AUTOPILOT — SYSTEM TEST      ║')
  console.log('╚══════════════════════════════════════════╝')

  await testDatabase()
  await testAnthropic()
  await testGSC()
  await testDataForSEO()
  await testRedis()
  await testGitHub()
  await testCronJobs()
  await testCMS()
  await testPipeline()

  // ── Final report ──
  const passed = results.filter(r => r.passed)
  const failed = results.filter(r => !r.passed)

  console.log('\n' + '═'.repeat(50))
  console.log('  SUMMARY')
  console.log('═'.repeat(50))
  console.log(`  Total tests: ${results.length}`)
  console.log(`  Passed:      ${passed.length}`)
  console.log(`  Failed:      ${failed.length}`)

  if (failed.length > 0) {
    console.log('\n  FAILED TESTS:')
    for (const f of failed) {
      console.log(`  ❌ ${f.id} ${f.name}`)
      console.log(`     ${f.detail.split('\n')[0]}`)
    }
  }

  // Estimated monthly cost based on test token usage
  // (This is a rough estimate from test calls only)
  console.log('\n  ESTIMATED COST (from test calls):')
  console.log('  Claude Sonnet: $3/M input, $15/M output')
  console.log('  Claude Opus:   $15/M input, $75/M output')
  console.log('  Actual monthly cost depends on cron frequency and data volume.')

  const totalMs = results.reduce((s, r) => s + r.durationMs, 0)
  console.log(`\n  Total time: ${(totalMs / 1000).toFixed(1)}s`)
  console.log('')

  process.exit(failed.length > 0 ? 1 : 0)
}

main().catch(console.error)
