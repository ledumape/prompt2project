import type { Discovery, IdeaInput, ProjectSpec, SpecRequest } from '../schemas/project';
import { resolveOutputLanguage, type ResolvedOutputLanguage } from '../domain/language';
import { AIProviderError, type ResponseValidationFailure } from './provider';

export type SemanticFailure = Extract<ResponseValidationFailure, 'wrong-language' | 'essential-field-too-short' | 'unsupported-quantity'>;

const languageMarkers: Record<ResolvedOutputLanguage, ReadonlySet<string>> = {
  English: new Set(['the', 'and', 'with', 'without', 'for', 'from', 'that', 'this', 'these', 'those', 'users', 'user', 'group', 'groups', 'friend', 'friends', 'travel', 'trip', 'trips', 'choose', 'voting', 'project', 'helps', 'allows', 'should', 'could', 'can', 'will', 'is', 'are', 'to', 'of', 'in', 'by', 'as', 'their', 'who', 'what']),
  Português: new Set(['não', 'você', 'uma', 'um', 'uns', 'umas', 'de', 'da', 'do', 'dos', 'das', 'que', 'para', 'com', 'sem', 'quero', 'preciso', 'minha', 'meu', 'organizar', 'aplicativo', 'usuário', 'usuários', 'pessoas', 'grupo', 'grupos', 'amigo', 'amigos', 'viagem', 'viagens', 'destino', 'destinos', 'votação', 'projeto', 'ajuda', 'permite', 'pode', 'deve', 'está', 'são', 'como', 'mais', 'ideia', 'público', 'alvo', 'por', 'uma', 'seu', 'sua', 'quem', 'qual', 'quais', 'precisa', 'será', 'opção', 'opções']),
};

function clearlyWrongLanguage(text: string, expected: ResolvedOutputLanguage): boolean {
  const words = text.toLocaleLowerCase().match(/[\p{L}]+/gu) || [];
  if (words.length < 2) return false;
  const own = words.reduce((score, word) => score + Number(languageMarkers[expected].has(word)), 0);
  const otherLanguage = expected === 'English' ? 'Português' : 'English';
  const other = words.reduce((score, word) => score + Number(languageMarkers[otherLanguage].has(word)), 0);
  return other >= 2 && other >= own + 2;
}

function discoveryLanguageFields(discovery: Discovery): string[] {
  return [
    discovery.projectUnderstanding,
    ...discovery.knownInformation,
    ...discovery.missingInformation,
    ...discovery.questions.flatMap((question) => [question.question, question.reason, ...question.options]),
    ...discovery.challenges.flatMap((challenge) => [challenge.issue, challenge.reason, challenge.suggestion]),
  ];
}

function specLanguageFields(spec: ProjectSpec): string[] {
  return [
    spec.overview.summary, spec.overview.problem, spec.overview.solution, spec.overview.targetUser, ...spec.overview.goals,
    ...spec.product.mvpFeatures, ...spec.product.outOfScope, ...spec.product.userStories, ...spec.product.primaryUserFlow,
    spec.engineering.architecture, ...spec.engineering.mainComponents, ...spec.engineering.integrations, ...spec.engineering.decisions,
    ...spec.quality.security, ...spec.quality.privacy, ...spec.quality.edgeCases, ...spec.quality.errorScenarios, ...spec.quality.acceptanceCriteria,
    ...spec.execution.phases, ...spec.execution.developmentTasks, ...spec.execution.risks, ...spec.execution.openQuestions, ...spec.execution.futureImprovements,
  ];
}

function hasWrongLanguage(fields: string[], expected: ResolvedOutputLanguage): boolean {
  return fields.some((field) => clearlyWrongLanguage(field, expected));
}

function tooShort(value: string, minimum: number): boolean {
  return value.trim().length < minimum;
}

function discoveryHasShortEssentialText(discovery: Discovery): boolean {
  return tooShort(discovery.projectUnderstanding, 14)
    || discovery.questions.some((question) => tooShort(question.question, 12) || tooShort(question.reason, 12))
    || discovery.challenges.some((challenge) => tooShort(challenge.issue, 12) || tooShort(challenge.reason, 12) || tooShort(challenge.suggestion, 12));
}

function specHasShortEssentialText(spec: ProjectSpec): boolean {
  return tooShort(spec.overview.summary, 10)
    || tooShort(spec.overview.problem, 18)
    || tooShort(spec.overview.solution, 18)
    || tooShort(spec.overview.targetUser, 8)
    || tooShort(spec.engineering.architecture, 16)
    || spec.quality.acceptanceCriteria.length === 0
    || spec.quality.acceptanceCriteria.some((criterion) => tooShort(criterion, 12));
}

const numberWords: Record<string, string> = {
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  um: '1', uma: '1', dois: '2', duas: '2', tres: '3', três: '3', quatro: '4', cinco: '5', seis: '6', sete: '7', oito: '8', nove: '9', dez: '10',
};
const numberSource = String.raw`(?:\d+(?:[.,]\d+)?(?:\s*(?:-|–|\bto\b|\ba\b|\baté\b)\s*\d+(?:[.,]\d+)?)?|zero|one|two|three|four|five|six|seven|eight|nine|ten|um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez)`;

const quantityUnits: { category: string; pattern: string }[] = [
  { category: 'audience', pattern: 'users?|people|persons?|participants?|members?|customers?|visitors?|friends?|pessoas|usuários?|participantes?|membros?|clientes?|visitantes?|amigos?' },
  { category: 'duration-seconds', pattern: 'seconds?|segundos?' },
  { category: 'duration-minutes', pattern: 'minutes?|minutos?' },
  { category: 'duration-hours', pattern: 'hours?|horas?' },
  { category: 'duration-days', pattern: 'days?|dias?' },
  { category: 'duration-weeks', pattern: 'weeks?|semanas?' },
  { category: 'duration-months', pattern: 'months?|meses' },
  { category: 'duration-years', pattern: 'years?|anos?' },
  { category: 'latency', pattern: 'milliseconds?|milissegundos?|ms' },
  { category: 'percentage', pattern: 'percent(?:age)?|por cento|%' },
  { category: 'storage-kb', pattern: 'kilobytes?|kb' },
  { category: 'storage-mb', pattern: 'megabytes?|mb' },
  { category: 'storage-gb', pattern: 'gigabytes?|gb' },
  { category: 'features', pattern: 'features?|funcionalidades?|telas?|screens?|pages?|páginas?|integrações?|integrations?' },
  { category: 'currency', pattern: 'dollars?|usd|reais?|brl|euros?|eur' },
  { category: 'rate-per-second', pattern: 'requests?\s*(?:per|\/)\s*second|req\/s|rps|solicitações?\s*por\s*segundo' },
  { category: 'rate-per-minute', pattern: 'requests?\s*(?:per|\/)\s*minute|req\/min|solicitações?\s*por\s*minuto' },
];

function normalizedNumber(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/g, '').replace(',', '.')
    .replace(/\d+|[a-záêô]+/giu, (part) => numberWords[part] || part);
}

function quantityClaims(text: string): Set<string> {
  const claims = new Set<string>();
  if (/\b(?:couples?|casais?|um casal|a couple|both partners|os dois|as duas pessoas|me and my (?:partner|girlfriend|boyfriend|wife|husband)|my (?:partner|girlfriend|boyfriend|wife|husband) and i|eu e minha? (?:parceira|namorada|esposa)|eu e meu (?:parceiro|namorado|marido)|minha? (?:parceira|namorada|esposa) e eu|meu (?:parceiro|namorado|marido) e eu)\b/iu.test(text)) {
    claims.add('audience:2');
  }
  for (const { category, pattern } of quantityUnits) {
    const expression = new RegExp(String.raw`\b(${numberSource})\s*(?:${pattern})(?=$|\b|%)`, 'giu');
    for (const match of text.matchAll(expression)) {
      if (match[1]) claims.add(`${category}:${normalizedNumber(match[1])}`);
    }
  }
  for (const match of text.matchAll(/(?:R\$|US\$|[$€£])\s*(\d+(?:[.,]\d+)?)/giu)) {
    if (match[1]) claims.add(`currency:${normalizedNumber(match[1])}`);
  }
  for (const match of text.matchAll(/\b(?:by|before|until|in|ate|até|em|no ano de)\s+(19\d{2}|20\d{2})\b/giu)) {
    if (match[1]) claims.add(`year:${normalizedNumber(match[1])}`);
  }
  return claims;
}

function hasUnsupportedQuantities(generatedFields: string[], supportedText: string): boolean {
  const supported = quantityClaims(supportedText);
  return generatedFields.some((field) => [...quantityClaims(field)].some((claim) => !supported.has(claim)));
}

export function validateDiscoverySemantics(discovery: Discovery, input: IdeaInput): SemanticFailure | null {
  const expected = resolveOutputLanguage(input.outputLanguage, input.idea);
  const fields = discoveryLanguageFields(discovery);
  if (hasWrongLanguage(fields, expected)) return 'wrong-language';
  if (discoveryHasShortEssentialText(discovery)) return 'essential-field-too-short';
  if (hasUnsupportedQuantities(fields, JSON.stringify(input))) return 'unsupported-quantity';
  return null;
}

export function validateSpecSemantics(spec: ProjectSpec, request: SpecRequest): SemanticFailure | null {
  const expected = resolveOutputLanguage(request.input.outputLanguage, request.input.idea);
  const languageFields = specLanguageFields(spec);
  if (hasWrongLanguage(languageFields, expected)) return 'wrong-language';
  if (specHasShortEssentialText(spec)) return 'essential-field-too-short';

  const acceptedRecommendations = request.discovery.challenges
    .filter((challenge) => request.challengeDecisions[challenge.id] === 'accept')
    .flatMap((challenge) => [challenge.issue, challenge.reason, challenge.suggestion]);
  const supportedText = [
    request.input.idea, request.input.projectName, request.input.targetUser, request.input.preferences,
    ...Object.values(request.answers), ...acceptedRecommendations,
  ].join('\n');
  return hasUnsupportedQuantities(specLanguageFields(spec), supportedText) ? 'unsupported-quantity' : null;
}

export function semanticRetryInstruction(reason: ResponseValidationFailure, language: ResolvedOutputLanguage): string {
  const feedback: Record<ResolvedOutputLanguage, Record<ResponseValidationFailure, string>> = {
    English: {
      'wrong-language': 'The previous response used the wrong output language. Rewrite all descriptive fields in the requested language.',
      'essential-field-too-short': 'The previous response left an essential descriptive field too short to be useful. Provide concise, substantive text for every essential field.',
      'unsupported-quantity': 'The previous response introduced an unsupported number, deadline, percentage, or quantity. Remove the value; if it is unresolved, leave it as an open question without suggesting a number unless the user supplied or accepted it. Keep all descriptive fields in the requested language.',
      'invalid-content-type': 'The previous response was not returned as structured JSON. Return one JSON object with the required fields and types.',
      'invalid-json': 'The previous response was not valid JSON. Correct the format and return one complete JSON object with the required fields and types.',
      'schema-mismatch': 'The previous response did not match the required schema. Correct its field types, keep each string at or below 800 characters, and keep each list at or below 20 items.',
    },
    Português: {
      'wrong-language': 'A resposta anterior usou o idioma errado. Reescreva todos os campos descritivos no idioma solicitado.',
      'essential-field-too-short': 'A resposta anterior deixou um campo descritivo essencial curto demais para ser útil. Preencha cada campo essencial com texto conciso e substancial.',
      'unsupported-quantity': 'A resposta anterior introduziu um número, prazo, percentual ou quantidade sem suporte. Remova o valor; se estiver indefinido, mantenha-o como questão em aberto sem sugerir um número, a menos que o usuário o tenha informado ou aceitado. Mantenha todos os textos descritivos no idioma solicitado.',
      'invalid-content-type': 'A resposta anterior não foi retornada como JSON estruturado. Retorne um único objeto JSON com os campos e tipos exigidos.',
      'invalid-json': 'A resposta anterior não era um JSON válido. Corrija o formato e retorne um único objeto JSON completo com os campos e tipos exigidos.',
      'schema-mismatch': 'A resposta anterior não correspondeu ao esquema exigido. Corrija os tipos dos campos, limite cada texto a 800 caracteres e cada lista a 20 itens.',
    },
  };
  return feedback[language][reason];
}

export function appendSemanticFeedback(prompt: string, reason: ResponseValidationFailure, language: ResolvedOutputLanguage): string {
  const preserveSchema = language === 'Português'
    ? ' Mantenha o mesmo esquema e retorne apenas a resposta estruturada corrigida.'
    : ' Keep the same schema and return only the corrected structured response.';
  return `${prompt}\n\n<semantic_correction>\n${semanticRetryInstruction(reason, language)}${preserveSchema}\n</semantic_correction>`;
}

export async function generateWithSemanticRetry<T>(
  generate: (reason?: ResponseValidationFailure) => Promise<T>,
  validate: (value: T) => SemanticFailure | null,
): Promise<T> {
  let first: T;
  try {
    first = await generate();
  } catch (error) {
    if (!(error instanceof AIProviderError) || error.code !== 'invalid-response' || !error.validationFailure) throw error;
    const second = await generate(error.validationFailure);
    const secondFailure = validate(second);
    if (secondFailure) throw new AIProviderError('invalid-response', 'schema-mismatch', undefined, secondFailure);
    return second;
  }
  const firstFailure = validate(first);
  if (!firstFailure) return first;

  const second = await generate(firstFailure);
  const secondFailure = validate(second);
  if (secondFailure) throw new AIProviderError('invalid-response', 'schema-mismatch', undefined, secondFailure);
  return second;
}
