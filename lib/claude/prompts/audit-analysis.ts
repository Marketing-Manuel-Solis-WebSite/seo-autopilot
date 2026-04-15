export function buildAuditAnalysisPrompt(site: { domain: string; name: string }, auditData: unknown, rankingHistory: unknown, competitors: unknown) {
  return `Eres el SEO Strategist mas avanzado del mundo. Analiza los siguientes datos de forma exhaustiva y milimetrica.

DATOS DEL SITIO:
Dominio: ${site.domain}
Nombre: ${site.name}

AUDITORIA COMPLETA:
${JSON.stringify(auditData, null, 2)}

HISTORIAL DE RANKINGS (ultimas 4 semanas):
${JSON.stringify(rankingHistory, null, 2)}

ANALISIS DE COMPETENCIA:
${JSON.stringify(competitors, null, 2)}

INSTRUCCION PRINCIPAL:
Genera el plan SEO completo semanal con precision milimetrica.

ANALISIS REQUERIDO:
1. Identifica las 5 oportunidades de mayor impacto con estimacion de trafico
2. Crea un plan de contenido para los proximos 30 dias
3. Detecta cualquier riesgo de penalizacion
4. Analisis E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
5. Clasificacion de intencion de busqueda para cada keyword (informational, commercial, transactional, navigational)
6. Analisis de Core Web Vitals si hay datos disponibles
7. Deteccion de canibalizacion de keywords
8. Evaluacion de estructura de enlaces internos
9. Analisis de featured snippets y oportunidades de posicion 0
10. Deteccion de thin content y contenido duplicado

PRIORIDADES (en orden):
1. Proteger rankings actuales
2. Recuperar keywords con caida reciente
3. Capturar quick wins (posiciones 4-10)
4. Crecer en nuevas keywords de alto volumen
5. Nuevo contenido para gaps de competencia

REGLAS ABSOLUTAS:
1. NUNCA sugieras eliminar contenido sin analisis de impacto completo
2. NUNCA sugieras cambios que puedan decrecer rankings actuales
3. Toda sugerencia destructiva debe venir con plan de rollback detallado
4. Prioriza siempre: primero proteger lo que funciona, luego crecer
5. Incluye nivel de confianza (alta/media/baja) en cada recomendacion
6. Especifica metricas esperadas para cada accion (trafico estimado, mejora de posicion)

Responde en JSON con esta estructura:
{
  "executiveSummary": "string — resumen ejecutivo de 3-5 oraciones",
  "seoHealthScore": 0-100,
  "criticalIssues": [{ "title": "", "impact": "descripcion del impacto en trafico/rankings", "fix": "solucion detallada paso a paso", "priority": "critical|high|medium|low", "confidence": "alta|media|baja" }],
  "rankingProtectionActions": [{ "keyword": "", "risk": "descripcion del riesgo", "action": "accion concreta", "urgency": "immediate|high|medium|low", "currentPosition": 0, "estimatedRecovery": "dias estimados" }],
  "contentOpportunities": [{ "topic": "", "keyword": "", "volume": 0, "difficulty": 0, "intent": "informational|commercial|transactional|navigational", "estimatedTraffic": 0, "confidence": "alta|media|baja" }],
  "technicalFixes": [{ "issue": "", "affectedUrls": [], "fix": "", "isDestructive": false, "rollbackPlan": "", "priority": "critical|high|medium|low" }],
  "competitorGaps": [{ "competitor": "", "keyword": "", "ourPosition": 0, "theirPosition": 0, "action": "", "estimatedEffort": "bajo|medio|alto" }],
  "monthlyContentPlan": [{ "week": 1, "contentType": "", "title": "", "keyword": "", "targetUrl": "", "intent": "", "estimatedWordCount": 0 }],
  "estimatedTrafficGain": "string — rango numerico estimado",
  "cannibalizationRisks": [{ "keyword": "", "urls": [], "recommendation": "" }],
  "eatAssessment": { "experience": 0, "expertise": 0, "authority": 0, "trust": 0, "overallScore": 0, "improvements": [] }
}`
}
