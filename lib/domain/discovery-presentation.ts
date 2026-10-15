import type { ResolvedOutputLanguage } from './language';

const copy = {
  English: {
    eyebrow: 'Discovery',
    title: 'See the shape',
    titleAccent: 'before you build.',
    description: 'Check what we understood, answer what matters, and decide which product engineer suggestions belong in your plan.',
    projectUnderstanding: 'Project understanding',
    yourIdea: 'Your idea',
    knownSoFar: 'Known so far',
    noKnownInformation: 'We have not identified any firm details yet.',
    stillOpen: 'Still open',
    noMissingInformation: 'The core direction is already clear.',
    productEngineerNotes: 'Product engineer notes',
    yourCall: 'YOUR CALL',
    productEngineerSuggestion: 'Product engineer suggestion:',
    decisionFor: 'Decision for',
    impact: 'impact',
    severity: { low: 'low', medium: 'medium', high: 'high' },
    acceptSuggestion: 'Accept suggestion',
    keepApproach: 'Keep my approach',
    decisionsToMake: 'A few decisions to make',
    questions: 'QUESTIONS',
    question: 'QUESTION',
    answerLabel: 'Your answer:',
    answerPlaceholder: 'Add an answer, or leave blank to keep this open…',
    editIdea: 'Edit idea',
    openQuestionsNote: 'You can leave questions open. They will stay visible in the spec.',
    generateSpec: 'Generate project spec',
    buildingSpec: 'Building the spec',
    providerError: 'The AI returned a response that could not be validated. Please try again.',
    unavailableError: 'The AI service could not complete this request. Check your connection and try again.',
    providerRequestError: 'The selected AI provider rejected the structured request. Check the model configuration and try again.',
    configurationError: 'The selected AI provider API key or model access is unavailable. Check the server configuration and model access.',
    rateLimitedError: 'The selected AI provider usage limit has been reached. Wait for it to reset or check the model quota, then try again.',
    requestTooLargeError: 'This request is too large. Shorten the project details and try again.',
  },
  Português: {
    eyebrow: 'Descoberta',
    title: 'Entenda o plano',
    titleAccent: 'antes de construir.',
    description: 'Confira o que entendemos, responda ao que importa e escolha quais sugestões de produto fazem sentido para o seu plano.',
    projectUnderstanding: 'Entendimento do projeto',
    yourIdea: 'Sua ideia',
    knownSoFar: 'Já sabemos',
    noKnownInformation: 'Ainda não identificamos informações confirmadas.',
    stillOpen: 'Pontos em aberto',
    noMissingInformation: 'A direção principal já está clara.',
    productEngineerNotes: 'Sugestões de produto',
    yourCall: 'VOCÊ DECIDE',
    productEngineerSuggestion: 'Sugestão de produto:',
    decisionFor: 'Decisão sobre',
    impact: 'impacto',
    severity: { low: 'baixo', medium: 'médio', high: 'alto' },
    acceptSuggestion: 'Aceitar sugestão',
    keepApproach: 'Manter minha abordagem',
    decisionsToMake: 'Algumas decisões pendentes',
    questions: 'PERGUNTAS',
    question: 'PERGUNTA',
    answerLabel: 'Sua resposta:',
    answerPlaceholder: 'Responda ou deixe em branco para manter esta questão aberta…',
    editIdea: 'Editar ideia',
    openQuestionsNote: 'Você pode deixar perguntas em aberto. Elas continuarão visíveis na especificação.',
    generateSpec: 'Gerar especificação do projeto',
    buildingSpec: 'Gerando a especificação',
    providerError: 'A IA retornou uma resposta que não pôde ser validada. Tente novamente.',
    unavailableError: 'O serviço de IA não conseguiu concluir esta solicitação. Verifique a conexão e tente novamente.',
    providerRequestError: 'O provedor de IA rejeitou a solicitação estruturada. Verifique o modelo configurado e tente novamente.',
    configurationError: 'A chave ou o acesso ao modelo do provedor de IA está indisponível. Verifique a configuração do servidor e o acesso ao modelo.',
    rateLimitedError: 'O limite de uso do provedor de IA foi atingido. Aguarde a renovação ou verifique a cota do modelo e tente novamente.',
    requestTooLargeError: 'Esta solicitação é muito grande. Reduza os detalhes do projeto e tente novamente.',
  },
} as const;

const fieldLabels: Record<string, { English: string; Português: string }> = {
  projectName: { English: 'Project name', Português: 'Nome do projeto' },
  idea: { English: 'Idea', Português: 'Ideia' },
  platform: { English: 'Platform', Português: 'Plataforma' },
  targetUser: { English: 'Target audience', Português: 'Público-alvo' },
  preferences: { English: 'Preferences', Português: 'Preferências' },
  outputLanguage: { English: 'Output language', Português: 'Idioma de saída' },
  coreFeatures: { English: 'Core features', Português: 'Funcionalidades principais' },
  externalIntegrations: { English: 'External integrations', Português: 'Integrações externas' },
  privacyAndSecurityRequirements: { English: 'Privacy and security requirements', Português: 'Requisitos de privacidade e segurança' },
  deploymentAndMaintenancePlan: { English: 'Deployment and maintenance plan', Português: 'Plano de publicação e manutenção' },
};

export function getDiscoveryCopy(language: ResolvedOutputLanguage) {
  return copy[language];
}

export function formatDiscoveryFact(value: string, language: ResolvedOutputLanguage): string {
  const cleanedValue = value.trim().replace(/^:\s*/, '');
  const match = cleanedValue.match(/^\/([A-Za-z][A-Za-z0-9]*)(?::\s*(.*))?$/);
  if (!match) return cleanedValue;

  const key = match[1] || '';
  const suppliedValue = match[2]?.trim();
  const label = fieldLabels[key]?.[language]
    || key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (character) => character.toLocaleUpperCase());
  return suppliedValue ? `${label}: ${suppliedValue}` : label;
}

export function localizeDiscoveryError(message: string, language: ResolvedOutputLanguage): string {
  if (language === 'English') return message;
  if (message.includes('could not be validated') || message.includes('did not match the expected format')) return copy.Português.providerError;
  if (message.includes('could not complete this request') || message.includes("Couldn't reach the Prompt2Project server")) return copy.Português.unavailableError;
  if (message.includes('rejected the structured request')) return copy.Português.providerRequestError;
  if (message.includes('API key or model access is unavailable')) return copy.Português.configurationError;
  if (message.includes('usage limit has been reached')) return copy.Português.rateLimitedError;
  if (message.includes('request is too large')) return copy.Português.requestTooLargeError;
  return message;
}
