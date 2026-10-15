import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectIdeaLanguage, resolveOutputLanguage } from '../lib/domain/language';
import { OpenRouterProvider } from '../lib/ai/openrouter';
import { discoverySchema, ideaInputSchema } from '../lib/schemas/project';

vi.mock('server-only', () => ({}));

type Language = 'English' | 'Português';

const languageWords: Record<Language, Set<string>> = {
  English: new Set(['the', 'and', 'with', 'without', 'for', 'from', 'that', 'this', 'users', 'user', 'group', 'groups', 'friend', 'friends', 'travel', 'trip', 'trips', 'choose', 'voting', 'project', 'helps', 'allows', 'should', 'can', 'is', 'are', 'to', 'of', 'in']),
  Português: new Set(['não', 'você', 'uma', 'um', 'de', 'da', 'do', 'dos', 'das', 'que', 'para', 'com', 'sem', 'quero', 'preciso', 'minha', 'meu', 'organizar', 'aplicativo', 'usuário', 'usuários', 'pessoas', 'grupo', 'grupos', 'amigo', 'amigos', 'viagem', 'viagens', 'destino', 'destinos', 'votação', 'projeto', 'ajuda', 'permite', 'pode', 'deve', 'está', 'são', 'como', 'mais', 'ideia']),
};

function markerScore(text: string, language: Language): number {
  const words = text.toLocaleLowerCase().match(/[\p{L}]+/gu) || [];
  return words.reduce((score, word) => score + Number(languageWords[language].has(word)), 0);
}

function isClearlyInLanguage(text: string, language: Language): boolean {
  const own = markerScore(text, language);
  const other = markerScore(text, language === 'English' ? 'Português' : 'English');
  return own > other && own >= 1;
}

const quantityClaim = /\b(\d+(?:[.,]\d+)?(?:\s*(?:-|–|to|a|até)\s*\d+(?:[.,]\d+)?)?)\s*(?:users?|people|participants?|groups?|visitors?|repositories|repos|hours?|days?|weeks?|months?|years?|percent|%|requests?(?:\s*(?:per|\/)\s*second)?|rps|milliseconds?|seconds?|minutes?|usuários?|pessoas|participantes?|grupos?|visitantes?|repositórios|horas?|dias?|semanas?|meses|anos|por cento|solicitações?)\b/giu;

function hasUnsupportedNumericClaims(generatedText: string, userSuppliedText: string): boolean {
  const suppliedNumbers = new Set(userSuppliedText.match(/\d+(?:[.,]\d+)?/g) || []);
  return [...generatedText.matchAll(quantityClaim)].some((match) =>
    (match[1]?.match(/\d+(?:[.,]\d+)?/g) || []).some((number) => !suppliedNumbers.has(number)),
  );
}

function discoveryText(discovery: {
  projectUnderstanding: string;
  knownInformation: string[];
  missingInformation: string[];
  questions: { question: string; reason: string }[];
  challenges: { issue: string; reason: string; suggestion: string }[];
}): string {
  return [discovery.projectUnderstanding, ...discovery.knownInformation, ...discovery.missingInformation,
    ...discovery.questions.flatMap(({ question, reason }) => [question, reason]),
    ...discovery.challenges.flatMap(({ issue, reason, suggestion }) => [issue, reason, suggestion])].join(' ');
}

function specText(spec: {
  overview: { summary: string; problem: string; solution: string; targetUser: string; goals: string[] };
  product: { mvpFeatures: string[]; outOfScope: string[]; userStories: string[]; primaryUserFlow: string[] };
  quality: { security: string[]; privacy: string[]; edgeCases: string[]; errorScenarios: string[]; acceptanceCriteria: string[] };
  execution: { phases: string[]; developmentTasks: string[]; risks: string[]; openQuestions: string[]; futureImprovements: string[] };
}): string {
  return [spec.overview.summary, spec.overview.problem, spec.overview.solution, spec.overview.targetUser, ...spec.overview.goals,
    ...spec.product.mvpFeatures, ...spec.product.outOfScope, ...spec.product.userStories, ...spec.product.primaryUserFlow,
    ...spec.quality.security, ...spec.quality.privacy, ...spec.quality.edgeCases, ...spec.quality.errorScenarios,
    ...spec.quality.acceptanceCriteria, ...spec.execution.phases, ...spec.execution.developmentTasks,
    ...spec.execution.risks, ...spec.execution.openQuestions, ...spec.execution.futureImprovements].join(' ');
}

describe('deterministic checks for real model outputs', () => {
  it.each([
    ['English', 'I want an app for groups of friends to choose trips together.'],
    ['Português', 'Quero um aplicativo para grupos de amigos organizarem viagens.'],
    ['Same as input', 'Quero organizar viagens em grupo.'],
    ['Same as input', 'I want to organize group trips.'],
  ] as const)('resolves %s consistently for the idea text', (selected, idea) => {
    expect(resolveOutputLanguage(selected, idea)).toBe(detectIdeaLanguage(idea));
  });

  it('distinguishes clear generated language samples deterministically', () => {
    expect(isClearlyInLanguage('A shared app helps groups of friends choose trip destinations.', 'English')).toBe(true);
    expect(isClearlyInLanguage('Um aplicativo ajuda grupos de amigos a escolher destinos de viagem.', 'Português')).toBe(true);
    expect(isClearlyInLanguage('Um aplicativo ajuda grupos de amigos a escolher destinos de viagem.', 'English')).toBe(false);
  });

  it('rejects unsupported audience quantities and allows numbers explicitly supplied by the user', () => {
    expect(hasUnsupportedNumericClaims('Designed for 10–200 repositories.', 'A trip planning app.')).toBe(true);
    expect(hasUnsupportedNumericClaims('Projetado para 10 pessoas.', 'Quero organizar um grupo de 10 pessoas.')).toBe(false);
    expect(hasUnsupportedNumericClaims('A responsive mobile application.', 'A trip planning app.')).toBe(false);
  });
});

const liveTestsEnabled = process.env.P2P_LIVE_PROVIDER_TESTS === '1';

if (liveTestsEnabled) {
  afterEach(() => vi.unstubAllGlobals());

  const scenarios = [
    { mode: 'English', idea: 'Quero um aplicativo simples para amigos escolherem destinos de viagem e votarem juntos.', expected: 'English' },
    { mode: 'Português', idea: 'I want a simple app for friends to choose and vote on trip destinations together.', expected: 'Português' },
    { mode: 'Same as input (Português)', idea: 'Quero um aplicativo para amigos escolherem destinos de viagem e votarem juntos.', expected: 'Português' },
  ] as const;

  describe('live OpenRouter spec generation', () => {
    it.each(scenarios)('$mode output follows the selected language and supplied numeric facts', async (scenario) => {
      const apiKey = process.env.OPENROUTER_API_KEY;
      const model = process.env.OPENROUTER_MODEL || 'openai/gpt-6-luna';
      if (!apiKey) throw new Error('Live provider validation is enabled but the OpenRouter key is not configured.');
      const input = ideaInputSchema.parse({ idea: scenario.idea, platform: 'Mobile', outputLanguage: scenario.mode.startsWith('Same as input') ? 'Same as input' : scenario.mode });
      const provider = new OpenRouterProvider(apiKey, model);
      const discovery = discoverySchema.parse(await provider.analyzeIdea(input));
      const generated = await provider.generateSpec({ input, discovery, answers: {}, challengeDecisions: {} });
      const expectedLanguage = scenario.expected as Language;
      const sourceText = `${scenario.idea} ${JSON.stringify(input)}`;

      expect(isClearlyInLanguage(discoveryText(discovery), expectedLanguage)).toBe(true);
      expect(isClearlyInLanguage(discovery.projectUnderstanding, expectedLanguage)).toBe(true);
      expect(hasUnsupportedNumericClaims(discoveryText(discovery), sourceText)).toBe(false);
      expect(isClearlyInLanguage(specText(generated), expectedLanguage)).toBe(true);
      expect(isClearlyInLanguage(generated.overview.targetUser, expectedLanguage)).toBe(true);
      expect(hasUnsupportedNumericClaims(specText(generated), sourceText)).toBe(false);
    }, 240_000);
  });
}
