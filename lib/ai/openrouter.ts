import 'server-only';
import { z } from 'zod';
import { discoveryGenerationSchema, discoverySchema, projectSpecSchema, type Discovery, type IdeaInput, type ProjectSpec, type SpecRequest } from '../schemas/project';
import { AIProviderError, providerErrorFromStatus, type AIProvider, type ResponseValidationFailure } from './provider';
import { toProviderResponseSchema } from './provider-schema';
import { buildDiscoveryPrompt, buildSpecPrompt, discoverySystemInstruction, specSystemInstruction } from './provider-prompts';
import { normalizeRecommendedStack } from '../domain/recommended-stack';
import { resolveOutputLanguage } from '../domain/language';
import { appendSemanticFeedback, generateWithSemanticRetry, validateDiscoverySemantics, validateSpecSemantics, type SemanticFailure } from './semantic-validation';

type OpenRouterFailureReason = 'unsupported-structured-output' | 'invalid-response-schema' | 'model-unavailable' | 'provider-rejected';

async function failureReason(response: Response): Promise<OpenRouterFailureReason> {
  let details = '';
  try {
    const payload: unknown = await response.json();
    if (payload && typeof payload === 'object' && 'error' in payload) {
      const error = payload.error;
      if (error && typeof error === 'object') {
        const fields = error as Record<string, unknown>;
        const metadata = fields.metadata && typeof fields.metadata === 'object' ? fields.metadata as Record<string, unknown> : {};
        details = [fields.code, fields.message, metadata.raw]
          .filter((field): field is string => typeof field === 'string')
          .join(' ');
      }
    }
  } catch {
    // Provider error bodies are optional; never log them verbatim.
  }

  if (/unsupported[_ -]?(?:response[_ -]?format|structured[_ -]?output)|(?:response[_ -]?format|structured[_ -]?output).{0,40}(?:unsupported|not supported)|no endpoints.{0,80}support.{0,40}parameters/i.test(details)) {
    return 'unsupported-structured-output';
  }
  if (/(?:invalid|unsupported).{0,40}(?:json )?schema|(?:json )?schema.{0,40}(?:invalid|unsupported)/i.test(details)) {
    return 'invalid-response-schema';
  }
  if (/(?:model|provider).{0,40}(?:not found|unavailable|not available)|no endpoints found|no provider available/i.test(details)) return 'model-unavailable';
  return 'provider-rejected';
}

type ParsedResponse<T> = { value: T } | { reason: 'invalid-content-type' | 'invalid-json' | 'schema-mismatch' };

function parseResponse<T>(content: unknown, schema: z.ZodType<T>, normalize?: (value: T) => T): ParsedResponse<T> {
  if (typeof content !== 'string') return { reason: 'invalid-content-type' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { reason: 'invalid-json' };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) return { reason: 'schema-mismatch' };
  return { value: normalize ? normalize(result.data) : result.data };
}

export class OpenRouterProvider implements AIProvider {
  constructor(private readonly apiKey: string, private readonly model = 'openai/gpt-6-luna') {}

  private async generate<T>(
    prompt: string,
    instruction: string,
    responseSchema: z.ZodType,
    validationSchema: z.ZodType<T>,
    validate: (value: T) => SemanticFailure | null,
    maxOutputTokens: number,
    language: 'English' | 'Português',
    normalize?: (value: T) => T,
  ): Promise<T> {
    const generateOnce = async (retryReason?: ResponseValidationFailure): Promise<T> => {
      let response: Response;
      try {
        response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            max_tokens: maxOutputTokens,
            provider: { require_parameters: true },
            messages: [
              { role: 'system', content: instruction },
              { role: 'user', content: retryReason ? appendSemanticFeedback(prompt, retryReason, language) : prompt },
            ],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'prompt2project_response',
                strict: true,
                schema: toProviderResponseSchema(responseSchema),
              },
            },
          }),
          cache: 'no-store',
        });
      } catch (error) {
        const timedOut = error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
        throw new AIProviderError('unavailable', timedOut ? 'provider-timeout' : 'provider-unavailable');
      }

      if (!response.ok) {
        const reason = await failureReason(response);
        if (response.status === 402) throw new AIProviderError('unavailable', 'provider-budget', response.status);
        if (response.status === 429) throw new AIProviderError('unavailable', 'provider-rate-limit', response.status);
        if (response.status === 408 || response.status === 504) throw new AIProviderError('unavailable', 'provider-timeout', response.status);
        if (reason === 'unsupported-structured-output' || reason === 'invalid-response-schema') {
          throw new AIProviderError('provider-request', 'schema-mismatch', response.status);
        }
        throw providerErrorFromStatus(response.status);
      }

      let result: unknown;
      try {
        result = await response.json();
      } catch {
        throw new AIProviderError('invalid-response', 'unknown', response.status, 'invalid-json');
      }

      const content = result && typeof result === 'object'
        && 'choices' in result && Array.isArray(result.choices)
        && result.choices[0] && typeof result.choices[0] === 'object'
        && 'message' in result.choices[0] && result.choices[0].message && typeof result.choices[0].message === 'object'
        && 'content' in result.choices[0].message
        ? result.choices[0].message.content
        : undefined;

      const parsed = parseResponse(content, validationSchema, normalize);
      if ('reason' in parsed) {
        throw new AIProviderError(
          'invalid-response',
          parsed.reason === 'schema-mismatch' ? 'schema-mismatch' : 'unknown',
          response.status,
          parsed.reason,
        );
      }
      return parsed.value;
    };

    return generateWithSemanticRetry(generateOnce, validate);
  }

  analyzeIdea(input: IdeaInput): Promise<Discovery> {
    return this.generate(
      buildDiscoveryPrompt(input), discoverySystemInstruction(input), discoveryGenerationSchema, discoverySchema,
      (value) => validateDiscoverySemantics(value, input), 3072, resolveOutputLanguage(input.outputLanguage, input.idea),
    );
  }

  generateSpec(request: SpecRequest): Promise<ProjectSpec> {
    return this.generate(
      buildSpecPrompt(request),
      specSystemInstruction(request),
      projectSpecSchema,
      projectSpecSchema,
      (value) => validateSpecSemantics(value, request),
      6144,
      resolveOutputLanguage(request.input.outputLanguage, request.input.idea),
      (spec) => ({ ...spec, engineering: { ...spec.engineering, recommendedStack: normalizeRecommendedStack(spec.engineering.recommendedStack) } }),
    );
  }
}
