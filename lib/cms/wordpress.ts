import type { CMSAdapter, CMSSite, PublishResult } from './types'

function authHeader(apiKey: string): string {
  return `Basic ${Buffer.from(apiKey).toString('base64')}`
}

export const wordpress: CMSAdapter = {
  async publishPost(site, content): Promise<PublishResult> {
    if (!site.cmsApiUrl || !site.cmsApiKey) {
      return { success: false, error: 'WordPress API URL or API key not configured' }
    }

    try {
      const res = await fetch(`${site.cmsApiUrl}/wp-json/wp/v2/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader(site.cmsApiKey),
        },
        body: JSON.stringify({
          title: content.title,
          content: content.body,
          slug: content.slug,
          status: 'publish',
          meta: {
            _yoast_wpseo_title: content.metaTitle ?? content.title,
            _yoast_wpseo_metadesc: content.metaDescription ?? '',
          },
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        return { success: false, error: `WordPress API ${res.status}: ${text}` }
      }

      const post = await res.json()
      return { success: true, postId: String(post.id), url: post.link }
    } catch (error) {
      return { success: false, error: `WordPress publish failed: ${(error as Error).message}` }
    }
  },

  async updatePost(site, postId, data): Promise<PublishResult> {
    if (!site.cmsApiUrl || !site.cmsApiKey) {
      return { success: false, error: 'WordPress API URL or API key not configured' }
    }

    try {
      const body: Record<string, unknown> = {}
      if (data.title) body.title = data.title
      if (data.body) body.content = data.body
      if (data.metaTitle || data.metaDescription) {
        body.meta = {
          ...(data.metaTitle && { _yoast_wpseo_title: data.metaTitle }),
          ...(data.metaDescription && { _yoast_wpseo_metadesc: data.metaDescription }),
        }
      }

      const res = await fetch(`${site.cmsApiUrl}/wp-json/wp/v2/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader(site.cmsApiKey),
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text()
        return { success: false, error: `WordPress update ${res.status}: ${text}` }
      }

      const post = await res.json()
      return { success: true, postId: String(post.id), url: post.link }
    } catch (error) {
      return { success: false, error: `WordPress update failed: ${(error as Error).message}` }
    }
  },

  async applyMetaFix(site, slug, metaTitle, metaDescription): Promise<PublishResult> {
    if (!site.cmsApiUrl || !site.cmsApiKey) {
      return { success: false, error: 'WordPress API URL or API key not configured' }
    }

    try {
      // Find post by slug
      const searchRes = await fetch(
        `${site.cmsApiUrl}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}`,
        { headers: { Authorization: authHeader(site.cmsApiKey) } },
      )
      const posts = await searchRes.json()
      if (!Array.isArray(posts) || posts.length === 0) {
        return { success: false, error: `No post found with slug: ${slug}` }
      }

      // Only send fields that have actual values — skip empty strings to avoid overwriting
      const updateData: { metaTitle?: string; metaDescription?: string } = {}
      if (metaTitle) updateData.metaTitle = metaTitle
      if (metaDescription) updateData.metaDescription = metaDescription

      return wordpress.updatePost(site, String(posts[0].id), updateData)
    } catch (error) {
      return { success: false, error: `WordPress meta fix failed: ${(error as Error).message}` }
    }
  },
}
