import 'server-only';
import type { AIProvider } from './provider';
import { AIProviderError } from './provider';
import { GeminiProvider } from './gemini';
import { OpenRouterProvider } from './openrouter';

export function createAIProvider(env: Record<string, string | undefined> = process.env): AIProvider {
  const selected = (env.AI_PROVIDER || 'gemini').toLowerCase();

  if (selected === 'openrouter') {
    if (!env.OPENROUTER_API_KEY) throw new AIProviderError('configuration', 'provider-auth');
    return new OpenRouterProvider(env.OPENROUTER_API_KEY, env.OPENROUTER_MODEL || 'openai/gpt-6-luna');
  }

  if (selected === 'gemini') {
    if (!env.GEMINI_API_KEY) throw new AIProviderError('configuration', 'provider-auth');
    return new GeminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL || 'gemini-3.8-flash');
  }

  throw new AIProviderError('configuration', 'unknown');
}
