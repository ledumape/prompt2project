import { describe, expect, it, vi } from 'vitest';
import { discoverySchema, ideaInputSchema, projectSpecSchema, specRequestSchema } from '../lib/schemas/project';
import {
  generateWithSemanticRetry,
  semanticRetryInstruction,
  validateDiscoverySemantics,
  validateSpecSemantics,
} from '../lib/ai/semantic-validation';

const englishIdea = () => ideaInputSchema.parse({
  projectName: 'Trip Planner',
  idea: 'An app for friends to choose trip destinations and vote together.',
  targetUser: 'Groups of friends who plan trips together.',
  outputLanguage: 'English',
});

const discovery = () => discoverySchema.parse({
  projectUnderstanding: 'A shared app helps groups of friends choose trip destinations and vote together.',
  knownInformation: ['Friends can suggest destinations and vote.'],
  missingInformation: [],
  questions: [],
  challenges: [],
  readyForSpec: true,
});

const spec = () => projectSpecSchema.parse({
  overview: {
    projectName: 'Trip Planner',
    summary: 'A shared trip planning app for friends.',
    problem: 'Trip choices and votes are scattered across conversations.',
    solution: 'A shared space lets friends suggest destinations and vote.',
    targetUser: 'Groups of friends who plan trips together.',
    goals: ['Help the group choose a destination together.'],
  },
  product: { mvpFeatures: ['Suggest destinations', 'Vote on suggestions'], outOfScope: [], userStories: [], primaryUserFlow: [] },
  engineering: {
    recommendedStack: ['Frontend: Next.js 16'], architecture: 'A web app stores each trip and its suggestions.',
    mainComponents: ['Trip workspace'], dataModel: ['Trip', 'Suggestion'], apiEndpoints: ['POST /api/v1/trips'], integrations: [], decisions: [],
  },
  quality: { security: [], privacy: [], edgeCases: [], errorScenarios: [], acceptanceCriteria: ['A group can create a trip and vote on a destination.'] },
  execution: { phases: ['Phase 1: Build the trip workspace'], developmentTasks: [], risks: [], openQuestions: [], futureImprovements: [] },
});

const request = (overrides: Record<string, unknown> = {}) => specRequestSchema.parse({
  input: englishIdea(),
  discovery: discovery(),
  answers: {},
  challengeDecisions: {},
  ...overrides,
});

describe('semantic response validation', () => {
  it('rejects a Discovery response that is clearly in the wrong language', () => {
    const wrongLanguage = discoverySchema.parse({ ...discovery(), projectUnderstanding: 'Um aplicativo compartilhado ajuda grupos de amigos a escolher destinos.' });

    expect(validateDiscoverySemantics(wrongLanguage, englishIdea())).toBe('wrong-language');
  });

  it('rejects a Spec target audience that is clearly in the wrong language', () => {
    const wrongLanguage = projectSpecSchema.parse({ ...spec(), overview: { ...spec().overview, targetUser: 'Grupos de amigos que planejam viagens juntos.' } });

    expect(validateSpecSemantics(wrongLanguage, request())).toBe('wrong-language');
  });

  it('rejects a Spec with an essential description that is too short', () => {
    const shortField = projectSpecSchema.parse({ ...spec(), overview: { ...spec().overview, problem: 'Plans scattered' } });

    expect(validateSpecSemantics(shortField, request())).toBe('essential-field-too-short');
  });

  it('keeps structurally empty required fields rejected by the existing schema', () => {
    const emptyField = { ...spec(), overview: { ...spec().overview, problem: '' } };

    expect(projectSpecSchema.safeParse(emptyField).success).toBe(false);
  });

  it('rejects a new unsupported duration but permits supplied facts and structural numbers', () => {
    const unsupported = projectSpecSchema.parse({ ...spec(), execution: { ...spec().execution, developmentTasks: ['Deliver a complete app within 6 weeks.'] } });
    const supportedRequest = request({ input: { ...englishIdea(), idea: `${englishIdea().idea} The project should launch within 6 weeks.` } });
    const supported = projectSpecSchema.parse({ ...spec(), execution: { ...spec().execution, developmentTasks: ['Deliver a complete app within 6 weeks.'] } });

    expect(validateSpecSemantics(unsupported, request())).toBe('unsupported-quantity');
    expect(validateSpecSemantics(supported, supportedRequest)).toBeNull();
    expect(validateSpecSemantics(spec(), request())).toBeNull();
  });

  it.each([
    ['couple', 'An app for a couple to choose movies together.', 'Designed for 2 people choosing a movie together.'],
    ['casal', 'Um aplicativo para um casal escolher filmes juntos.', 'Designed for 2 people choosing a movie together.'],
  ])('allows an audience of two when the user explicitly describes a %s', (_label, idea, targetUser) => {
    const language = 'English' as const;
    const localizedDiscovery = discovery();
    const localizedSpec = projectSpecSchema.parse({ ...spec(), overview: { ...spec().overview, targetUser } });
    const localizedRequest = request({
      input: { ...englishIdea(), idea, targetUser: idea.startsWith('Um aplicativo') ? 'Um casal que escolhe filmes junto.' : 'A couple choosing movies together.', outputLanguage: language },
      discovery: localizedDiscovery,
    });

    expect(validateSpecSemantics(localizedSpec, localizedRequest)).toBeNull();
  });

  it('checks deadline years without treating ordinary technical identifiers as quantities', () => {
    const deadline = projectSpecSchema.parse({ ...spec(), execution: { ...spec().execution, risks: ['The service must launch by 2027.'] } });
    const identifier = projectSpecSchema.parse({ ...spec(), execution: { ...spec().execution, risks: ['Review module PR 2027 before merging.'] } });

    expect(validateSpecSemantics(deadline, request())).toBe('unsupported-quantity');
    expect(validateSpecSemantics(identifier, request())).toBeNull();
  });

  it('allows quantities supplied by a recommendation the user accepted', () => {
    const recommendedDiscovery = discoverySchema.parse({ ...discovery(), challenges: [{
      id: 'privacy', severity: 'medium', issue: 'Groups need a way to keep private details safe.',
      reason: 'Private travel details should not be public.', suggestion: 'Allow trips to be shared with up to 12 invited members.',
    }] });
    const acceptedRequest = request({ discovery: recommendedDiscovery, challengeDecisions: { privacy: 'accept' } });
    const output = projectSpecSchema.parse({ ...spec(), product: { ...spec().product, mvpFeatures: ['Share a trip with up to 12 invited members.'] } });

    expect(validateSpecSemantics(output, acceptedRequest)).toBeNull();
  });

  it('retries once with only an allowlisted reason and returns the corrected value', async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce({ text: 'Um aplicativo para amigos.' })
      .mockResolvedValueOnce({ text: 'A shared app for friends.' });
    const validate = (value: { text: string }) => value.text.startsWith('Um ') ? 'wrong-language' as const : null;

    await expect(generateWithSemanticRetry(generate, validate)).resolves.toEqual({ text: 'A shared app for friends.' });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[0]?.[0]).toBeUndefined();
    expect(generate.mock.calls[1]?.[0]).toBe('wrong-language');
    expect(semanticRetryInstruction('wrong-language', 'English')).toContain('requested language');
    expect(semanticRetryInstruction('unsupported-quantity', 'Português')).toContain('idioma solicitado');
    expect(JSON.stringify(generate.mock.calls)).not.toContain('Um aplicativo para amigos.');
  });

  it('fails safely after exactly two semantically invalid responses', async () => {
    const generate = vi.fn().mockResolvedValue({ text: 'Um aplicativo para amigos.' });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(generateWithSemanticRetry(generate, () => 'wrong-language')).rejects.toMatchObject({ code: 'invalid-response' });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(log).not.toHaveBeenCalled();
    expect(JSON.stringify(generate.mock.calls)).not.toContain('Um aplicativo para amigos.');
  });

  it('returns a valid first response without spending another provider call', async () => {
    const generate = vi.fn().mockResolvedValue({ text: 'A shared app helps groups of friends choose destinations.' });

    await expect(generateWithSemanticRetry(generate, () => null)).resolves.toEqual({ text: 'A shared app helps groups of friends choose destinations.' });
    expect(generate).toHaveBeenCalledTimes(1);
  });
});
