import { createAIProvider } from '../../../lib/ai/gemini';
import { apiErrorResponse, jsonNoStore, readJsonBody } from '../../../lib/ai/route-utils';
import { ideaInputSchema } from '../../../lib/schemas/project';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const parsed = ideaInputSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return jsonNoStore({ error: 'Check the project details and try again.' }, { status: 400 });
    const discovery = await createAIProvider().analyzeIdea(parsed.data);
    return jsonNoStore(discovery);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
