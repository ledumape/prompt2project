import { describe, expect, it } from 'vitest';
import { formatDiscoveryFact, getDiscoveryCopy, localizeDiscoveryError } from '../lib/domain/discovery-presentation';
import { discoverySystemInstruction } from '../lib/ai/provider-prompts';
import { resolveOutputLanguage } from '../lib/domain/language';
import { ideaInputSchema } from '../lib/schemas/project';

describe('discovery presentation language', () => {
  it('localizes Discovery labels for Portuguese output without changing English labels', () => {
    expect(getDiscoveryCopy('Português').knownSoFar).toBe('Já sabemos');
    expect(getDiscoveryCopy('Português').generateSpec).toBe('Gerar especificação do projeto');
    expect(getDiscoveryCopy('Português').severity.high).toBe('alto');
    expect(getDiscoveryCopy('English').knownSoFar).toBe('Known so far');
    expect(getDiscoveryCopy('English').generateSpec).toBe('Generate project spec');
    expect(getDiscoveryCopy('English').severity.high).toBe('high');
  });

  it.each([
    ['Quero organizar passeios em Brasília.', 'Já sabemos'],
    ['I want to plan outings in Brasilia.', 'Known so far'],
  ])('resolves Same as input consistently for %s', (idea, expected) => {
    const language = resolveOutputLanguage('Same as input', idea);
    expect(getDiscoveryCopy(language).knownSoFar).toBe(expected);
  });

  it('renders schema field paths as readable labels and preserves supplied values', () => {
    expect(formatDiscoveryFact('/projectName: Teste 2', 'Português')).toBe('Nome do projeto: Teste 2');
    expect(formatDiscoveryFact('/targetUser', 'Português')).toBe('Público-alvo');
    expect(formatDiscoveryFact('/targetUser', 'English')).toBe('Target audience');
    expect(formatDiscoveryFact('Planning dates is still open', 'Português')).toBe('Planning dates is still open');
    expect(formatDiscoveryFact(' : web application targeting experienced maintainers.', 'English')).toBe('web application targeting experienced maintainers.');
  });

  it('asks the provider to return natural language instead of schema field paths', () => {
    const input = ideaInputSchema.parse({ idea: 'Quero planejar passeios em Brasília.', outputLanguage: 'Same as input' });
    const instruction = discoverySystemInstruction(input);

    expect(instruction).toContain('Write all generated prose in the requested language');
    expect(instruction).toContain('without schema paths, raw field names, or label-like prefixes');
    expect(instruction).toContain('Assume a nontechnical audience when user familiarity is unknown');
    expect(instruction).toContain('Never invent services, capabilities, dates, durations, budgets, counts, or performance targets');
    expect(instruction).toContain('Escreva todas as respostas em português brasileiro.');
  });

  it('localizes provider errors on the Portuguese Discovery screen without changing English output', () => {
    const message = 'The selected AI provider usage limit has been reached. Wait for it to reset or check the model quota, then try again.';
    expect(localizeDiscoveryError(message, 'Português')).toContain('limite de uso');
    expect(localizeDiscoveryError(message, 'English')).toBe(message);
  });
});
