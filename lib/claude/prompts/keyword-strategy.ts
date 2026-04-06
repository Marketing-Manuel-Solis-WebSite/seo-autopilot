export function buildKeywordStrategyPrompt(site: { domain: string }, currentKeywords: unknown, competitors: unknown) {
  return `Analiza la estrategia de keywords para ${site.domain}.

KEYWORDS ACTUALES:
${JSON.stringify(currentKeywords, null, 2)}

COMPETENCIA:
${JSON.stringify(competitors, null, 2)}

Identifica:
1. Keywords donde estamos cerca de top 3 (posiciones 4-10) — quick wins
2. Keywords de alto volumen donde competidores nos superan
3. Keywords long-tail con baja dificultad y alto intent comercial
4. Keywords que estamos perdiendo (caídas recientes)

Responde en JSON:
{
  "quickWins": [{ "keyword": "", "currentPos": 0, "volume": 0, "action": "" }],
  "competitorGaps": [{ "keyword": "", "competitor": "", "theirPos": 0, "ourPos": 0, "volume": 0 }],
  "longTailOpportunities": [{ "keyword": "", "volume": 0, "difficulty": 0, "intent": "" }],
  "decliningKeywords": [{ "keyword": "", "previousPos": 0, "currentPos": 0, "urgency": "" }]
}`
}
