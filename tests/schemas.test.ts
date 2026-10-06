import { describe, expect, it } from 'vitest';
import { discoverySchema, ideaInputSchema, projectSpecSchema } from '../lib/schemas/project';

describe('ideaInputSchema', () => {
  it('requires a non-empty idea and rejects oversized submissions', () => {
    expect(ideaInputSchema.safeParse({ idea: 'A small tool' }).success).toBe(true);
    expect(ideaInputSchema.safeParse({ idea: '   ' }).success).toBe(false);
    expect(ideaInputSchema.safeParse({ idea: 'x'.repeat(8_001) }).success).toBe(false);
  });
});

describe('AI response schemas', () => {
  it('rejects malformed discovery responses instead of treating them as application state', () => {
    expect(discoverySchema.safeParse({ questions: [{ question: 'Missing id' }] }).success).toBe(false);
    expect(discoverySchema.safeParse({ projectUnderstanding: 'x', knownInformation: [], missingInformation: [], questions: [{ id: 'same', question: 'One?', reason: 'It matters', type: 'text', options: [] }, { id: 'same', question: 'Two?', reason: 'It matters', type: 'text', options: [] }], challenges: [], readyForSpec: false }).success).toBe(false);
  });

  it('accepts a complete structured project spec', () => {
    const spec = {
      overview: { projectName: 'Orbit', summary: 'Plan projects', problem: 'Ideas are vague', solution: 'A planning copilot', targetUser: 'Solo builders', goals: ['Create a spec'] },
      product: { mvpFeatures: ['Discovery'], outOfScope: ['Accounts'], userStories: ['As a builder I can plan'], primaryUserFlow: ['Enter idea'] },
      engineering: { recommendedStack: ['Next.js'], architecture: 'Small app', mainComponents: ['Workspace'], dataModel: ['Project'], apiEndpoints: [], integrations: [], decisions: ['No database'] },
      quality: { security: ['Validate input'], privacy: ['Keep history local'], edgeCases: ['Malformed output'], errorScenarios: ['Provider unavailable'], acceptanceCriteria: ['Can export'] },
      execution: { phases: ['MVP'], developmentTasks: ['Build UI'], risks: ['Model output'], openQuestions: [], futureImprovements: [] },
    };
    expect(projectSpecSchema.safeParse(spec).success).toBe(true);
    expect(projectSpecSchema.safeParse({ ...spec, quality: { ...spec.quality, acceptanceCriteria: [] } }).success).toBe(false);
  });
});
