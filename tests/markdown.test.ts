import { describe, expect, it } from 'vitest';
import { buildCodingPrompt, specToMarkdown } from '../lib/domain/markdown';
import type { ProjectSpec } from '../lib/schemas/project';

const spec: ProjectSpec = {
  overview: { projectName: 'Orbit', summary: 'Make plans', problem: 'Ideas are vague', solution: 'Structured plans', targetUser: 'Builders', goals: ['Start small'] },
  product: { mvpFeatures: ['Discovery'], outOfScope: ['Accounts'], userStories: ['As a user I can plan'], primaryUserFlow: ['Describe idea'] },
  engineering: { recommendedStack: ['Next.js'], architecture: 'App Router', mainComponents: ['Workspace'], dataModel: ['Project'], apiEndpoints: [], integrations: ['Gemini'], decisions: ['Use local history'] },
  quality: { security: ['Validate inputs'], privacy: ['Local storage'], edgeCases: ['Empty idea'], errorScenarios: ['Provider error'], acceptanceCriteria: ['Export works'] },
  execution: { phases: ['MVP'], developmentTasks: ['Build workspace'], risks: ['Bad model output'], openQuestions: [], futureImprovements: ['Templates'] },
};

describe('spec Markdown and coding prompt', () => {
  it('exports every structured section without rendering empty values as fabricated content', () => {
    const markdown = specToMarkdown(spec);
    expect(markdown).toContain('# Orbit');
    expect(markdown).toContain('## Quality');
    expect(markdown).not.toContain('None provided');
  });

  it('creates a coding prompt with explicit scope and done criteria', () => {
    const prompt = buildCodingPrompt(spec);
    expect(prompt).toContain('Do not silently expand scope');
    expect(prompt).toContain('Acceptance Criteria');
    expect(prompt).toContain('Definition of done');
  });

  it('localizes the specification and coding prompt to Portuguese', () => {
    const markdown = specToMarkdown(spec, 'Português');
    const prompt = buildCodingPrompt(spec, 'Português');

    expect(markdown).toContain('## Visão geral');
    expect(markdown).toContain('### Critérios de aceitação');
    expect(prompt).toContain('## Objetivo');
    expect(prompt).toContain('## Público-alvo');
    expect(prompt).toContain('Não amplie o escopo em silêncio.');
    expect(prompt).toContain('## Requisitos de teste');
    expect(prompt).not.toContain('## Constraints');
  });

  it('uses the idea language for Same as input exports', () => {
    expect(specToMarkdown(spec, 'Same as input', 'Quero organizar turnos para voluntários.')).toContain('## Visão geral');
    expect(buildCodingPrompt(spec, 'Same as input', 'I want to organize shifts for volunteers.')).toContain('## Objective');
  });

  it('keeps English exports in English when explicitly selected', () => {
    expect(specToMarkdown(spec, 'English', 'Quero organizar turnos para voluntários.')).toContain('## Overview');
    expect(buildCodingPrompt(spec, 'English', 'Quero organizar turnos para voluntários.')).toContain('## Testing requirements');
  });

  it('cleans generated prefixes only from the coding prompt', () => {
    const generatedSpec: ProjectSpec = {
      ...spec,
      product: {
        ...spec.product,
        userStories: [':trip_creator: As a trip creator, I can share a trip.', ': Como mantenedor, quero acompanhar atualizações.'],
      },
      engineering: {
        ...spec.engineering,
        decisions: [':Q1: Accept suggestion for a static list.'],
      },
      execution: {
        ...spec.execution,
        phases: [':Phase 1 – MVP', ':**Phase 2 – Future improvements'],
      },
    };

    const prompt = buildCodingPrompt(generatedSpec);
    const markdown = specToMarkdown(generatedSpec);

    expect(prompt).not.toMatch(/^\s*(?:-\s*)?:(?:Q\d+|trip_creator):/m);
    expect(prompt).not.toMatch(/^\s*(?:-\s*)?:\s*(?:\*\*)?Phase\s+\d+/mi);
    expect(prompt).toContain('As a trip creator, I can share a trip.');
    expect(prompt).toContain('- Como mantenedor, quero acompanhar atualizações.');
    expect(prompt).not.toContain('- : Como mantenedor');
    expect(markdown).toContain(':trip_creator:');
    expect(markdown).toContain(':Q1:');
    expect(markdown).toContain(':Phase 1');
  });
});
