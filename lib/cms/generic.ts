import type { CMSAdapter, CMSSite, PublishResult } from './types'

export const generic: CMSAdapter = {
  async publishPost(site, content): Promise<PublishResult> {
    if (!site.cmsApiUrl || !site.cmsApiKey) {
      return { success: false, error: 'CMS API URL or API key not configured. Configure in Settings.' }
    }

    try {
      const res = await fetch(`${site.cmsApiUrl}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${site.cmsApiKey}`,
        },
        body: JSON.stringify({
          title: content.title,
          body: content.body,
          slug: content.slug,
          metaTitle: content.metaTitle,
          metaDescription: content.metaDescription,
          schema: content.schema,
          status: 'publish',
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        return { success: false, error: `CMS API ${res.status}: ${text}` }
      }

      const post = await res.json()
      return {
        success: true,
        postId: post.id ?? post._id ?? undefined,
        url: post.url ?? post.link ?? `https://${site.domain}/${content.slug}`,
      }
    } catch (error) {
      return {
        success: false,
        error: `CMS publish failed: ${(error as Error).message}. Manually publish to ${site.domain}/${content.slug}`,
      }
    }
  },

  async updatePost(site, postId, data): Promise<PublishResult> {
    if (!site.cmsApiUrl || !site.cmsApiKey) {
      return { success: false, error: 'CMS not configured' }
    }

    try {
      const res = await fetch(`${site.cmsApiUrl}/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${site.cmsApiKey}`,
        },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const text = await res.text()
        return { success: false, error: `CMS update ${res.status}: ${text}` }
      }

      const post = await res.json()
      return { success: true, postId: post.id ?? postId, url: post.url ?? post.link }
    } catch (error) {
      return { success: false, error: `CMS update failed: ${(error as Error).message}` }
    }
  },

  async applyMetaFix(site, slug, metaTitle, metaDescription): Promise<PublishResult> {
    if (!site.cmsApiUrl || !site.cmsApiKey) {
      return { success: false, error: 'CMS not configured' }
    }

    try {
      const res = await fetch(`${site.cmsApiUrl}/posts?slug=${encodeURIComponent(slug)}`, {
        headers: { Authorization: `Bearer ${site.cmsApiKey}` },
      })
      const posts = await res.json()
      const post = Array.isArray(posts) ? posts[0] : posts?.items?.[0]
      if (!post) {
        return { success: false, error: `No post found with slug: ${slug}` }
      }

      return generic.updatePost(site, post.id ?? post._id, { metaTitle, metaDescription })
    } catch (error) {
      return { success: false, error: `CMS meta fix failed: ${(error as Error).message}` }
    }
  },
}
