import { describe, expect, it, vi } from 'vitest';
import { createAIProvider } from '../lib/ai/provider-factory';
import { OpenRouterProvider } from '../lib/ai/openrouter';
import { GeminiProvider } from '../lib/ai/gemini';

vi.mock('server-only', () => ({}));

describe('AI provider selection', () => {
  it('uses Gemini by default to preserve existing configuration', () => {
    expect(createAIProvider({ GEMINI_API_KEY: 'gemini-key' })).toBeInstanceOf(GeminiProvider);
  });

  it('selects OpenRouter with the cost-controlled default model and allows an env override', () => {
    const defaultProvider = createAIProvider({ AI_PROVIDER: 'openrouter', OPENROUTER_API_KEY: 'openrouter-key' });
    const configuredProvider = createAIProvider({
      AI_PROVIDER: 'openrouter', OPENROUTER_API_KEY: 'openrouter-key', OPENROUTER_MODEL: 'openai/gpt-6-sol',
    });

    expect(defaultProvider).toBeInstanceOf(OpenRouterProvider);
    expect((defaultProvider as unknown as { model: string }).model).toBe('openai/gpt-6-luna');
    expect((configuredProvider as unknown as { model: string }).model).toBe('openai/gpt-6-sol');
  });

  it('requires the selected provider key and rejects unknown providers', () => {
    expect(() => createAIProvider({ AI_PROVIDER: 'openrouter' })).toThrowError();
    expect(() => createAIProvider({ AI_PROVIDER: 'unknown', GEMINI_API_KEY: 'key' })).toThrowError();
  });
});
