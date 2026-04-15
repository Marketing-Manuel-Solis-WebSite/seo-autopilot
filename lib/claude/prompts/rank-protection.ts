export function buildRankProtectionPrompt(site: { domain: string }, decliningKeywords: unknown, recentChanges: unknown) {
  return `ALERTA CRITICA: Se detectaron caidas de ranking en ${site.domain}.

KEYWORDS EN DESCENSO:
${JSON.stringify(decliningKeywords, null, 2)}

CAMBIOS RECIENTES EN EL SITIO:
${JSON.stringify(recentChanges, null, 2)}

PRIORIDAD MAXIMA: Diagnosticar la causa de las caidas y proponer acciones correctivas inmediatas.

ANALISIS REQUERIDO:
1. Correlacion con cambios recientes — ¿las caidas coinciden con algun cambio en el sitio?
2. Actualizaciones algoritmicas — ¿hay alguna actualizacion reciente de Google Core/Spam/Helpful Content?
3. Competencia — ¿los competidores mejoraron su contenido o ganaron backlinks?
4. Problemas tecnicos — velocidad, mobile-friendliness, indexacion, errores de servidor
5. Contenido — ¿el contenido se volvio thin, desactualizado o perdio relevancia?
6. Backlinks — ¿se perdieron backlinks de calidad o se ganaron toxicos?
7. User signals — ¿cambio el CTR, bounce rate, o dwell time?
8. Canibalizacion — ¿hay paginas compitiendo internamente por la misma keyword?

REGLAS DE DIAGNOSTICO:
- Distinguir entre fluctuacion normal (1-2 posiciones) y caida real (3+ posiciones)
- Considerar estacionalidad del nicho
- No recomendar acciones destructivas sin evidencia clara
- Priorizar acciones por velocidad de recuperacion esperada

Responde en JSON:
{
  "diagnosis": "string — diagnostico detallado",
  "severity": "critical|high|medium|low",
  "probableCause": "string — causa mas probable con evidencia",
  "isAlgorithmicUpdate": false,
  "isCompetitorDriven": false,
  "isTechnicalIssue": false,
  "immediateActions": [{ "action": "", "priority": "critical|high|medium|low", "expectedRecoveryDays": 0, "isDestructive": false }],
  "preventiveActions": [{ "action": "", "timeline": "", "effort": "bajo|medio|alto" }],
  "monitoringPlan": "string — que metricas monitorear y con que frecuencia",
  "rollbackRecommendation": "string — si se deben revertir cambios recientes"
}`
}
