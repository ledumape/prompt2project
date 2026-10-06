import { describe, expect, it } from 'vitest';
import { createAnalyzedProject, upsertProject } from '../lib/domain/projects';
import type { Discovery, IdeaInput } from '../lib/schemas/project';
import type { SavedProject } from '../lib/storage/projects';

const input: IdeaInput = {
  projectName: 'Volunteer shifts',
  idea: 'A tool for matching volunteers to shifts.',
  platform: 'Web',
  targetUser: '',
  preferences: '',
  outputLanguage: 'English',
};
const discovery: Discovery = {
  projectUnderstanding: 'A volunteer scheduling tool.',
  knownInformation: [],
  missingInformation: [],
  questions: [],
  challenges: [],
  readyForSpec: true,
};
const existing: SavedProject = {
  id: 'project-original',
  name: 'Volunteer shifts',
  updatedAt: '2026-10-06T12:00:00.000Z',
  stage: 'discovery',
  idea: input,
  discovery,
  answers: { audience: 'Local groups' },
};

describe('re-analyzing an existing project', () => {
  it('preserves the project ID when building its new discovery state', () => {
    const editedInput = { ...input, idea: 'A tool for coordinating local volunteer shifts.' };
    const next = createAnalyzedProject(existing, editedInput, discovery, '2026-10-06T13:00:00.000Z', () => 'new-id');

    expect(next.id).toBe(existing.id);
    expect(next.idea.idea).toBe(editedInput.idea);
    expect(next.answers).toEqual({});
    expect(next.stage).toBe('discovery');
  });

  it('uses a new ID for a new project and replaces the old entry on update', () => {
    const next = createAnalyzedProject(null, input, discovery, '2026-10-06T13:00:00.000Z', () => 'new-id');
    const history = upsertProject([existing], { ...next, id: existing.id });

    expect(next.id).toBe('new-id');
    expect(history).toHaveLength(1);
    expect(history[0]?.id).toBe(existing.id);
  });
});
