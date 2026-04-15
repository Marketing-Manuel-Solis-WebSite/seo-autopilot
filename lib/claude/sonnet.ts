import { getAnthropic, MODELS } from './client'
import type { MonitorResult, FixSuggestionResult } from './types'
import { withRetry } from '@/lib/utils/retry'
import { logClaudeCost } from '@/lib/costs/tracker'
import { safeParseJSON } from '@/lib/utils/helpers'

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
          content: `Eres un monitor SEO automatizado de alta precision. Analiza estos datos exhaustivamente.

SITIO: ${input.site.domain}
SNAPSHOT: ${JSON.stringify(input.auditSnapshot)}
CAMBIOS DE RANKING: ${JSON.stringify(input.rankingChanges)}

${input.instruction}

CRITERIOS DE EVALUACION:
1. Rankings cayendo 3+ posiciones en keywords con volumen > 500 → status "critical"
2. Rankings cayendo 3+ posiciones en keywords con volumen > 100 → status "warning"
3. CTR promedio < 2% → warning (posibles problemas de meta titles/descriptions)
4. Caidas simultaneas en multiples keywords → posible problema algoritmico, status "critical"
5. Keywords nuevas apareciendo en top 20 → oportunidad a reportar
6. Detectar patrones: caidas solo en mobile vs desktop, solo en ciertas categorias, etc.

ANALISIS REQUERIDO:
- Distinguir entre fluctuacion normal (1-2 pos) y caida real (3+ pos)
- Identificar si las caidas son en keywords de alto o bajo valor
- Detectar oportunidades de quick win (posiciones 4-10)
- Evaluar la salud general del sitio basado en tendencias

Responde SOLO en JSON valido:
{
  "status": "ok|warning|critical",
  "issues": ["string — descripcion precisa del problema"],
  "opportunities": ["string — oportunidad concreta y accionable"],
  "rankingAlerts": ["string — alerta especifica con keyword, posicion anterior y actual"],
  "recommendedActions": [{"action": "string", "priority": "high|medium|low", "isDestructive": false}]
}`,
        },
      ],
    }),
    { maxAttempts: 3, baseDelayMs: 1000, label: 'Claude Sonnet monitor' },
  )

  logClaudeCost('claude-sonnet', response.usage.input_tokens, response.usage.output_tokens, 'monitor')

  const textContent = response.content.find(block => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Claude Sonnet did not return text content')
  }

  return safeParseJSON<MonitorResult>(textContent.text, 'Claude Sonnet monitor')
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

  logClaudeCost('claude-sonnet', response.usage.input_tokens, response.usage.output_tokens, 'fix-suggestion')

  const textContent = response.content.find(block => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Claude Sonnet did not return text content')
  }

  return safeParseJSON<FixSuggestionResult>(textContent.text, 'Claude Sonnet fix suggestion')
}
