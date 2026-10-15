import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenRouterProvider } from '../lib/ai/openrouter';
import { normalizeRecommendedStack } from '../lib/domain/recommended-stack';
import { specInstruction } from '../lib/ai/provider-prompts';
import { specRequestSchema } from '../lib/schemas/project';

vi.mock('server-only', () => ({}));

describe('recommended project stack', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns one decisive stack, chooses the first alternative per layer, and removes stray colon prefixes', () => {
    expect(normalizeRecommendedStack([
      ': Frontend: Next.js or Remix',
      ' : Backend: Fastify ou Express',
      'Database: PostgreSQL / SQLite',
    ])).toEqual(['Frontend: Next.js; Backend: Fastify; Database: PostgreSQL']);
  });

  it('drops empty entries after cleaning formatting prefixes', () => {
    expect(normalizeRecommendedStack([': ', '   ', ': React'])).toEqual(['React']);
  });

  it('instructs the model to recommend one concrete choice for each stack layer', () => {
    expect(specInstruction).toMatch(/one concrete, coherent stack without alternatives/i);
  });

  it('normalizes the generated spec returned by the configured provider', async () => {
    const spec = {
      overview: { projectName: 'Orbit', summary: 'A shared space helps the group make travel plans together.', problem: 'Trip decisions are spread across separate conversations and messages.', solution: 'A shared trip planner keeps suggestions and choices together.', targetUser: 'Friends who plan trips together.', goals: [] },
      product: { mvpFeatures: [], outOfScope: [], userStories: [], primaryUserFlow: [] },
      engineering: { recommendedStack: [': Frontend: Next.js or Remix', ': Backend: Fastify ou Express'], architecture: 'A web application organizes shared trip planning.', mainComponents: [], dataModel: [], apiEndpoints: [], integrations: [], decisions: [] },
      quality: { security: [], privacy: [], edgeCases: [], errorScenarios: [], acceptanceCriteria: ['A group can create a shared trip workspace.'] },
      execution: { phases: [], developmentTasks: [], risks: [], openQuestions: [], futureImprovements: [] },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(spec) } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    const request = specRequestSchema.parse({
      input: { idea: 'A shared trip planner' },
      discovery: { projectUnderstanding: 'A group trip planner', knownInformation: [], missingInformation: [], questions: [], challenges: [], readyForSpec: true },
    });
    const result = await new OpenRouterProvider('test-key').generateSpec(request);

    expect(result.engineering.recommendedStack).toEqual(['Frontend: Next.js; Backend: Fastify']);
  });
});
