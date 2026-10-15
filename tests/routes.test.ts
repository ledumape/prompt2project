import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST as analyze } from '../app/api/discovery/route';
import { POST as generateSpec } from '../app/api/spec/route';
import { AIProviderError } from '../lib/ai/provider';
import { apiErrorResponse, logSafeAIError, readJsonBody } from '../lib/ai/route-utils';
import { consumeGeneration } from '../lib/ai/rate-limit';

const { analyzeIdeaMock, generateSpecMock } = vi.hoisted(() => ({
  analyzeIdeaMock: vi.fn().mockResolvedValue({ projectUnderstanding: 'A clear project plan.' }),
  generateSpecMock: vi.fn().mockResolvedValue({ overview: { summary: 'A clear project plan.' } }),
}));

vi.mock('server-only', () => ({}));
vi.mock('../lib/ai/provider-factory', () => ({
  createAIProvider: () => ({ analyzeIdea: analyzeIdeaMock, generateSpec: generateSpecMock }),
}));
vi.mock('../lib/ai/rate-limit', () => ({
  clientIpFromRequest: vi.fn(() => '203.0.113.5'),
  consumeGeneration: vi.fn().mockResolvedValue(true),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.mocked(consumeGeneration).mockReset().mockResolvedValue(true);
  analyzeIdeaMock.mockReset().mockResolvedValue({ projectUnderstanding: 'A clear project plan.' });
  generateSpecMock.mockReset().mockResolvedValue({ overview: { summary: 'A clear project plan.' } });
});

describe('API request boundaries', () => {
  it('rejects invalid discovery input before looking for Gemini credentials', async () => {
    const response = await analyze(new Request('http://local/api/discovery', { method: 'POST', body: '{}' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toHaveProperty('error');
    expect(consumeGeneration).not.toHaveBeenCalled();
  });

  it('rejects incomplete spec requests without invoking Gemini', async () => {
    const response = await generateSpec(new Request('http://local/api/spec', { method: 'POST', body: '{}' }));
    expect(response.status).toBe(400);
    expect(consumeGeneration).not.toHaveBeenCalled();
  });

  it('returns a request-too-large error for oversized data', async () => {
    await expect(readJsonBody(new Request('http://local', { method: 'POST', body: 'x'.repeat(65_537) })))
      .rejects.toMatchObject({ code: 'request-too-large' });
    expect(apiErrorResponse(new AIProviderError('request-too-large')).status).toBe(413);
  });

  it('keeps missing-key and model-output failures actionable without exposing internals', async () => {
    const missingKey = await apiErrorResponse(new AIProviderError('configuration')).json();
    const badModel = await apiErrorResponse(new AIProviderError('invalid-response')).json();
    expect(missingKey.error).toContain('API key');
    expect(badModel.error).toContain('AI returned a response');
    expect(JSON.stringify(badModel)).not.toContain('stack');
  });

  it('returns Gemini quota exhaustion as an actionable 429', async () => {
    const response = apiErrorResponse(new AIProviderError('rate-limited'));
    expect(response.status).toBe(429);
    expect((await response.json()).error).toContain('limit');
  });

  it('checks the shared IP quota before generating valid Discovery', async () => {
    const response = await analyze(new Request('http://local/api/discovery', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.5' },
      body: JSON.stringify({ idea: 'A group trip planner', outputLanguage: 'English' }),
    }));

    expect(response.status).toBe(200);
    expect(consumeGeneration).toHaveBeenCalledOnce();
    expect(consumeGeneration).toHaveBeenCalledWith('203.0.113.5');
    expect(analyzeIdeaMock).toHaveBeenCalledOnce();
  });

  it('checks the shared IP quota before generating a valid Project Spec', async () => {
    const response = await generateSpec(new Request('http://local/api/spec', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.5' },
      body: JSON.stringify({
        input: { idea: 'A group trip planner', outputLanguage: 'English' },
        discovery: { projectUnderstanding: 'A group trip planner.', knownInformation: [], missingInformation: [], questions: [], challenges: [], readyForSpec: true },
        answers: {}, challengeDecisions: {},
      }),
    }));

    expect(response.status).toBe(200);
    expect(consumeGeneration).toHaveBeenCalledOnce();
    expect(consumeGeneration).toHaveBeenCalledWith('203.0.113.5');
    expect(generateSpecMock).toHaveBeenCalledOnce();
  });

  it('returns a friendly 429 without calling the provider when Discovery quota is exhausted', async () => {
    vi.mocked(consumeGeneration).mockResolvedValue(false);
    const response = await analyze(new Request('http://local/api/discovery', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.5' },
      body: JSON.stringify({ idea: 'A group trip planner', outputLanguage: 'English' }),
    }));

    expect(response.status).toBe(429);
    expect((await response.json()).error).toContain('24 hours');
    expect(analyzeIdeaMock).not.toHaveBeenCalled();
  });

  it('returns a friendly 429 without calling the provider when Project Spec quota is exhausted', async () => {
    vi.mocked(consumeGeneration).mockResolvedValue(false);
    const response = await generateSpec(new Request('http://local/api/spec', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.5' },
      body: JSON.stringify({
        input: { idea: 'A group trip planner', outputLanguage: 'English' },
        discovery: { projectUnderstanding: 'A group trip planner.', knownInformation: [], missingInformation: [], questions: [], challenges: [], readyForSpec: true },
        answers: {}, challengeDecisions: {},
      }),
    }));

    expect(response.status).toBe(429);
    expect((await response.json()).error).toContain('24 hours');
    expect(generateSpecMock).not.toHaveBeenCalled();
  });

  it('fails closed with a friendly 503 when the rate-limit store is unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(consumeGeneration).mockRejectedValueOnce(
      new AIProviderError('rate-limit-unavailable', 'redis-unavailable'),
    );
    const response = await analyze(new Request('http://local/api/discovery', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.5' },
      body: JSON.stringify({ idea: 'A group trip planner', outputLanguage: 'English' }),
    }));

    expect(response.status).toBe(503);
    expect((await response.json()).error).toBe('AI generation is temporarily unavailable. Please try again later.');
    expect(analyzeIdeaMock).not.toHaveBeenCalled();
  });

  it('returns a generic temporary-unavailable response for OpenRouter budget exhaustion', async () => {
    const response = apiErrorResponse(new AIProviderError('unavailable'));

    expect(response.status).toBe(503);
    expect((await response.json()).error).toBe('AI generation is temporarily unavailable. Please try again later.');
  });

  it('logs only safe provider metadata and key presence for a 503', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const secretEnv = {
      AI_PROVIDER: 'openrouter',
      UPSTASH_REDIS_REST_URL: 'https://private-redis.example',
      UPSTASH_REDIS_REST_TOKEN: 'private-redis-token',
      OPENROUTER_API_KEY: 'private-openrouter-key',
    };

    logSafeAIError(new AIProviderError('unavailable', 'provider-budget', 402), 503, secretEnv);

    expect(log).toHaveBeenCalledWith('AI route failure', {
      category: 'provider-budget',
      status: 402,
      hasOpenRouterApiKey: true,
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain('private-redis.example');
    expect(JSON.stringify(log.mock.calls)).not.toContain('private-redis-token');
    expect(JSON.stringify(log.mock.calls)).not.toContain('private-openrouter-key');
  });

  it('logs an allowlisted validation failure without any rejected response data', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new AIProviderError('invalid-response', 'schema-mismatch', 200, 'schema-mismatch');

    logSafeAIError(error, 502, { AI_PROVIDER: 'openrouter', OPENROUTER_API_KEY: 'private-openrouter-key' });

    expect(log).toHaveBeenCalledWith('AI route failure', {
      category: 'schema-mismatch', status: 200, validationFailure: 'schema-mismatch', hasOpenRouterApiKey: true,
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain('private-openrouter-key');
  });

  it('logs only Redis variable presence for rate-limit failures and ignores non-server errors', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    logSafeAIError(new AIProviderError('rate-limit-unavailable', 'redis-misconfigured'), 503, {
      UPSTASH_REDIS_REST_URL: 'https://private-redis.example',
    });
    logSafeAIError(new AIProviderError('generation-limit'), 429, {});

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('AI route failure', {
      category: 'redis-misconfigured',
      status: 503,
      hasUpstashUrl: true,
      hasUpstashToken: false,
    });
  });

});
