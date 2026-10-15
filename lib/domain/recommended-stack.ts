/** Normalize a model's stack list into one decisive, readable recommendation. */
export function normalizeRecommendedStack(recommendations: string[]): string[] {
  const choices = recommendations
    .map((recommendation) => recommendation
      .replace(/^\s*:+\s*/u, '')
      .trim()
      .replace(/\s+(?:or|ou|\/)\s+[\s\S]*$/iu, '')
      .trim())
    .filter(Boolean);

  return choices.length ? [choices.join('; ')] : [];
}
