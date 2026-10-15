import type { ResolvedOutputLanguage } from './language';

export type SpecSectionKey = 'overview' | 'product' | 'engineering' | 'quality' | 'execution';

export type SpecFieldKey =
  | 'projectName' | 'summary' | 'problem' | 'solution' | 'targetUser' | 'goals'
  | 'mvpFeatures' | 'outOfScope' | 'userStories' | 'primaryUserFlow'
  | 'recommendedStack' | 'architecture' | 'mainComponents' | 'dataModel' | 'apiEndpoints' | 'integrations' | 'decisions'
  | 'security' | 'privacy' | 'edgeCases' | 'errorScenarios' | 'acceptanceCriteria'
  | 'phases' | 'developmentTasks' | 'risks' | 'openQuestions' | 'futureImprovements';

type SpecCopy = {
  title: string;
  description: string;
  ready: string;
  saved: string;
  specActions: string;
  exportSpec: string;
  copySpec: string;
  sections: Record<SpecSectionKey, string>;
  fields: Record<SpecFieldKey, string>;
  oneItemPerLine: string;
  moreDetails: string;
  handoff: string;
  promptTitle: string;
  promptDescription: string;
  generatePrompt: string;
  copyPrompt: string;
  exportPrompt: string;
  openWithAssistant: string;
  openInChatGPT: string;
  openInClaude: string;
  openInGemini: string;
  pastePromptHint: string;
  promptCopiedForChat: string;
  incompleteSpecError: string;
  promptReady: string;
  specCopied: string;
  promptCopied: string;
  clipboardBlocked: string;
  specExported: string;
  promptExported: string;
  backToDiscovery: string;
  openQuestionsCount: (count: number) => string;
  startAnother: string;
};

const copy: Record<ResolvedOutputLanguage, SpecCopy> = {
  English: {
    title: 'Your project plan',
    description: 'Review the summary first. Open a section only when you want to change its details.',
    ready: 'Ready to review',
    saved: 'Saved in this browser',
    specActions: 'Project actions',
    exportSpec: 'Export Markdown',
    copySpec: 'Copy Markdown',
    sections: {
      overview: 'Project summary',
      product: 'Product scope',
      engineering: 'Technical plan',
      quality: 'Quality',
      execution: 'Build plan',
    },
    fields: {
      projectName: 'Project name',
      summary: 'Short description',
      problem: 'Problem to solve',
      solution: 'Proposed solution',
      targetUser: 'Who this is for',
      goals: 'Main goals',
      mvpFeatures: 'First version features',
      outOfScope: 'Not included',
      userStories: 'User needs',
      primaryUserFlow: 'Main flow',
      recommendedStack: 'Recommended technologies',
      architecture: 'How the parts fit together',
      mainComponents: 'Main components',
      dataModel: 'Data to store',
      apiEndpoints: 'API endpoints',
      integrations: 'External integrations',
      decisions: 'Key decisions',
      security: 'Security',
      privacy: 'Privacy',
      edgeCases: 'Unusual situations',
      errorScenarios: 'Errors and recovery',
      acceptanceCriteria: 'How we know it works',
      phases: 'Build phases',
      developmentTasks: 'Development tasks',
      risks: 'Risks',
      openQuestions: 'Questions still open',
      futureImprovements: 'Later improvements',
    },
    oneItemPerLine: 'One item per line',
    moreDetails: 'Project details',
    handoff: 'Next step',
    promptTitle: 'Create the coding prompt',
    promptDescription: 'Use this reviewed plan to prepare a clear brief for your coding agent.',
    generatePrompt: 'Generate coding prompt',
    copyPrompt: 'Copy prompt',
    exportPrompt: 'Export Markdown',
    openWithAssistant: 'Open a new chat',
    openInChatGPT: 'Open in ChatGPT',
    openInClaude: 'Open in Claude',
    openInGemini: 'Open in Gemini',
    pastePromptHint: 'The prompt is copied. Paste it into the new chat, then press Enter.',
    promptCopiedForChat: 'Prompt copied. Paste it into the new chat, then press Enter.',
    incompleteSpecError: 'Review the required fields before creating the coding prompt.',
    promptReady: 'Coding prompt ready.',
    specCopied: 'Project Markdown copied.',
    promptCopied: 'Coding prompt copied.',
    clipboardBlocked: 'Clipboard access was blocked. Select the text and copy it manually.',
    specExported: 'Project spec exported.',
    promptExported: 'Coding prompt exported.',
    backToDiscovery: 'Back to questions',
    openQuestionsCount: (count) => `${count} ${count === 1 ? 'open question' : 'open questions'}`,
    startAnother: 'Start a new project',
  },
  Português: {
    title: 'Plano do projeto',
    description: 'Revise o resumo primeiro. Abra uma seção apenas se quiser ajustar os detalhes.',
    ready: 'Pronto para revisar',
    saved: 'Salvo neste navegador',
    specActions: 'Ações do projeto',
    exportSpec: 'Exportar Markdown',
    copySpec: 'Copiar Markdown',
    sections: {
      overview: 'Resumo do projeto',
      product: 'Produto',
      engineering: 'Plano técnico',
      quality: 'Qualidade',
      execution: 'Plano de execução',
    },
    fields: {
      projectName: 'Nome do projeto',
      summary: 'Descrição curta',
      problem: 'Problema que resolve',
      solution: 'Solução proposta',
      targetUser: 'Para quem é',
      goals: 'Objetivos principais',
      mvpFeatures: 'Funcionalidades da primeira versão',
      outOfScope: 'O que fica de fora',
      userStories: 'Necessidades dos usuários',
      primaryUserFlow: 'Fluxo principal',
      recommendedStack: 'Tecnologias recomendadas',
      architecture: 'Como o sistema se organiza',
      mainComponents: 'Componentes principais',
      dataModel: 'Dados armazenados',
      apiEndpoints: 'Endpoints da API',
      integrations: 'Serviços e integrações externas',
      decisions: 'Decisões importantes',
      security: 'Segurança',
      privacy: 'Privacidade',
      edgeCases: 'Situações incomuns',
      errorScenarios: 'Erros e recuperação',
      acceptanceCriteria: 'Critérios de aceitação',
      phases: 'Etapas de implementação',
      developmentTasks: 'Tarefas de desenvolvimento',
      risks: 'Riscos',
      openQuestions: 'Questões em aberto',
      futureImprovements: 'Melhorias futuras',
    },
    oneItemPerLine: 'Um item por linha',
    moreDetails: 'Detalhes do projeto',
    handoff: 'Próximo passo',
    promptTitle: 'Criar o prompt para o agente',
    promptDescription: 'Use este plano revisado para preparar instruções claras para o agente de código.',
    generatePrompt: 'Gerar prompt do agente',
    copyPrompt: 'Copiar prompt',
    exportPrompt: 'Exportar Markdown',
    openWithAssistant: 'Abrir nova conversa',
    openInChatGPT: 'Abrir no ChatGPT',
    openInClaude: 'Abrir no Claude',
    openInGemini: 'Abrir no Gemini',
    pastePromptHint: 'O prompt foi copiado. Cole na nova conversa e pressione Enter.',
    promptCopiedForChat: 'Prompt copiado. Cole na nova conversa e pressione Enter.',
    incompleteSpecError: 'Revise os campos obrigatórios antes de criar o prompt para o agente.',
    promptReady: 'Prompt para o agente pronto.',
    specCopied: 'Markdown do projeto copiado.',
    promptCopied: 'Prompt do agente copiado.',
    clipboardBlocked: 'O navegador bloqueou a cópia. Selecione o texto e copie manualmente.',
    specExported: 'Especificação exportada.',
    promptExported: 'Prompt do agente exportado.',
    backToDiscovery: 'Voltar às perguntas',
    openQuestionsCount: (count) => `${count} ${count === 1 ? 'questão em aberto' : 'questões em aberto'}`,
    startAnother: 'Começar outro projeto',
  },
};

export function getSpecCopy(language: ResolvedOutputLanguage): SpecCopy {
  return copy[language];
}
