const genericTerms = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'do', 'for', 'from', 'in', 'into', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'their', 'this', 'to', 'using', 'with', 'without',
  'um', 'uma', 'uns', 'umas', 'e', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem', 'que', 'se', 'ao', 'aos', 'ou', 'sua', 'seu', 'suas', 'seus',
  'app', 'apps', 'application', 'applications', 'aplicativo', 'aplicativos', 'software', 'system', 'systems', 'sistema', 'sistemas', 'tool', 'tools', 'ferramenta', 'ferramentas', 'web', 'mobile', 'platform', 'plataforma', 'build', 'create', 'make', 'matches', 'match', 'sends', 'send', 'enviar', 'organizar', 'organiza', 'organizam', 'allows', 'help', 'helps', 'manage', 'manages', 'para', 'using',
  'quero', 'queremos', 'gostaria', 'preciso', 'criar', 'pessoa', 'pessoas', 'possa', 'possam', 'sugerir', 'sugere', 'votar', 'opções', 'opcao', 'dividir',
]);

export function extractIdeaConcepts(idea: string): string[] {
  const words = idea.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]{2,}/gu) || [];
  const concepts: string[] = [];
  const normalized = new Set<string>();
  for (const word of words) {
    const key = word.toLocaleLowerCase();
    if (genericTerms.has(key) || normalized.has(key)) continue;
    normalized.add(key);
    concepts.push(word);
    if (concepts.length === 3) break;
  }
  return concepts.length ? concepts : ['Problem', 'People', 'Scope'];
}
