import { NextResponse } from 'next/server';
import { AIProviderError, type AIErrorCategory } from './provider';

const MAX_BODY_BYTES = 64 * 1024;

export async function readJsonBody(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) throw new AIProviderError('request-too-large');
  if (!request.body) throw new SyntaxError('Request body is empty.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteCount = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteCount += value.byteLength;
      if (byteCount > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new AIProviderError('request-too-large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(byteCount);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(body));
}

export function jsonNoStore(data: unknown, init?: ResponseInit): NextResponse {
  const response = NextResponse.json(data, init);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

type SafeObservabilityEnvironment = Record<string, string | undefined>;

export function logSafeAIError(
  error: unknown,
  status: number,
  env: SafeObservabilityEnvironment = process.env,
): void {
  if (status < 500) return;
  const category: AIErrorCategory = error instanceof AIProviderError ? error.category : 'unknown';
  const diagnosticStatus = error instanceof AIProviderError ? error.upstreamStatus ?? status : status;
  const safeDetails: Record<string, string | number | boolean> = { category, status: diagnosticStatus };
  if (error instanceof AIProviderError && error.validationFailure) {
    safeDetails.validationFailure = error.validationFailure;
  }
  if (category === 'redis-unavailable' || category === 'redis-misconfigured') {
    safeDetails.hasUpstashUrl = Boolean(env.UPSTASH_REDIS_REST_URL);
    safeDetails.hasUpstashToken = Boolean(env.UPSTASH_REDIS_REST_TOKEN);
  } else if (category.startsWith('provider-') || category === 'schema-mismatch' || category === 'unknown') {
    if (env.AI_PROVIDER?.toLowerCase() === 'openrouter') safeDetails.hasOpenRouterApiKey = Boolean(env.OPENROUTER_API_KEY);
  }
  console.error('AI route failure', safeDetails);
}

export function apiErrorResponse(error: unknown): NextResponse {
  if (error instanceof SyntaxError || (error instanceof AIProviderError && error.code === 'invalid-response')) {
    const isAIResponse = error instanceof AIProviderError;
    return jsonNoStore({ error: isAIResponse ? 'The AI returned a response that could not be validated. Please try again.' : 'The request could not be read. Check the submitted data and try again.' }, { status: isAIResponse ? 502 : 400 });
  }
  if (error instanceof AIProviderError && error.code === 'request-too-large') {
    return jsonNoStore({ error: 'This request is too large. Shorten the project details and try again.' }, { status: 413 });
  }
  if (error instanceof AIProviderError && error.code === 'configuration') {
    return jsonNoStore({ error: 'The selected AI provider API key or model access is unavailable. Check the server configuration and model access.' }, { status: 503 });
  }
  if (error instanceof AIProviderError && error.code === 'rate-limited') {
    return jsonNoStore({ error: 'The selected AI provider usage limit has been reached. Wait for it to reset or check the model quota, then try again.' }, { status: 429 });
  }
  if (error instanceof AIProviderError && error.code === 'generation-limit') {
    return jsonNoStore({ error: 'The daily generation limit has been reached. Please try again after 24 hours.' }, { status: 429 });
  }
  if (error instanceof AIProviderError && error.code === 'rate-limit-unavailable') {
    return jsonNoStore({ error: 'AI generation is temporarily unavailable. Please try again later.' }, { status: 503 });
  }
  if (error instanceof AIProviderError && error.code === 'provider-request') {
    return jsonNoStore({ error: 'The selected AI provider rejected the structured request. Check the configured model and response schema, then try again.' }, { status: 502 });
  }
  if (error instanceof AIProviderError && error.code === 'unavailable') {
    return jsonNoStore({ error: 'AI generation is temporarily unavailable. Please try again later.' }, { status: 503 });
  }
  return jsonNoStore({ error: 'Something went wrong while processing this request.' }, { status: 500 });
}
