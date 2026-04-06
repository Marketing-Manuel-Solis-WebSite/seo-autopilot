export function buildRankProtectionPrompt(site: { domain: string }, decliningKeywords: unknown, recentChanges: unknown) {
  return `ALERTA: Se detectaron caídas de ranking en ${site.domain}.

KEYWORDS EN DESCENSO:
${JSON.stringify(decliningKeywords, null, 2)}

CAMBIOS RECIENTES EN EL SITIO:
${JSON.stringify(recentChanges, null, 2)}

PRIORIDAD MÁXIMA: Diagnosticar la causa de las caídas y proponer acciones correctivas inmediatas.

Analiza:
1. ¿Las caídas correlacionan con algún cambio reciente en el sitio?
2. ¿Hay una actualización algorítmica de Google reciente que pueda explicar esto?
3. ¿Los competidores hicieron mejoras que nos desplazaron?
4. ¿Hay problemas técnicos (velocidad, mobile, indexación)?

Responde en JSON:
{
  "diagnosis": "string",
  "severity": "critical|high|medium|low",
  "probableCause": "string",
  "immediateActions": [{ "action": "", "priority": "", "expectedRecovery": "" }],
  "preventiveActions": [{ "action": "", "timeline": "" }],
  "monitoringPlan": "string"
}`
}
