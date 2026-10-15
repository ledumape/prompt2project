import 'server-only';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { discoveryGenerationSchema, discoverySchema, projectSpecSchema, type Discovery, type IdeaInput, type ProjectSpec, type SpecRequest } from '../schemas/project';
import { AIProviderError, type AIProvider, type ResponseValidationFailure } from './provider';
import { toProviderResponseSchema } from './provider-schema';
import { buildDiscoveryPrompt, buildSpecPrompt, discoverySystemInstruction, specSystemInstruction } from './provider-prompts';
import { providerErrorFromStatus } from './provider';
import { normalizeRecommendedStack } from '../domain/recommended-stack';
import { resolveOutputLanguage } from '../domain/language';
import { appendSemanticFeedback, generateWithSemanticRetry, validateDiscoverySemantics, validateSpecSemantics, type SemanticFailure } from './semantic-validation';

function parseResponse<T>(text: string | undefined, schema: z.ZodType<T>, normalize?: (value: T) => T): T {
  if (!text) throw new AIProviderError('invalid-response', 'unknown', undefined, 'invalid-content-type');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AIProviderError('invalid-response', 'unknown', undefined, 'invalid-json');
  }
  const result = schema.safeParse(parsed);
  if (!result.success) throw new AIProviderError('invalid-response', 'schema-mismatch', undefined, 'schema-mismatch');
  return normalize ? normalize(result.data) : result.data;
}

export class GeminiProvider implements AIProvider {
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(apiKey: string, model = 'gemini-3.8-flash') {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  private async generate<T>(
    prompt: string,
    instruction: string,
    responseSchema: z.ZodType,
    validationSchema: z.ZodType<T>,
    validate: (value: T) => SemanticFailure | null,
    language: 'English' | 'Português',
    normalize?: (value: T) => T,
  ): Promise<T> {
    const generateOnce = async (retryReason?: ResponseValidationFailure): Promise<T> => {
      try {
        const interaction = await this.client.interactions.create({
          model: this.model,
          store: false,
          input: retryReason ? appendSemanticFeedback(prompt, retryReason, language) : prompt,
          system_instruction: instruction,
          response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema: toProviderResponseSchema(responseSchema),
          },
        });
        return parseResponse(interaction.output_text, validationSchema, normalize);
      } catch (error) {
        if (error instanceof AIProviderError) throw error;
        const status = error && typeof error === 'object' && 'status' in error && typeof error.status === 'number'
          ? error.status
          : error && typeof error === 'object' && 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : undefined;
        console.error('Gemini request failed', { model: this.model, status: status ?? null });
        throw providerErrorFromStatus(status);
      }
    };

    return generateWithSemanticRetry(generateOnce, validate);
  }

  analyzeIdea(input: IdeaInput): Promise<Discovery> {
    return this.generate<Discovery>(
      buildDiscoveryPrompt(input),
      discoverySystemInstruction(input),
      discoveryGenerationSchema,
      discoverySchema,
      (value) => validateDiscoverySemantics(value, input),
      resolveOutputLanguage(input.outputLanguage, input.idea),
    );
  }

  generateSpec(request: SpecRequest): Promise<ProjectSpec> {
    return this.generate<ProjectSpec>(
      buildSpecPrompt(request),
      specSystemInstruction(request),
      projectSpecSchema,
      projectSpecSchema,
      (value) => validateSpecSemantics(value, request),
      resolveOutputLanguage(request.input.outputLanguage, request.input.idea),
      (spec) => ({ ...spec, engineering: { ...spec.engineering, recommendedStack: normalizeRecommendedStack(spec.engineering.recommendedStack) } }),
    );
  }
}
