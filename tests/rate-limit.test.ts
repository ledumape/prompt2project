import { afterEach, describe, expect, it, vi } from 'vitest';
import { clientIpFromRequest, consumeGeneration } from '../lib/ai/rate-limit';

vi.mock('server-only', () => ({}));

const windowMs = 24 * 60 * 60 * 1000;

function fakeRedis() {
  const counters = new Map<string, { count: number; expiresAt: number }>();
  let now = 1_800_000_000_000;
  const fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const command = JSON.parse(String(init?.body)) as unknown[];
    const key = String(command[3]);
    const limit = Number(command[4]);
    let entry = counters.get(key);
    if (!entry || entry.expiresAt <= now) {
      entry = { count: 0, expiresAt: now + windowMs };
      counters.set(key, entry);
    }
    const allowed = entry.count < limit;
    if (allowed) entry.count += 1;
    return new Response(JSON.stringify({ result: allowed ? 1 : 0 }), { status: 200 });
  });
  return {
    fetch,
    advance: (ms: number) => { now += ms; },
  };
}

const env = {
  UPSTASH_REDIS_REST_URL: 'https://redis.example.test',
  UPSTASH_REDIS_REST_TOKEN: 'test-redis-token',
  RATE_LIMIT_HASH_SECRET: 'test-hash-secret-with-enough-entropy',
};

describe('shared generation rate limit', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps the rate limit active in Preview when a stale bypass variable exists', async () => {
    const redis = fakeRedis();
    const previewEnv = {
      ...env,
      VERCEL_ENV: 'preview',
      PREVIEW_AI_RATE_LIMIT_DISABLED: 'true',
    };

    const results = await Promise.all([1, 2, 3, 4].map(() =>
      consumeGeneration('203.0.113.5', previewEnv, redis.fetch)));

    expect(results).toEqual([true, true, true, false]);
  });

  it('keeps the shared limiter active in Production even if the Preview flag is set', async () => {
    const redis = fakeRedis();
    const productionEnv = {
      ...env,
      VERCEL_ENV: 'production',
      PREVIEW_AI_RATE_LIMIT_DISABLED: 'true',
    };

    const results = await Promise.all([1, 2, 3, 4].map(() =>
      consumeGeneration('203.0.113.5', productionEnv, redis.fetch)));

    expect(results).toEqual([true, true, true, false]);
  });

  it('allows three generations and blocks the fourth for one IP', async () => {
    const redis = fakeRedis();
    const results = await Promise.all([1, 2, 3, 4].map(() => consumeGeneration('203.0.113.5', env, redis.fetch)));

    expect(results).toEqual([true, true, true, false]);
  });

  it('resets the quota after the 24-hour window', async () => {
    const redis = fakeRedis();
    for (let index = 0; index < 3; index += 1) await consumeGeneration('203.0.113.5', env, redis.fetch);
    expect(await consumeGeneration('203.0.113.5', env, redis.fetch)).toBe(false);

    redis.advance(windowMs + 1);

    expect(await consumeGeneration('203.0.113.5', env, redis.fetch)).toBe(true);
  });

  it('keeps separate quotas for different IPs without sending raw IPs to storage', async () => {
    const redis = fakeRedis();
    const firstIp = '203.0.113.5';
    const secondIp = '203.0.113.6';
    for (let index = 0; index < 3; index += 1) await consumeGeneration(firstIp, env, redis.fetch);

    expect(await consumeGeneration(secondIp, env, redis.fetch)).toBe(true);
    const serializedCommands = JSON.stringify(redis.fetch.mock.calls.map((call) => JSON.parse(String(call[1]?.body))));
    expect(serializedCommands).not.toContain(firstIp);
    expect(serializedCommands).not.toContain(secondIp);
  });

  it('fails closed if Redis rejects the rate-limit request', async () => {
    const redisFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 429 }));

    await expect(consumeGeneration('203.0.113.5', env, redisFetch)).rejects.toMatchObject({
      code: 'rate-limit-unavailable', category: 'redis-unavailable', upstreamStatus: 429,
    });
  });

  it('classifies Redis authorization failures as configuration problems without exposing response text', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('private redis detail', { status: 401 }));

    await expect(consumeGeneration('203.0.113.5', env, fetcher)).rejects.toMatchObject({
      code: 'rate-limit-unavailable', category: 'redis-misconfigured', upstreamStatus: 401,
    });
  });

  it('fails closed when the shared rate-limit store is not configured', async () => {
    await expect(consumeGeneration('203.0.113.5', {}, vi.fn())).rejects.toMatchObject({
      code: 'rate-limit-unavailable', category: 'redis-misconfigured',
    });
  });

  it('rejects a weak IP-hashing secret', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: 1 }), { status: 200 }));

    await expect(consumeGeneration('203.0.113.5', { ...env, RATE_LIMIT_HASH_SECRET: 'too-short' }, fetcher))
      .rejects.toMatchObject({ code: 'rate-limit-unavailable' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('uses the Vercel-provided client IP header and validates the address', () => {
    const request = new Request('https://app.example/api/spec', {
      headers: { 'x-vercel-forwarded-for': '203.0.113.9', 'x-forwarded-for': '198.51.100.2' },
    });
    const invalid = new Request('https://app.example/api/spec', { headers: { 'x-forwarded-for': 'not-an-ip' } });

    expect(clientIpFromRequest(request)).toBe('203.0.113.9');
    expect(clientIpFromRequest(invalid)).toBeNull();
  });
});
