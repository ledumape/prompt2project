import type { IdeaInput, ProjectSpec } from '../schemas/project';
import { resolveOutputLanguage, type ResolvedOutputLanguage } from './language';

type SectionKey = keyof ProjectSpec;
type Section = { key: SectionKey; title: string; entries: [string, string | string[]][] };

const sectionTitles: Record<ResolvedOutputLanguage, Record<SectionKey, string>> = {
  English: { overview: 'Overview', product: 'Product', engineering: 'Engineering', quality: 'Quality', execution: 'Execution' },
  Português: { overview: 'Visão geral', product: 'Produto', engineering: 'Engenharia', quality: 'Qualidade', execution: 'Execução' },
};

const fieldLabels: Record<ResolvedOutputLanguage, Record<string, string>> = {
  English: {
    projectName: 'Project Name', summary: 'Summary', problem: 'Problem', solution: 'Solution', targetUser: 'Target User', goals: 'Goals',
    mvpFeatures: 'MVP Features', outOfScope: 'Out of scope', userStories: 'User Stories', primaryUserFlow: 'Primary User Flow',
    recommendedStack: 'Recommended Stack', architecture: 'Architecture', mainComponents: 'Main Components', dataModel: 'Data Model',
    apiEndpoints: 'API Endpoints', integrations: 'Integrations', decisions: 'Decisions', security: 'Security', privacy: 'Privacy',
    edgeCases: 'Edge Cases', errorScenarios: 'Error Scenarios', acceptanceCriteria: 'Acceptance Criteria', phases: 'Phases',
    developmentTasks: 'Development Tasks', risks: 'Risks', openQuestions: 'Open Questions', futureImprovements: 'Future Improvements',
  },
  Português: {
    projectName: 'Nome do projeto', summary: 'Resumo', problem: 'Problema', solution: 'Solução', targetUser: 'Público-alvo', goals: 'Objetivos',
    mvpFeatures: 'Funcionalidades do MVP', outOfScope: 'Fora do escopo', userStories: 'Histórias de usuário', primaryUserFlow: 'Fluxo principal do usuário',
    recommendedStack: 'Stack recomendada', architecture: 'Arquitetura', mainComponents: 'Componentes principais', dataModel: 'Modelo de dados',
    apiEndpoints: 'Endpoints da API', integrations: 'Integrações', decisions: 'Decisões', security: 'Segurança', privacy: 'Privacidade',
    edgeCases: 'Casos extremos', errorScenarios: 'Cenários de erro', acceptanceCriteria: 'Critérios de aceitação', phases: 'Fases',
    developmentTasks: 'Tarefas de desenvolvimento', risks: 'Riscos', openQuestions: 'Questões em aberto', futureImprovements: 'Melhorias futuras',
  },
};

const promptText: Record<ResolvedOutputLanguage, {
  build: (name: string) => string;
  objective: string;
  targetUser: string;
  implementation: string;
  constraints: string;
  constraintLines: string[];
  testing: string;
  testingBody: string;
  done: string;
  doneBody: string;
}> = {
  English: {
    build: (name) => `# Build ${name}`,
    objective: '## Objective', targetUser: '## Target user', implementation: '## Implementation requirements', constraints: '## Constraints',
    constraintLines: [
      '- Do not silently expand scope. Keep work within the MVP and out-of-scope boundaries in this specification.',
      '- Validate all external input and model-generated data before using it.',
      '- Preserve uncertainty as an open question instead of inventing an answer.',
    ],
    testing: '## Testing requirements',
    testingBody: 'Add focused automated tests for core behavior, validation, and failure cases. Run tests, lint, type checking, and the production build; report actual results.',
    done: '## Definition of done',
    doneBody: 'Every acceptance criterion is met, the primary user flow works, error states are handled, tests and production build pass, and setup/security documentation matches the implementation.',
  },
  Português: {
    build: (name) => `# Desenvolva ${name}`,
    objective: '## Objetivo', targetUser: '## Público-alvo', implementation: '## Requisitos de implementação', constraints: '## Restrições',
    constraintLines: [
      '- Não amplie o escopo em silêncio. Respeite os limites do MVP e os itens fora do escopo definidos nesta especificação.',
      '- Valide todas as entradas externas e os dados gerados pelo modelo antes de usá-los.',
      '- Mantenha as incertezas como questões em aberto em vez de inventar respostas.',
    ],
    testing: '## Requisitos de teste',
    testingBody: 'Adicione testes automatizados objetivos para o comportamento principal, a validação e os casos de falha. Execute os testes, o lint, a verificação de tipos e o build de produção; informe os resultados reais.',
    done: '## Critérios de conclusão',
    doneBody: 'Todos os critérios de aceitação foram atendidos, o fluxo principal funciona, os estados de erro são tratados, os testes e o build de produção passam, e a documentação de configuração e segurança corresponde à implementação.',
  },
};

function sections(spec: ProjectSpec, language: ResolvedOutputLanguage): Section[] {
  return (['overview', 'product', 'engineering', 'quality', 'execution'] as const).map((key) => ({
    key,
    title: sectionTitles[language][key],
    entries: Object.entries(spec[key]) as [string, string | string[]][],
  }));
}

function renderEntries(entries: [string, string | string[]][], language: ResolvedOutputLanguage): string {
  return entries.flatMap(([key, value]) => {
    const label = fieldLabels[language][key] || key;
    if (Array.isArray(value)) return value.length ? [`### ${label}`, ...value.map((item) => `- ${item}`)] : [];
    return value.trim() ? [`### ${label}`, value] : [];
  }).join('\n');
}

function resolveLanguage(language: IdeaInput['outputLanguage'], sourceIdea: string): ResolvedOutputLanguage {
  return resolveOutputLanguage(language, sourceIdea);
}

export function specToMarkdown(spec: ProjectSpec, outputLanguage: IdeaInput['outputLanguage'] = 'English', sourceIdea = ''): string {
  const language = resolveLanguage(outputLanguage, sourceIdea);
  return [
    `# ${spec.overview.projectName || (language === 'Português' ? 'Especificação do projeto' : 'Project Specification')}`,
    ...sections(spec, language).map((section) => `## ${section.title}\n\n${renderEntries(section.entries, language)}`),
  ].filter(Boolean).join('\n\n');
}

function cleanCodingPromptPrefixes(prompt: string): string {
  return prompt.split('\n').map((line) => line
    .replace(/^(\s*(?:-\s*)?):[\p{L}\d_-]+:\s*/u, '$1')
    .replace(/^(\s*(?:-\s*)?):\s+(?=\S)/u, '$1')
    .replace(/^(\s*(?:-\s*)?):\s*\*{0,2}(?=Phase\s+\d+\b)\s*/iu, '$1'))
    .join('\n');
}

export function buildCodingPrompt(spec: ProjectSpec, outputLanguage: IdeaInput['outputLanguage'] = 'English', sourceIdea = ''): string {
  const language = resolveLanguage(outputLanguage, sourceIdea);
  const text = promptText[language];
  const name = spec.overview.projectName || (language === 'Português' ? 'este projeto' : 'this project');
  return cleanCodingPromptPrefixes([
    text.build(name),
    '',
    text.objective,
    spec.overview.solution || spec.overview.summary,
    '',
    text.targetUser,
    spec.overview.targetUser,
    '',
    text.implementation,
    specToMarkdown(spec, language, sourceIdea),
    '',
    text.constraints,
    ...text.constraintLines,
    '',
    text.testing,
    text.testingBody,
    '',
    text.done,
    text.doneBody,
  ].join('\n'));
}
