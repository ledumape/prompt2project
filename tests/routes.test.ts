import { describe, expect, it, vi } from 'vitest';
import { POST as analyze } from '../app/api/discovery/route';
import { POST as generateSpec } from '../app/api/spec/route';
import { AIProviderError } from '../lib/ai/provider';
import { apiErrorResponse, readJsonBody } from '../lib/ai/route-utils';

vi.mock('server-only', () => ({}));

describe('API request boundaries', () => {
  it('rejects invalid discovery input before looking for Gemini credentials', async () => {
    const response = await analyze(new Request('http://local/api/discovery', { method: 'POST', body: '{}' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toHaveProperty('error');
  });

  it('rejects incomplete spec requests without invoking Gemini', async () => {
    const response = await generateSpec(new Request('http://local/api/spec', { method: 'POST', body: '{}' }));
    expect(response.status).toBe(400);
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
});
