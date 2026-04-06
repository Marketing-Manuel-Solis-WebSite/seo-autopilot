import type { SERPAnalysis } from '@/lib/serp/analyzer'
import type { TopicMap } from '@/lib/seo/topical-authority'

export function buildContentGenerationPrompt(input: {
  siteContext: unknown
  contentBrief: unknown
  targetKeyword: string
  contentType: string
  wordCount: number
  serpAnalysis?: SERPAnalysis
  topicMapContext?: { pillarOpportunities: TopicMap['pillarOpportunities']; clusters: TopicMap['clusters'] }
}) {
  const serpSection = input.serpAnalysis
    ? `
ANÁLISIS SERP — Los siguientes 10 resultados actualmente rankean para "${input.targetKeyword}":
${input.serpAnalysis.top10Results.map((r, i) => `${i + 1}. ${r.title} — ${r.url}`).join('\n')}

Tu artículo DEBE SER MÁS COMPLETO que todos ellos.
- Promedio de palabras del top 10: ${input.serpAnalysis.averageWordCount}. Escribe mínimo ${Math.round(input.serpAnalysis.averageWordCount * 1.3)} palabras.
- Formato dominante: ${input.serpAnalysis.dominantContentFormat}. Usa este formato.
- Featured snippet: ${input.serpAnalysis.featuredSnippetExists ? `Sí, formato "${input.serpAnalysis.featuredSnippetFormat}". Optimiza para capturar el snippet.` : 'No detectado.'}
- Gaps de contenido no cubiertos por el top 10: ${input.serpAnalysis.contentGaps.join(', ')}. CUBRE TODOS estos gaps.
- Competidores principales: ${input.serpAnalysis.topCompetitorDomains.join(', ')}
`
    : ''

  const topicMapSection = input.topicMapContext && input.topicMapContext.clusters.length > 0
    ? `
TOPICAL AUTHORITY CONTEXT:
${input.topicMapContext.clusters.map(c => `- This article should strengthen the topic cluster: "${c.pillarTopic}" (pillar keyword: "${c.pillarKeyword}")
  - Coverage score: ${c.coverageScore}/100
  - Pillar page exists: ${c.hasPillarPage ? 'Yes' : 'No — this article may serve as a pillar page'}
  - Related subtopics to reference: ${c.subtopics.filter(s => s.covered).map(s => s.keyword).join(', ')}`).join('\n')}
${input.topicMapContext.pillarOpportunities.length > 0 ? `\nPillar opportunities to support: ${input.topicMapContext.pillarOpportunities.map(p => `"${p.topic}" (${p.estimatedImpact} impact)`).join(', ')}` : ''}
Ensure this article reinforces the topical cluster through semantic relevance and internal linking opportunities.
`
    : ''

  return `Eres un experto en SEO y copywriting. Genera contenido de máxima calidad.

CONTEXTO DEL SITIO: ${JSON.stringify(input.siteContext)}
BRIEF: ${JSON.stringify(input.contentBrief)}
KEYWORD OBJETIVO: ${input.targetKeyword}
TIPO DE CONTENIDO: ${input.contentType}
PALABRAS OBJETIVO: ${input.wordCount}
${serpSection}${topicMapSection}
GENERA:
1. Un artículo completo optimizado para SEO
2. Meta title (60 chars máx)
3. Meta description (160 chars máx)
4. Schema markup JSON-LD apropiado
5. Internal linking suggestions

REGLAS:
- Keyword density natural: 1-2%
- Headings H2/H3 con variaciones semánticas
- Contenido E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
- Sin keyword stuffing
- Incluir tabla de contenidos si > 1500 palabras
${input.serpAnalysis?.featuredSnippetFormat === 'list' ? '- Incluir una lista resumen al inicio para capturar featured snippet' : ''}
${input.serpAnalysis?.featuredSnippetFormat === 'table' ? '- Incluir una tabla comparativa/resumen para capturar featured snippet' : ''}
${input.serpAnalysis?.featuredSnippetFormat === 'paragraph' ? '- Incluir un párrafo definitorio claro al inicio (~50 palabras) para capturar featured snippet' : ''}

Responde en JSON:
{
  "title": "string",
  "slug": "string",
  "metaTitle": "string",
  "metaDescription": "string",
  "body": "HTML completo del artículo",
  "schema": {},
  "internalLinkSuggestions": [],
  "estimatedReadTime": "string",
  "seoScore": 0-100
}`
}
