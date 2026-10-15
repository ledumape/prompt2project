import { z } from 'zod';
import { discoverySchema, ideaInputSchema, projectSpecSchema } from '../schemas/project';

const savedProjectSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(100),
  updatedAt: z.string().datetime(),
  stage: z.enum(['idea', 'discovery', 'spec']),
  idea: ideaInputSchema,
  discovery: discoverySchema.optional(),
  answers: z.record(z.string(), z.string().max(1_000)).optional(),
  challengeDecisions: z.record(z.string(), z.enum(['accept', 'keep'])).optional(),
  spec: projectSpecSchema.optional(),
  codingPrompt: z.string().max(100_000).optional(),
}).superRefine((project, context) => {
  if (project.stage === 'discovery' && !project.discovery) context.addIssue({ code: 'custom', path: ['discovery'], message: 'Discovery data is required for this project stage.' });
  if (project.stage === 'spec' && !project.spec) context.addIssue({ code: 'custom', path: ['spec'], message: 'A project spec is required for this project stage.' });
});

const readableEnvelopeSchema = z.object({ version: z.number().int(), projects: z.array(z.unknown()) });

export type SavedProject = z.infer<typeof savedProjectSchema>;
export const PROJECTS_STORAGE_KEY = 'prompt2project.projects.v1';
export const PROJECTS_BACKUP_STORAGE_KEY = 'prompt2project.projects.backup.v1';

export function readProjectHistory(serialized: string | null | undefined): { projects: SavedProject[]; needsBackup: boolean } {
  if (serialized == null) return { projects: [], needsBackup: false };

  try {
    const parsed: unknown = JSON.parse(serialized);
    const envelope = readableEnvelopeSchema.safeParse(parsed);
    if (!envelope.success) return { projects: [], needsBackup: true };

    const projects = envelope.data.projects.flatMap((candidate) => {
      const result = savedProjectSchema.safeParse(candidate);
      return result.success ? [result.data] : [];
    });
    const needsBackup = envelope.data.version !== 1
      || projects.length !== envelope.data.projects.length
      || envelope.data.projects.length > 20;
    return { projects: projects.slice(0, 20), needsBackup };
  } catch {
    return { projects: [], needsBackup: true };
  }
}

export function serializeProjects(projects: SavedProject[]): string {
  return JSON.stringify({ version: 1, projects: projects.slice(0, 20) });
}

export function parseProjects(serialized: string | null | undefined): SavedProject[] {
  return readProjectHistory(serialized).projects;
}
