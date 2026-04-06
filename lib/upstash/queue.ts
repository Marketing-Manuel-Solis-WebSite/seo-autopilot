import { Client } from '@upstash/qstash'

let _qstash: Client | null = null

function getQStash(): Client {
  if (!_qstash) {
    _qstash = new Client({
      token: process.env.QSTASH_TOKEN!,
    })
  }
  return _qstash
}

export async function enqueueJob(url: string, body: unknown, options: { delay?: number; retries?: number } = {}) {
  const { delay, retries = 3 } = options
  return getQStash().publishJSON({
    url: `${process.env.APP_URL}${url}`,
    body,
    retries,
    ...(delay ? { delay } : {}),
  })
}

export async function enqueueBatch(jobs: Array<{ url: string; body: unknown }>) {
  return Promise.all(
    jobs.map(job =>
      getQStash().publishJSON({
        url: `${process.env.APP_URL}${job.url}`,
        body: job.body,
        retries: 3,
      })
    )
  )
}
