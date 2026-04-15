export function buildFixGenerationPrompt(issue: string, siteContext: unknown, currentValue: string) {
  return `Genera un fix SEO especifico, detallado y accionable para este problema.

PROBLEMA: ${issue}
CONTEXTO DEL SITIO: ${JSON.stringify(siteContext)}
VALOR ACTUAL: ${currentValue}

ANALISIS REQUERIDO:
1. Diagnostica la causa raiz del problema
2. Evalua el impacto actual en rankings y trafico
3. Propone una solucion concreta y segura
4. Incluye pasos de validacion post-implementacion
5. Proporciona plan de rollback si el fix no funciona

REGLAS:
- El fix NO debe ser destructivo a menos que sea absolutamente necesario
- Si es destructivo, marca isDestructive como true y explica por que
- La implementacion debe ser paso a paso, clara y ejecutable
- Incluye metricas para medir el exito del fix

Responde en JSON:
{
  "fixTitle": "string — titulo descriptivo del fix",
  "currentValue": "string — valor actual problematico",
  "proposedValue": "string — nuevo valor propuesto",
  "explanation": "string — por que este fix resuelve el problema",
  "isDestructive": false,
  "estimatedImpact": "high|medium|low",
  "implementation": "string — pasos detallados para implementar",
  "rollbackPlan": "string — como revertir si algo sale mal",
  "validationSteps": "string — como verificar que el fix funciono",
  "estimatedRecoveryDays": 0
}`
}
