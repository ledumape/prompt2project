import { NextResponse } from 'next/server';
import { AIProviderError } from './provider';

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

export function apiErrorResponse(error: unknown): NextResponse {
  if (error instanceof SyntaxError || (error instanceof AIProviderError && error.code === 'invalid-response')) {
    const isAIResponse = error instanceof AIProviderError;
    return jsonNoStore({ error: isAIResponse ? 'The AI returned a response that could not be validated. Please try again.' : 'The request could not be read. Check the submitted data and try again.' }, { status: isAIResponse ? 502 : 400 });
  }
  if (error instanceof AIProviderError && error.code === 'request-too-large') {
    return jsonNoStore({ error: 'This request is too large. Shorten the project details and try again.' }, { status: 413 });
  }
  if (error instanceof AIProviderError && error.code === 'configuration') {
    return jsonNoStore({ error: 'The Gemini API key or access to the selected model is unavailable. Check the server API key and model access.' }, { status: 503 });
  }
  if (error instanceof AIProviderError && error.code === 'rate-limited') {
    return jsonNoStore({ error: 'The Gemini usage limit has been reached. Wait for the limit to reset or check the model quota, then try again.' }, { status: 429 });
  }
  if (error instanceof AIProviderError && error.code === 'provider-request') {
    return jsonNoStore({ error: 'Gemini rejected the structured request. Check the configured model and response schema, then try again.' }, { status: 502 });
  }
  if (error instanceof AIProviderError && error.code === 'unavailable') {
    return jsonNoStore({ error: 'The AI service could not complete this request. Check your connection and try again.' }, { status: 502 });
  }
  return jsonNoStore({ error: 'Something went wrong while processing this request.' }, { status: 500 });
}
