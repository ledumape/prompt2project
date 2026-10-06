import type { Discovery, IdeaInput, ProjectSpec, SpecRequest } from '../schemas/project';

export interface AIProvider {
  analyzeIdea(input: IdeaInput): Promise<Discovery>;
  generateSpec(request: SpecRequest): Promise<ProjectSpec>;
}

export class AIProviderError extends Error {
  constructor(readonly code: 'configuration' | 'invalid-response' | 'request-too-large' | 'unavailable') {
    super(code);
    this.name = 'AIProviderError';
  }
}
