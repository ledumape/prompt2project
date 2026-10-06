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

const envelopeSchema = z.object({ version: z.literal(1), projects: z.array(savedProjectSchema).max(20) });

export type SavedProject = z.infer<typeof savedProjectSchema>;

export function serializeProjects(projects: SavedProject[]): string {
  return JSON.stringify({ version: 1, projects: projects.slice(0, 20) });
}

export function parseProjects(serialized: string | null | undefined): SavedProject[] {
  if (!serialized) return [];
  try {
    const parsed: unknown = JSON.parse(serialized);
    const result = envelopeSchema.safeParse(parsed);
    return result.success ? result.data.projects : [];
  } catch {
    return [];
  }
}
