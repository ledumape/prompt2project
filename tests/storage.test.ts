import { describe, expect, it } from 'vitest';
import { parseProjects, serializeProjects, type SavedProject } from '../lib/storage/projects';
import { ideaInputSchema } from '../lib/schemas/project';

const project: SavedProject = {
  id: 'project-1',
  name: 'Orbit',
  updatedAt: '2026-10-06T12:00:00.000Z',
  stage: 'idea',
  idea: ideaInputSchema.parse({ idea: 'A project copilot', platform: 'Web', outputLanguage: 'English' }),
};

describe('local project history', () => {
  it('round trips versioned project data', () => {
    const restored = parseProjects(serializeProjects([project]));
    expect(restored[0].idea.idea).toBe(project.idea.idea);
    expect(restored[0].stage).toBe(project.stage);
    expect(restored[0].idea.preferences).toBe('');
  });

  it('returns an empty history for malformed, old, or invalid data', () => {
    expect(parseProjects('{broken')).toEqual([]);
    expect(parseProjects(JSON.stringify({ version: 0, projects: [project] }))).toEqual([]);
    expect(parseProjects(JSON.stringify({ version: 1, projects: [{ ...project, stage: 'hacked' }] }))).toEqual([]);
    expect(parseProjects(JSON.stringify({ version: 1, projects: [{ ...project, stage: 'spec' }] }))).toEqual([]);
  });
});
