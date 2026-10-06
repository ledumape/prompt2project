import type { Discovery, IdeaInput } from '../schemas/project';
import type { SavedProject } from '../storage/projects';

export function createAnalyzedProject(
  current: SavedProject | null,
  input: IdeaInput,
  discovery: Discovery,
  updatedAt: string,
  makeId: () => string,
): SavedProject {
  return {
    id: current?.id || makeId(),
    name: input.projectName || 'Untitled project',
    updatedAt,
    stage: 'discovery',
    idea: input,
    discovery,
    answers: {},
    challengeDecisions: Object.fromEntries(discovery.challenges.map((challenge) => [challenge.id, 'keep'])),
  };
}

export function upsertProject(projects: SavedProject[], next: SavedProject): SavedProject[] {
  return [next, ...projects.filter((project) => project.id !== next.id)].slice(0, 20);
}
