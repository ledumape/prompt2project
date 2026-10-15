import { createAIProvider } from '../../../lib/ai/provider-factory';
import { AIProviderError } from '../../../lib/ai/provider';
import { clientIpFromRequest, consumeGeneration } from '../../../lib/ai/rate-limit';
import { apiErrorResponse, jsonNoStore, logSafeAIError, readJsonBody } from '../../../lib/ai/route-utils';
import { ideaInputSchema } from '../../../lib/schemas/project';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const parsed = ideaInputSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return jsonNoStore({ error: 'Check the project details and try again.' }, { status: 400 });
    if (!await consumeGeneration(clientIpFromRequest(request))) throw new AIProviderError('generation-limit');
    const discovery = await createAIProvider().analyzeIdea(parsed.data);
    return jsonNoStore(discovery);
  } catch (error) {
    const response = apiErrorResponse(error);
    logSafeAIError(error, response.status);
    return response;
  }
}
