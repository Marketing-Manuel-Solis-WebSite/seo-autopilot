export function buildKeywordStrategyPrompt(site: { domain: string }, currentKeywords: unknown, competitors: unknown) {
  return `Analiza la estrategia de keywords de forma exhaustiva para ${site.domain}.

KEYWORDS ACTUALES:
${JSON.stringify(currentKeywords, null, 2)}

COMPETENCIA:
${JSON.stringify(competitors, null, 2)}

ANALISIS REQUERIDO:
1. Quick wins — keywords donde estamos en posiciones 4-10 con alto volumen. Accion concreta para cada una.
2. Gaps competitivos — keywords de alto volumen donde competidores nos superan significativamente.
3. Long-tail — keywords con baja dificultad, alto intent comercial/transaccional, y oportunidad realista.
4. Keywords en declive — caidas recientes con urgencia de recuperacion.
5. Clusters tematicos — agrupacion semantica de keywords por temas para estrategia de contenido.
6. Clasificacion de intent — para cada keyword, indicar el tipo de intencion de busqueda.
7. Canibalizacion — detectar si multiples paginas compiten por la misma keyword.

REGLAS:
- Ordenar quick wins por impacto estimado (volumen x probabilidad de mejora)
- Para cada gap, estimar el esfuerzo requerido (contenido, backlinks, optimizacion on-page)
- Para long-tail, incluir solo keywords con volumen minimo de 50/mes
- Para declives, distinguir entre fluctuacion normal y tendencia preocupante

Responde en JSON:
{
  "quickWins": [{ "keyword": "", "currentPos": 0, "volume": 0, "action": "", "estimatedTrafficGain": 0, "intent": "" }],
  "competitorGaps": [{ "keyword": "", "competitor": "", "theirPos": 0, "ourPos": 0, "volume": 0, "effortLevel": "bajo|medio|alto" }],
  "longTailOpportunities": [{ "keyword": "", "volume": 0, "difficulty": 0, "intent": "informational|commercial|transactional|navigational", "suggestedContentType": "" }],
  "decliningKeywords": [{ "keyword": "", "previousPos": 0, "currentPos": 0, "urgency": "critica|alta|media|baja", "isNormalFluctuation": false, "recoveryAction": "" }],
  "thematicClusters": [{ "theme": "", "keywords": [], "totalVolume": 0, "suggestedPillar": "" }],
  "cannibalization": [{ "keyword": "", "competingUrls": [], "recommendation": "" }]
}`
}
