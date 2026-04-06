import { getRedis } from '@/lib/upstash/redis'

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const redis = getRedis()
  const now = Math.floor(Date.now() / 1000)
  const windowKey = `ratelimit:${key}:${Math.floor(now / windowSeconds)}`

  const count = await redis.incr(windowKey)
  if (count === 1) {
    await redis.expire(windowKey, windowSeconds)
  }

  const remaining = Math.max(0, limit - count)
  const resetAt = (Math.floor(now / windowSeconds) + 1) * windowSeconds

  return {
    allowed: count <= limit,
    remaining,
    resetAt,
  }
}
