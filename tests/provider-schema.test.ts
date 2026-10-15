import { describe, expect, it } from 'vitest';
import { projectSpecSchema } from '../lib/schemas/project';
import { toProviderResponseSchema } from '../lib/ai/provider-schema';

describe('Gemini structured response schema', () => {
  it('omits size constraints that are enforced locally by Zod', () => {
    const schema = toProviderResponseSchema(projectSpecSchema);
    const serialized = JSON.stringify(schema);

    expect(serialized).not.toMatch(/"(?:minLength|maxLength|minItems|maxItems)"/);
    expect(schema).not.toHaveProperty('$schema');
    expect(serialized).toContain('acceptanceCriteria');
    expect(serialized).toContain('additionalProperties');
  });
});
