import 'server-only';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { AIProviderError } from './provider';

const GENERATION_LIMIT = 3;
const WINDOW_SECONDS = 24 * 60 * 60;
const redisScript = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
if current >= tonumber(ARGV[1]) then return 0 end
current = redis.call('INCR', KEYS[1])
if current == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2])) end
return 1
`;

type RateLimitEnvironment = Record<string, string | undefined>;
type Fetcher = typeof fetch;

export function clientIpFromRequest(request: Request): string | null {
  const header = request.headers.get('x-vercel-forwarded-for')
    ?? request.headers.get('x-forwarded-for')
    ?? request.headers.get('x-real-ip');
  const candidate = header?.split(',')[0]?.trim();
  return candidate && isIP(candidate) ? candidate : null;
}
export async function consumeGeneration(
  ip: string | null,
  env: RateLimitEnvironment = process.env,
  fetcher: Fetcher = fetch,
): Promise<boolean> {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  const hashSecret = env.RATE_LIMIT_HASH_SECRET;
  if (!ip || !url || !token || !hashSecret || Buffer.byteLength(hashSecret, 'utf8') < 32) {
    throw new AIProviderError('rate-limit-unavailable', 'redis-misconfigured');
  }

  const ipHash = createHmac('sha256', hashSecret).update(ip).digest('hex');
  const endpoint = url.endsWith('/') ? url : `${url}/`;

  try {
    const response = await fetcher(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['EVAL', redisScript, 1, `prompt2project:generation:v1:${ipHash}`, GENERATION_LIMIT, WINDOW_SECONDS]),
      cache: 'no-store',
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) {
      const category = response.status === 401 || response.status === 403 ? 'redis-misconfigured' : 'redis-unavailable';
      throw new AIProviderError('rate-limit-unavailable', category, response.status);
    }
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object' || !('result' in payload) || (payload.result !== 0 && payload.result !== 1)) {
      throw new AIProviderError('rate-limit-unavailable', 'redis-unavailable');
    }
    return payload.result === 1;
  } catch (error) {
    if (error instanceof AIProviderError) throw error;
    throw new AIProviderError('rate-limit-unavailable', 'redis-unavailable');
  }
}
