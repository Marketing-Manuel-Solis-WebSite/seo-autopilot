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
ANALISIS SERP — Los siguientes 10 resultados actualmente rankean para "${input.targetKeyword}":
${input.serpAnalysis.top10Results.map((r, i) => `${i + 1}. ${r.title} — ${r.url}`).join('\n')}

Tu articulo DEBE SER MAS COMPLETO que todos ellos.
- Promedio de palabras del top 10: ${input.serpAnalysis.averageWordCount}. Escribe minimo ${Math.round(input.serpAnalysis.averageWordCount * 1.3)} palabras.
- Formato dominante: ${input.serpAnalysis.dominantContentFormat}. Usa este formato.
- Featured snippet: ${input.serpAnalysis.featuredSnippetExists ? `Si, formato "${input.serpAnalysis.featuredSnippetFormat}". Optimiza para capturar el snippet.` : 'No detectado.'}
- Gaps de contenido no cubiertos por el top 10: ${input.serpAnalysis.contentGaps.join(', ')}. CUBRE TODOS estos gaps.
- Competidores principales: ${input.serpAnalysis.topCompetitorDomains.join(', ')}
`
    : ''

  const topicMapSection = input.topicMapContext && input.topicMapContext.clusters.length > 0
    ? `
CONTEXTO DE AUTORIDAD TOPICAL:
${input.topicMapContext.clusters.map(c => `- Este articulo debe fortalecer el cluster: "${c.pillarTopic}" (keyword pilar: "${c.pillarKeyword}")
  - Cobertura actual: ${c.coverageScore}/100
  - Pagina pilar existe: ${c.hasPillarPage ? 'Si' : 'No — este articulo puede servir como pagina pilar'}
  - Subtemas relacionados a referenciar: ${c.subtopics.filter(s => s.covered).map(s => s.keyword).join(', ')}`).join('\n')}
${input.topicMapContext.pillarOpportunities.length > 0 ? `\nOportunidades pilar a soportar: ${input.topicMapContext.pillarOpportunities.map(p => `"${p.topic}" (impacto ${p.estimatedImpact})`).join(', ')}` : ''}
Asegura que este articulo refuerce el cluster topical a traves de relevancia semantica y oportunidades de enlace interno.
`
    : ''

  return `Eres un experto en SEO y copywriting de nivel mundial. Genera contenido de la mas alta calidad.

CONTEXTO DEL SITIO: ${JSON.stringify(input.siteContext)}
BRIEF: ${JSON.stringify(input.contentBrief)}
KEYWORD OBJETIVO: ${input.targetKeyword}
TIPO DE CONTENIDO: ${input.contentType}
PALABRAS OBJETIVO: ${input.wordCount}
${serpSection}${topicMapSection}
GENERA:
1. Un articulo completo optimizado para SEO con HTML semantico
2. Meta title (MAXIMO 60 caracteres, incluir keyword al inicio)
3. Meta description (MAXIMO 160 caracteres, incluir keyword y CTA)
4. Schema markup JSON-LD apropiado (Article, BlogPosting, FAQPage segun corresponda)
5. Sugerencias de enlaces internos con anchor text especifico

REGLAS CRITICAS:
- Keyword density natural: 1-2% (no keyword stuffing)
- Headings H2/H3 con variaciones semanticas y LSI keywords
- Contenido E-E-A-T completo:
  * Experience: incluir ejemplos practicos y casos de uso
  * Expertise: datos, estadisticas y conocimiento profundo
  * Authoritativeness: referencias a fuentes confiables
  * Trustworthiness: informacion precisa y verificable
- Incluir tabla de contenidos con IDs para enlace directo si > 1500 palabras
- Parrafo introductorio de 50-80 palabras que resuma el valor del articulo
- Conclusion con CTA y resumen de puntos clave
- Imagenes: incluir alt text descriptivo con keyword en al menos una imagen
- HTML semantico: usar <article>, <section>, <figure>, <figcaption> correctamente
${input.serpAnalysis?.featuredSnippetFormat === 'list' ? '- Incluir una lista resumen al inicio (5-8 items) para capturar featured snippet' : ''}
${input.serpAnalysis?.featuredSnippetFormat === 'table' ? '- Incluir una tabla comparativa/resumen para capturar featured snippet' : ''}
${input.serpAnalysis?.featuredSnippetFormat === 'paragraph' ? '- Incluir un parrafo definitorio claro al inicio (~50 palabras) para capturar featured snippet' : ''}

Responde en JSON:
{
  "title": "string",
  "slug": "string — URL-friendly, lowercase, sin caracteres especiales",
  "metaTitle": "string — MAXIMO 60 caracteres",
  "metaDescription": "string — MAXIMO 160 caracteres con CTA",
  "body": "HTML completo del articulo con semantica correcta",
  "schema": { "@context": "https://schema.org", "@type": "Article|BlogPosting", ... },
  "internalLinkSuggestions": ["keyword/frase a enlazar — /url-destino"],
  "estimatedReadTime": "X min",
  "seoScore": 0-100
}`
}
