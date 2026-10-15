import { createAIProvider } from '../../../lib/ai/provider-factory';
import { AIProviderError } from '../../../lib/ai/provider';
import { clientIpFromRequest, consumeGeneration } from '../../../lib/ai/rate-limit';
import { apiErrorResponse, jsonNoStore, logSafeAIError, readJsonBody } from '../../../lib/ai/route-utils';
import { specRequestSchema } from '../../../lib/schemas/project';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const parsed = specRequestSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return jsonNoStore({ error: 'Project discovery data could not be validated.' }, { status: 400 });
    if (!await consumeGeneration(clientIpFromRequest(request))) throw new AIProviderError('generation-limit');
    const spec = await createAIProvider().generateSpec(parsed.data);
    return jsonNoStore(spec);
  } catch (error) {
    const response = apiErrorResponse(error);
    logSafeAIError(error, response.status);
    return response;
  }
}
