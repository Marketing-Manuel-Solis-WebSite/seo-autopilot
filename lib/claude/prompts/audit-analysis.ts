export function buildAuditAnalysisPrompt(site: { domain: string; name: string }, auditData: unknown, rankingHistory: unknown, competitors: unknown) {
  return `Eres el SEO Strategist más avanzado del mundo. Analiza los siguientes datos de forma exhaustiva.

DATOS DEL SITIO:
Dominio: ${site.domain}
Nombre: ${site.name}

AUDITORÍA COMPLETA:
${JSON.stringify(auditData, null, 2)}

HISTORIAL DE RANKINGS (últimas 4 semanas):
${JSON.stringify(rankingHistory, null, 2)}

ANÁLISIS DE COMPETENCIA:
${JSON.stringify(competitors, null, 2)}

INSTRUCCIÓN:
Genera el plan SEO completo para esta semana.
Identifica las 5 oportunidades de mayor impacto.
Crea un plan de contenido para los próximos 30 días.
Detecta cualquier riesgo de penalización.
Prioriza: proteger rankings actuales > crecer en nuevas keywords > nuevo contenido.

REGLAS ABSOLUTAS:
1. NUNCA sugieras eliminar contenido sin análisis de impacto completo
2. NUNCA sugieras cambios que puedan decrecer rankings actuales
3. Toda sugerencia destructiva debe venir con plan de rollback
4. Prioriza siempre: primero proteger lo que funciona, luego crecer

Responde en JSON con esta estructura:
{
  "executiveSummary": "string",
  "seoHealthScore": 0-100,
  "criticalIssues": [{ "title": "", "impact": "", "fix": "", "priority": "" }],
  "rankingProtectionActions": [{ "keyword": "", "risk": "", "action": "", "urgency": "" }],
  "contentOpportunities": [{ "topic": "", "keyword": "", "volume": 0, "difficulty": 0, "intent": "", "estimatedTraffic": 0 }],
  "technicalFixes": [{ "issue": "", "affectedUrls": [], "fix": "", "isDestructive": false, "rollbackPlan": "" }],
  "competitorGaps": [{ "competitor": "", "keyword": "", "ourPosition": 0, "theirPosition": 0, "action": "" }],
  "monthlyContentPlan": [{ "week": 1, "contentType": "", "title": "", "keyword": "", "targetUrl": "" }],
  "estimatedTrafficGain": "string"
}`
}
