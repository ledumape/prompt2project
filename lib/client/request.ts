type ParseResult<T> = { success: true; data: T } | { success: false };

export type RequestMessages = {
  serverUnreadable: string;
  requestFailed: string;
  invalidResponse: string;
  timedOut: string;
  rateLimited: string;
  aiUnavailable: string;
};

export async function postJson<T>(
  url: string,
  body: unknown,
  parse: (value: unknown) => ParseResult<T>,
  messages: RequestMessages,
  timeoutMs = 90_000,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let payload: unknown;
    try { payload = await response.json(); } catch { throw new Error(messages.serverUnreadable); }

    if (!response.ok) {
      if (response.status === 429) throw new Error(messages.rateLimited);
      if (response.status === 402 || response.status === 503) throw new Error(messages.aiUnavailable);
      const message = typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : messages.requestFailed;
      throw new Error(message);
    }

    const result = parse(payload);
    if (!result.success) throw new Error(messages.invalidResponse);
    return result.data;
  } catch (error) {
    if (controller.signal.aborted) throw new Error(messages.timedOut);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
