import { afterEach, describe, expect, it, vi } from 'vitest';
import { postJson } from '../lib/client/request';
import { tryWriteClipboard } from '../lib/client/clipboard';

const messages = {
  serverUnreadable: 'Unreadable response',
  requestFailed: 'Request failed',
  invalidResponse: 'Invalid response',
  timedOut: 'The request timed out. Try again.',
  rateLimited: 'Provider quota reached',
  aiUnavailable: 'AI temporarily unavailable',
};

const parseString = (value: unknown): { success: true; data: string } | { success: false } =>
  typeof value === 'string' ? { success: true, data: value } : { success: false };

describe('client request and clipboard behavior', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('aborts a stalled request and returns an actionable timeout message', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })));

    const request = postJson('/api/spec', {}, parseString, messages, 1_000);
    const rejection = expect(request).rejects.toThrow('The request timed out. Try again.');
    await vi.advanceTimersByTimeAsync(1_000);
    await rejection;
  });

  it('allows a user-triggered retry after a transient failure', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Request failed' }), { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify('ok'), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(postJson('/api/spec', {}, parseString, messages)).rejects.toThrow('Request failed');
    await expect(postJson('/api/spec', {}, parseString, messages)).resolves.toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('uses a localized quota message without exposing raw 429 or budget details', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'private quota detail' }), { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'billing detail' }), { status: 503 })));

    await expect(postJson('/api/spec', {}, parseString, messages)).rejects.toThrow('Provider quota reached');
    await expect(postJson('/api/spec', {}, parseString, messages)).rejects.toThrow('AI temporarily unavailable');
  });

  it('reports clipboard success and blocked access without throwing', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const deniedWriteText = vi.fn().mockRejectedValue(new Error('Permission denied'));

    await expect(tryWriteClipboard('coding prompt', writeText)).resolves.toBe(true);
    await expect(tryWriteClipboard('coding prompt', deniedWriteText)).resolves.toBe(false);
    expect(writeText).toHaveBeenCalledWith('coding prompt');
    expect(deniedWriteText).toHaveBeenCalledWith('coding prompt');
  });
});
