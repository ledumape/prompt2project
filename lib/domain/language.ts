import type { IdeaInput } from '../schemas/project';

export type ResolvedOutputLanguage = 'English' | 'Português';

const portugueseMarkers = new Set(['não', 'você', 'vocês', 'uma', 'umas', 'uns', 'que', 'para', 'com', 'sem', 'quero', 'preciso', 'minha', 'minhas', 'meu', 'meus', 'organizar', 'aplicativo', 'usuário', 'usuários', 'voluntários', 'também', 'está', 'são', 'pelo', 'pela', 'dos', 'das', 'nos', 'nas', 'como', 'mais', 'ideia']);
const englishMarkers = new Set(['the', 'and', 'with', 'without', 'want', 'need', 'build', 'create', 'for', 'from', 'that', 'this', 'users', 'their', 'using', 'which', 'should', 'would', 'can', 'app', 'volunteers', 'shifts', 'idea']);

export function detectIdeaLanguage(idea: string): ResolvedOutputLanguage {
  const words = idea.toLocaleLowerCase().match(/[\p{L}]+/gu) || [];
  const portugueseScore = words.reduce((score, word) => score + Number(portugueseMarkers.has(word)), 0)
    + Number(/[áàâãéêíóôõúç]/i.test(idea)) * 2;
  const englishScore = words.reduce((score, word) => score + Number(englishMarkers.has(word)), 0);
  return portugueseScore > englishScore ? 'Português' : 'English';
}

export function resolveOutputLanguage(language: IdeaInput['outputLanguage'], sourceIdea = ''): ResolvedOutputLanguage {
  if (language === 'Same as input') return detectIdeaLanguage(sourceIdea);
  return language;
}
