import type { CMSAdapter, CMSSite, PublishResult } from './types'

const GITHUB_API = 'https://api.github.com'

function getToken(): string {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN env var is not set')
  return token
}

function parseRepo(site: CMSSite): { owner: string; repo: string; blogPath: string } {
  if (!site.cmsApiUrl) {
    throw new Error('GitHub repo not configured. Set "org/repo" in CMS API URL.')
  }
  const [owner, repo] = site.cmsApiUrl.split('/')
  if (!owner || !repo) {
    throw new Error(`Invalid GitHub repo format: "${site.cmsApiUrl}". Expected "org/repo-name".`)
  }
  const blogPath = site.cmsApiKey || 'content/blog'
  return { owner, repo, blogPath }
}

function headers() {
  return {
    Authorization: `Bearer ${getToken()}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function getDefaultBranch(owner: string, repo: string): Promise<string> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers: headers() })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub repo lookup failed ${res.status}: ${text}`)
  }
  const data = await res.json()
  return data.default_branch ?? 'main'
}

async function createOrUpdateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string,
): Promise<{ sha: string; htmlUrl: string }> {
  // Check if file already exists (to get its sha for updates)
  let existingSha: string | undefined
  const getRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    { headers: headers() },
  )
  if (getRes.ok) {
    const existing = await getRes.json()
    existingSha = existing.sha
  }

  const body: Record<string, string> = {
    message,
    content: Buffer.from(content).toString('base64'),
    branch,
  }
  if (existingSha) body.sha = existingSha

  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    { method: 'PUT', headers: headers(), body: JSON.stringify(body) },
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub file create/update failed ${res.status}: ${text}`)
  }

  const data = await res.json()
  return { sha: data.content.sha, htmlUrl: data.content.html_url }
}

function buildMarkdown(content: {
  title: string
  body: string
  slug: string | null
  metaTitle: string | null
  metaDescription: string | null
  schema: unknown
}): string {
  const frontmatter = [
    '---',
    `title: "${content.title.replace(/"/g, '\\"')}"`,
    content.metaTitle ? `metaTitle: "${content.metaTitle.replace(/"/g, '\\"')}"` : null,
    content.metaDescription ? `metaDescription: "${content.metaDescription.replace(/"/g, '\\"')}"` : null,
    content.slug ? `slug: "${content.slug}"` : null,
    `date: "${new Date().toISOString()}"`,
    '---',
  ].filter(Boolean).join('\n')

  return `${frontmatter}\n\n${content.body}\n`
}

export const github: CMSAdapter = {
  async publishPost(site, content): Promise<PublishResult> {
    try {
      const { owner, repo, blogPath } = parseRepo(site)
      const branch = await getDefaultBranch(owner, repo)
      const slug = content.slug ?? content.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const filePath = `${blogPath}/${slug}.mdx`
      const markdown = buildMarkdown(content)

      const { htmlUrl } = await createOrUpdateFile(
        owner, repo, filePath, markdown,
        `feat(blog): add ${content.title}`,
        branch,
      )

      const liveUrl = `https://${site.domain}/${slug}`

      return { success: true, postId: filePath, url: liveUrl }
    } catch (error) {
      return { success: false, error: `GitHub publish failed: ${(error as Error).message}` }
    }
  },

  async updatePost(site, postId, data): Promise<PublishResult> {
    try {
      const { owner, repo } = parseRepo(site)
      const branch = await getDefaultBranch(owner, repo)

      // postId is the file path (e.g. "app/blog/my-post.mdx")
      const getRes = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/contents/${postId}?ref=${branch}`,
        { headers: headers() },
      )

      if (!getRes.ok) {
        return { success: false, error: `File not found: ${postId}` }
      }

      const existing = await getRes.json()
      let fileContent = Buffer.from(existing.content, 'base64').toString('utf-8')

      // Update frontmatter fields
      if (data.metaTitle) {
        fileContent = fileContent.replace(/^metaTitle:.*$/m, `metaTitle: "${data.metaTitle.replace(/"/g, '\\"')}"`)
      }
      if (data.metaDescription) {
        fileContent = fileContent.replace(/^metaDescription:.*$/m, `metaDescription: "${data.metaDescription.replace(/"/g, '\\"')}"`)
      }
      if (data.title) {
        fileContent = fileContent.replace(/^title:.*$/m, `title: "${data.title.replace(/"/g, '\\"')}"`)
      }
      if (data.body) {
        // Replace everything after the frontmatter closing ---
        fileContent = fileContent.replace(/(---\n\n)[\s\S]*$/, `$1${data.body}\n`)
      }

      await createOrUpdateFile(
        owner, repo, postId, fileContent,
        `fix(blog): update ${postId}`,
        branch,
      )

      return { success: true, postId }
    } catch (error) {
      return { success: false, error: `GitHub update failed: ${(error as Error).message}` }
    }
  },

  async applyMetaFix(site, slug, metaTitle, metaDescription): Promise<PublishResult> {
    try {
      const { owner, repo, blogPath } = parseRepo(site)
      const filePath = `${blogPath}/${slug}.mdx`
      return github.updatePost(site, filePath, { metaTitle, metaDescription })
    } catch (error) {
      return { success: false, error: `GitHub meta fix failed: ${(error as Error).message}` }
    }
  },
}
