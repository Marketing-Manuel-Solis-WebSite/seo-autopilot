import { getAnthropic, MODELS } from './client'
import type { MonitorResult, FixSuggestionResult } from './types'
import { withRetry } from '@/lib/utils/retry'

export async function claudeSonnetMonitor(input: {
  site: { id: string; domain: string; name: string }
  auditSnapshot: unknown
  rankingChanges: unknown
  instruction: string
}): Promise<MonitorResult> {
  const response = await withRetry(
    () => getAnthropic().messages.create({
      model: MODELS.SONNET,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Eres un monitor SEO automatizado. Analiza estos datos rápidamente.

SITIO: ${input.site.domain}
SNAPSHOT: ${JSON.stringify(input.auditSnapshot)}
CAMBIOS DE RANKING: ${JSON.stringify(input.rankingChanges)}

${input.instruction}

PRIORIDAD ABSOLUTA: Si detectas rankings cayendo más de 3 posiciones en keywords con volumen > 500, marca status como "critical".

Responde SOLO en JSON válido:
{
  "status": "ok|warning|critical",
  "issues": ["string"],
  "opportunities": ["string"],
  "rankingAlerts": ["string"],
  "recommendedActions": [{"action": "string", "priority": "high|medium|low", "isDestructive": false}]
}`,
        },
      ],
    }),
    { maxAttempts: 3, baseDelayMs: 1000, label: 'Claude Sonnet monitor' },
  )

  const textContent = response.content.find(block => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Claude Sonnet did not return text content')
  }

  const clean = textContent.text.replace(/```json\n?|```\n?/g, '').trim()
  return JSON.parse(clean) as MonitorResult
}

export async function claudeSonnetFixSuggestion(input: {
  issue: string
  siteContext: unknown
  currentValue: string
}): Promise<FixSuggestionResult> {
  const response = await withRetry(
    () => getAnthropic().messages.create({
      model: MODELS.SONNET,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Genera un fix SEO específico para este problema:

PROBLEMA: ${input.issue}
CONTEXTO: ${JSON.stringify(input.siteContext)}
VALOR ACTUAL: ${input.currentValue}

Responde en JSON:
{
  "fixTitle": "string",
  "currentValue": "string",
  "proposedValue": "string",
  "explanation": "string",
  "isDestructive": false,
  "estimatedImpact": "high|medium|low",
  "implementation": "string"
}`,
        },
      ],
    }),
    { maxAttempts: 3, baseDelayMs: 1000, label: 'Claude Sonnet fix suggestion' },
  )

  const textContent = response.content.find(block => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Claude Sonnet did not return text content')
  }

  const clean = textContent.text.replace(/```json\n?|```\n?/g, '').trim()
  return JSON.parse(clean) as FixSuggestionResult
}
