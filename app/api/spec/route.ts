import { createAIProvider } from '../../../lib/ai/gemini';
import { apiErrorResponse, jsonNoStore, readJsonBody } from '../../../lib/ai/route-utils';
import { specRequestSchema } from '../../../lib/schemas/project';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const parsed = specRequestSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return jsonNoStore({ error: 'Project discovery data could not be validated.' }, { status: 400 });
    const spec = await createAIProvider().generateSpec(parsed.data);
    return jsonNoStore(spec);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
