import { describe, expect, it } from 'vitest';
import { parseProjects, readProjectHistory, serializeProjects, type SavedProject } from '../lib/storage/projects';
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
    expect(parseProjects(JSON.stringify({ version: 0, projects: [project] }))).toEqual([project]);
    expect(parseProjects(JSON.stringify({ version: 1, projects: [{ ...project, stage: 'hacked' }] }))).toEqual([]);
    expect(parseProjects(JSON.stringify({ version: 1, projects: [{ ...project, stage: 'spec' }] }))).toEqual([]);
  });

  it('preserves valid projects when a different saved entry cannot be parsed', () => {
    const serialized = JSON.stringify({ version: 1, projects: [project, { ...project, id: '' }] });

    expect(readProjectHistory(serialized)).toEqual({ projects: [project], needsBackup: true });
  });

  it('marks unreadable history for backup before an empty state can overwrite it', () => {
    expect(readProjectHistory('{broken')).toEqual({ projects: [], needsBackup: true });
    expect(readProjectHistory(JSON.stringify({ version: 0, projects: [project] }))).toEqual({
      projects: [project], needsBackup: true,
    });
    expect(readProjectHistory(null)).toEqual({ projects: [], needsBackup: false });
  });
});
