import { prisma } from '@/lib/prisma'
import type { SemrushKeywordData } from '@/types/seo'

export interface RankingChange {
  keyword: string
  previousPosition: number
  currentPosition: number
  change: number
  url: string
}

export const REQUIRES_APPROVAL = [
  'delete_content',
  'change_url_structure',
  'remove_redirect',
  'change_canonical',
  'merge_pages',
  'remove_keywords',
  'restructure_navigation',
  'change_title_tag',
  'add_redirect',
  'remove_page',
  'change_robots_txt',
  'modify_sitemap',
] as const

export const AUTO_APPLICABLE = [
  'fix_broken_link',
  'add_alt_text',
  'fix_meta_title',
  'fix_meta_description',
  'add_schema_markup',
  'fix_heading_structure',
  'compress_images',
  'fix_noindex_error',
] as const

export async function protectRankings(
  siteId: string,
  currentRankings: SemrushKeywordData[]
): Promise<RankingChange[]> {
  const previousRankings = await prisma.ranking.findMany({
    where: { siteId },
    orderBy: { checkedAt: 'desc' },
    distinct: ['keywordText'],
    take: 500,
  })

  const previousMap = new Map(
    previousRankings.map(r => [r.keywordText, r.position])
  )

  const changes: RankingChange[] = []

  for (const current of currentRankings) {
    const prevPos = previousMap.get(current.keyword)
    if (prevPos === undefined) continue

    const change = prevPos - current.position
    // Only log ranking records when there is actual movement (filter noise)
    if (change !== 0) {
      changes.push({
        keyword: current.keyword,
        previousPosition: prevPos,
        currentPosition: current.position,
        change,
        url: current.url,
      })

      await prisma.ranking.create({
        data: {
          siteId,
          keywordText: current.keyword,
          position: current.position,
          previousPos: prevPos,
          change,
          url: current.url,
        },
      })
    }
  }

  // Save new keywords that weren't tracked before
  for (const current of currentRankings) {
    if (!previousMap.has(current.keyword)) {
      await prisma.ranking.create({
        data: {
          siteId,
          keywordText: current.keyword,
          position: current.position,
          url: current.url,
        },
      })
    }
  }

  return changes.sort((a, b) => a.change - b.change)
}

export function isDestructiveAction(actionType: string): boolean {
  return (REQUIRES_APPROVAL as readonly string[]).includes(actionType)
}
