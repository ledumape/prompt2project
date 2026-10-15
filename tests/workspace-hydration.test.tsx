import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Workspace } from '../components/workspace';
import { ideaInputSchema, type Discovery, type ProjectSpec } from '../lib/schemas/project';
import { serializeProjects, type SavedProject } from '../lib/storage/projects';

const prompt = '# Exact coding prompt\n\nBuild only the approved MVP.';
const idea = ideaInputSchema.parse({
  projectName: 'Sessão de filmes',
  idea: 'Um app para um grupo decidir qual filme assistir.',
  platform: 'Web',
  outputLanguage: 'Português',
});
const discovery: Discovery = {
  projectUnderstanding: 'Aplicativo para o grupo escolher um filme.',
  knownInformation: [],
  missingInformation: [],
  questions: [],
  challenges: [],
  readyForSpec: true,
};
const spec: ProjectSpec = {
  overview: {
    projectName: 'Sessão de filmes',
    summary: 'Ajuda o grupo a escolher um filme.',
    problem: 'O grupo demora a decidir o que assistir.',
    solution: 'Cada pessoa vota nas opções apresentadas.',
    targetUser: 'Amigos e familiares.',
    goals: ['Escolher um filme em grupo.'],
  },
  product: { mvpFeatures: [], outOfScope: [], userStories: [], primaryUserFlow: [] },
  engineering: { recommendedStack: [], architecture: 'Aplicativo web simples.', mainComponents: [], dataModel: [], apiEndpoints: [], integrations: [], decisions: [] },
  quality: { security: [], privacy: [], edgeCases: [], errorScenarios: [], acceptanceCriteria: ['O grupo consegue votar.'] },
  execution: { phases: [], developmentTasks: [], risks: [], openQuestions: [], futureImprovements: [] },
};
const savedProject: SavedProject = {
  id: 'stable-project-id',
  name: idea.projectName,
  updatedAt: '2026-10-15T10:00:00.000Z',
  stage: 'spec',
  idea,
  discovery,
  answers: {},
  challengeDecisions: {},
  spec,
  codingPrompt: prompt,
};

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('workspace browser persistence and handoff actions', () => {
  it('restores the same project and prompt after a browser-like remount', async () => {
    window.localStorage.setItem('prompt2project.projects.v1', serializeProjects([savedProject]));
    window.localStorage.setItem('prompt2project.language', 'Português');

    const user = userEvent.setup();
    const firstMount = render(<Workspace />);
    const historyEntry = await screen.findByRole('button', { name: /Sessão de filmes.*Especificação/ });
    await user.click(historyEntry);
    await waitFor(() => expect(document.querySelector('.prompt-preview')?.textContent).toBe(prompt));
    firstMount.unmount();

    render(<Workspace />);
    await user.click(await screen.findByRole('button', { name: /Sessão de filmes.*Especificação/ }));
    await waitFor(() => expect(document.querySelector('.prompt-preview')?.textContent).toBe(prompt));
    expect(window.localStorage.getItem('prompt2project.projects.v1')).toContain('stable-project-id');
  });

  it('copies the exact prompt displayed and gives each Markdown export its own message', async () => {
    window.localStorage.setItem('prompt2project.projects.v1', serializeProjects([savedProject]));
    window.localStorage.setItem('prompt2project.language', 'Português');
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText } });
    expect(window.navigator.clipboard.writeText).toBe(writeText);
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<Workspace />);
    await user.click(await screen.findByRole('button', { name: /Sessão de filmes.*Especificação/ }));
    await waitFor(() => expect(document.querySelector('.prompt-preview')?.textContent).toBe(prompt));

    await user.click(screen.getByRole('button', { name: 'Copiar prompt' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(prompt));

    await user.click(screen.getAllByRole('button', { name: 'Exportar Markdown' })[0]!);
    expect(await screen.findByText('Especificação exportada.')).toBeTruthy();

    await user.click(screen.getAllByRole('button', { name: 'Exportar Markdown' })[1]!);
    expect(await screen.findByText('Prompt do agente exportado.')).toBeTruthy();
  });
});
