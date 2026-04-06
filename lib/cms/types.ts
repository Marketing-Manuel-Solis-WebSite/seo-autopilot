export interface CMSSite {
  domain: string
  cmsType: string | null
  cmsApiUrl: string | null
  cmsApiKey: string | null
}

export interface PublishResult {
  success: boolean
  postId?: string
  url?: string
  error?: string
}

export interface CMSAdapter {
  publishPost(site: CMSSite, content: {
    title: string
    body: string
    slug: string | null
    metaTitle: string | null
    metaDescription: string | null
    schema: unknown
  }): Promise<PublishResult>

  updatePost(site: CMSSite, postId: string, data: {
    title?: string
    body?: string
    metaTitle?: string
    metaDescription?: string
  }): Promise<PublishResult>

  applyMetaFix(site: CMSSite, slug: string, metaTitle: string, metaDescription: string): Promise<PublishResult>
}
