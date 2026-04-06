import type { CMSAdapter, CMSSite, PublishResult } from './types'

export const webflow: CMSAdapter = {
  async publishPost(site, content): Promise<PublishResult> {
    if (!site.cmsApiUrl || !site.cmsApiKey) {
      return { success: false, error: 'Webflow collection ID or API key not configured' }
    }

    // cmsApiUrl stores the collection ID for Webflow
    const collectionId = site.cmsApiUrl

    try {
      const res = await fetch(
        `https://api.webflow.com/v2/collections/${collectionId}/items`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${site.cmsApiKey}`,
          },
          body: JSON.stringify({
            isArchived: false,
            isDraft: false,
            fieldData: {
              name: content.title,
              slug: content.slug,
              'post-body': content.body,
              'meta-title': content.metaTitle ?? content.title,
              'meta-description': content.metaDescription ?? '',
            },
          }),
        },
      )

      if (!res.ok) {
        const text = await res.text()
        return { success: false, error: `Webflow API ${res.status}: ${text}` }
      }

      const item = await res.json()
      const url = `https://${site.domain}/${content.slug}`
      return { success: true, postId: item.id, url }
    } catch (error) {
      return { success: false, error: `Webflow publish failed: ${(error as Error).message}` }
    }
  },

  async updatePost(site, postId, data): Promise<PublishResult> {
    if (!site.cmsApiUrl || !site.cmsApiKey) {
      return { success: false, error: 'Webflow collection ID or API key not configured' }
    }

    const collectionId = site.cmsApiUrl

    try {
      const fieldData: Record<string, string> = {}
      if (data.title) fieldData.name = data.title
      if (data.body) fieldData['post-body'] = data.body
      if (data.metaTitle) fieldData['meta-title'] = data.metaTitle
      if (data.metaDescription) fieldData['meta-description'] = data.metaDescription

      const res = await fetch(
        `https://api.webflow.com/v2/collections/${collectionId}/items/${postId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${site.cmsApiKey}`,
          },
          body: JSON.stringify({ isArchived: false, isDraft: false, fieldData }),
        },
      )

      if (!res.ok) {
        const text = await res.text()
        return { success: false, error: `Webflow update ${res.status}: ${text}` }
      }

      const item = await res.json()
      return { success: true, postId: item.id, url: `https://${site.domain}/${item.fieldData?.slug ?? postId}` }
    } catch (error) {
      return { success: false, error: `Webflow update failed: ${(error as Error).message}` }
    }
  },

  async applyMetaFix(site, slug, metaTitle, metaDescription): Promise<PublishResult> {
    // Webflow doesn't support search-by-slug natively, so we use the collection items list
    if (!site.cmsApiUrl || !site.cmsApiKey) {
      return { success: false, error: 'Webflow not configured' }
    }

    const collectionId = site.cmsApiUrl

    try {
      const res = await fetch(
        `https://api.webflow.com/v2/collections/${collectionId}/items`,
        { headers: { Authorization: `Bearer ${site.cmsApiKey}` } },
      )
      const data = await res.json()
      const item = data.items?.find((i: { fieldData?: { slug?: string } }) => i.fieldData?.slug === slug)
      if (!item) {
        return { success: false, error: `No item found with slug: ${slug}` }
      }

      return webflow.updatePost(site, item.id, { metaTitle, metaDescription })
    } catch (error) {
      return { success: false, error: `Webflow meta fix failed: ${(error as Error).message}` }
    }
  },
}
