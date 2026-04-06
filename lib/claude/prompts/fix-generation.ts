export function buildFixGenerationPrompt(issue: string, siteContext: unknown, currentValue: string) {
  return `Genera un fix SEO específico para este problema:

PROBLEMA: ${issue}
CONTEXTO: ${JSON.stringify(siteContext)}
VALOR ACTUAL: ${currentValue}

Responde en JSON:
{
  "fixTitle": "string",
  "currentValue": "string",
  "proposedValue": "string",
  "explanation": "string",
  "isDestructive": false,
  "estimatedImpact": "high|medium|low",
  "implementation": "string"
}`
}
