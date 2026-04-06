export function buildCompetitorAnalysisPrompt(site: { domain: string }, competitors: unknown, rankings: unknown) {
  return `Analiza la competencia SEO para ${site.domain}.

COMPETIDORES:
${JSON.stringify(competitors, null, 2)}

NUESTROS RANKINGS:
${JSON.stringify(rankings, null, 2)}

Identifica:
1. Brechas de contenido — temas que cubren los competidores pero nosotros no
2. Ventajas actuales — donde los superamos
3. Amenazas — competidores creciendo rápidamente
4. Oportunidades de backlinks — fuentes que linkan a competidores pero no a nosotros

Responde en JSON:
{
  "contentGaps": [{ "topic": "", "competitors": [], "estimatedTraffic": 0, "difficulty": "" }],
  "ourAdvantages": [{ "keyword": "", "ourPos": 0, "nearestCompetitor": "", "theirPos": 0 }],
  "risingThreats": [{ "competitor": "", "growthRate": "", "keywordsGained": 0, "focus": "" }],
  "backlinkOpportunities": [{ "source": "", "da": 0, "linksTo": [], "approach": "" }]
}`
}
