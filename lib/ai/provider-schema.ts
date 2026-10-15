import { z } from 'zod';

function stripProviderUnsupportedBounds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripProviderUnsupportedBounds);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !['minLength', 'maxLength', 'minItems', 'maxItems'].includes(key))
    .map(([key, child]) => [key, stripProviderUnsupportedBounds(child)]));
}

export function toProviderResponseSchema(schema: z.ZodType): Record<string, unknown> {
  const generated = z.toJSONSchema(schema, { target: 'draft-7' }) as Record<string, unknown>;
  delete generated.$schema;
  return stripProviderUnsupportedBounds(generated) as Record<string, unknown>;
}
