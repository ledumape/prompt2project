import type { Discovery, IdeaInput, ProjectSpec, SpecRequest } from '../schemas/project';

export type AIErrorCategory =
  | 'redis-unavailable'
  | 'redis-misconfigured'
  | 'provider-unavailable'
  | 'provider-auth'
  | 'provider-rate-limit'
  | 'provider-budget'
  | 'provider-timeout'
  | 'schema-mismatch'
  | 'unknown';

export type ResponseValidationFailure =
  | 'wrong-language'
  | 'essential-field-too-short'
  | 'unsupported-quantity'
  | 'invalid-content-type'
  | 'invalid-json'
  | 'schema-mismatch';

export interface AIProvider {
  analyzeIdea(input: IdeaInput): Promise<Discovery>;
  generateSpec(request: SpecRequest): Promise<ProjectSpec>;
}

export class AIProviderError extends Error {
  constructor(
    readonly code: 'configuration' | 'invalid-response' | 'provider-request' | 'rate-limited' | 'generation-limit' | 'rate-limit-unavailable' | 'request-too-large' | 'unavailable',
    readonly category: AIErrorCategory = 'unknown',
    readonly upstreamStatus?: number,
    readonly validationFailure?: ResponseValidationFailure,
  ) {
    super(code);
    this.name = 'AIProviderError';
  }
}

export function providerErrorFromStatus(status: number | undefined): AIProviderError {
  if (status === 429) return new AIProviderError('rate-limited', 'provider-rate-limit', status);
  if (status === 400) return new AIProviderError('provider-request', 'unknown', status);
  if (status === 401 || status === 403) return new AIProviderError('configuration', 'provider-auth', status);
  if (status === 408 || status === 504) return new AIProviderError('unavailable', 'provider-timeout', status);
  if (status === undefined || status >= 500 || status === 404) return new AIProviderError('unavailable', 'provider-unavailable', status);
  return new AIProviderError('unavailable', 'unknown', status);
}
