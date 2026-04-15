export function buildCompetitorAnalysisPrompt(site: { domain: string }, competitors: unknown, rankings: unknown) {
  return `Analiza la competencia SEO de forma exhaustiva para ${site.domain}.

COMPETIDORES:
${JSON.stringify(competitors, null, 2)}

NUESTROS RANKINGS:
${JSON.stringify(rankings, null, 2)}

ANALISIS REQUERIDO:
1. Brechas de contenido — temas que cubren los competidores pero nosotros no, con estimacion de trafico potencial
2. Ventajas actuales — donde los superamos, con analisis de por que y como proteger esa ventaja
3. Amenazas — competidores creciendo rapidamente, patrones de contenido y backlinks que estan usando
4. Oportunidades de backlinks — fuentes que linkan a competidores pero no a nosotros, con enfoque de adquisicion
5. Analisis de estrategia de contenido — formatos, frecuencia de publicacion, tipos de contenido exitosos
6. Analisis de intencion de busqueda — como los competidores atienden cada tipo de intent

Responde en JSON:
{
  "contentGaps": [{ "topic": "", "competitors": [], "estimatedTraffic": 0, "difficulty": 0, "intent": "informational|commercial|transactional", "priority": "high|medium|low" }],
  "ourAdvantages": [{ "keyword": "", "ourPos": 0, "nearestCompetitor": "", "theirPos": 0, "protectionStrategy": "" }],
  "risingThreats": [{ "competitor": "", "growthRate": 0, "keywordsGained": 0, "focus": "", "counterStrategy": "" }],
  "backlinkOpportunities": [{ "source": "", "da": 0, "linksTo": [], "approach": "", "estimatedDifficulty": "easy|medium|hard" }],
  "contentStrategyInsights": [{ "competitor": "", "publishFrequency": "", "topFormats": [], "avgWordCount": 0 }]
}`
}
