import { describe, expect, it } from 'vitest';
import { getAppCopy, withAppLanguage } from '../lib/domain/app-presentation';
import { ideaInputSchema } from '../lib/schemas/project';

describe('getAppCopy', () => {
  it('provides the first-screen and navigation copy in Portuguese', () => {
    const copy = getAppCopy('Português');

    expect(copy.heroTitleStart).toBe('Transforme sua ideia');
    expect(copy.ideaLabel).toBe('O que você quer criar?');
    expect(copy.analyzeIdea).toBe('Analisar ideia');
    expect(copy.projects).toBe('Seus projetos');
    expect(copy.languageSwitchLabel).toBe('Mudar idioma para inglês');
  });

  it('provides matching English copy for the global language toggle', () => {
    const copy = getAppCopy('English');

    expect(copy.heroTitleStart).toBe('Make your idea');
    expect(copy.ideaLabel).toBe('What do you want to build?');
    expect(copy.analyzeIdea).toBe('Analyze idea');
    expect(copy.projects).toBe('Your projects');
    expect(copy.languageSwitchLabel).toBe('Switch language to Portuguese');
  });

  it('explains the application daily cap and points to provider quota as a separate limit', () => {
    expect(getAppCopy('English').rateLimited).toContain('app generation limit');
    expect(getAppCopy('English').rateLimited).toContain('after 24 hours');
    expect(getAppCopy('English').rateLimited).toContain('provider quota');
    expect(getAppCopy('Português').rateLimited).toContain('limite diário de gerações do app');
    expect(getAppCopy('Português').rateLimited).toContain('após 24 horas');
    expect(getAppCopy('Português').rateLimited).toContain('cota do provedor');
  });

  it('overrides a saved project language with the selected app language', () => {
    const idea = ideaInputSchema.parse({ idea: 'Quero organizar viagens em grupo.', outputLanguage: 'English' });

    expect(withAppLanguage(idea, 'Português')).toEqual({ ...idea, outputLanguage: 'Português' });
  });
});
