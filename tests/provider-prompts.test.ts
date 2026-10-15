import { describe, expect, it } from 'vitest';
import { buildSpecPrompt, discoveryInstruction, specInstruction, specSystemInstruction } from '../lib/ai/provider-prompts';
import { specRequestSchema } from '../lib/schemas/project';

const request = (outputLanguage: 'English' | 'Português' | 'Same as input', idea: string) => specRequestSchema.parse({
  input: { idea, outputLanguage },
  discovery: {
    projectUnderstanding: 'A trip planning project',
    knownInformation: [],
    missingInformation: [],
    questions: [],
    challenges: [],
    readyForSpec: true,
  },
});

describe('spec provider prompts', () => {
  it.each([
    ['English', 'Quero planejar viagens.', 'Write every user-facing string in English.'],
    ['Português', 'I want to plan trips.', 'Escreva todas as respostas em português brasileiro.'],
    ['Same as input', 'Quero planejar viagens.', 'Escreva todas as respostas em português brasileiro.'],
    ['Same as input', 'I want to plan trips.', 'Write every user-facing string in English.'],
  ] as const)('sets %s output language from source idea %s', (language, idea, expected) => {
    const context = request(language, idea);

    expect(specSystemInstruction(context)).toContain(expected);
    expect(buildSpecPrompt(context)).not.toContain('Write every user-facing string');
    expect(buildSpecPrompt(context)).not.toContain('Escreva todas as respostas');
    expect(buildSpecPrompt(context)).toContain(idea);
  });

  it('states the local validation requirements for every generated spec', () => {
    const instruction = specSystemInstruction(request('English', 'Plan group trips.'));

    expect(instruction).toContain('exactly one JSON object matching the full schema');
    expect(instruction).toContain('all required strings must be useful and non-empty');
    expect(instruction).toContain('acceptanceCriteria must contain at least one testable item');
    expect(instruction).toContain('overview.summary must be at least 10 characters');
    expect(instruction).toContain('overview.problem and overview.solution at least 18 characters each');
    expect(instruction).toContain('overview.targetUser at least 8 characters');
    expect(instruction).toContain('engineering.architecture at least 16 characters');
  });

  it('keeps generated strings within the local schema length limit', () => {
    const instruction = specSystemInstruction(request('English', 'Plan group trips.'));

    expect(instruction).toContain('every string at or below 800');
    expect(instruction).toContain('keep phases, tasks, and open questions concise');
  });

  it('forbids invented commitments and keeps requested technical language readable', () => {
    const instruction = specSystemInstruction(request('Português', 'Quero organizar filmes com meus amigos.'));

    expect(instruction).toContain('Do not invent capabilities, dates, durations, budgets, counts, metrics');
    expect(instruction).toContain('unanswered dependencies in openQuestions and risks');
    expect(instruction).toContain('Write every descriptive value in the requested language');
    expect(instruction).toContain('do not mix languages within a sentence');
    expect(instruction).toContain('Do not invent audience segments or numeric audience sizes');
    expect(instruction).toContain('Translate context rather than copying prose written in another language');
    expect(instruction).toContain('only when supplied in the idea, target-user field, or answers');
    expect(instruction).toContain('Use natural, beginner-friendly wording when appropriate');
    expect(instruction).toContain('with consistent features, architecture, data, and flows');
    expect(instruction).toContain('Do not claim legal or regulatory compliance');
    expect(instruction).toContain('architecture at or below 350 characters');
  });

  it('keeps system prompts concise while retaining full field coverage guidance', () => {
    expect(discoveryInstruction.length).toBeLessThan(1_800);
    expect(specInstruction.length).toBeLessThan(2_600);
    expect(specInstruction).toContain('acceptanceCriteria');
    expect(specInstruction).toContain('openQuestions');
    expect(specInstruction).toContain('recommendedStack');
  });
});
