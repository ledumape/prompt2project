import { z } from 'zod';

const shortText = z.string().trim().max(800);
const requiredText = z.string().trim().min(1).max(800);
const textList = z.array(shortText).max(20);

export const ideaInputSchema = z.object({
  projectName: z.string().trim().max(100).optional().default(''),
  idea: z.string().trim().min(8, 'Describe the idea in at least 8 characters.').max(8_000),
  platform: z.enum(['Web', 'Mobile', 'Desktop', 'API / Backend', 'Other', "I don't know yet"]).default("I don't know yet"),
  targetUser: z.string().trim().max(500).optional().default(''),
  preferences: z.string().trim().max(1_500).optional().default(''),
  outputLanguage: z.enum(['English', 'Português', 'Same as input']).default('English'),
});

export const discoveryQuestionSchema = z.object({
  id: z.string().min(1).max(80),
  question: z.string().min(1).max(500),
  reason: z.string().min(1).max(500),
  type: z.enum(['text', 'single-choice']),
  options: z.array(z.string().max(160)).max(8),
});

export const challengeSchema = z.object({
  id: z.string().min(1).max(80),
  severity: z.enum(['low', 'medium', 'high']),
  issue: z.string().min(1).max(500),
  reason: z.string().min(1).max(700),
  suggestion: z.string().min(1).max(500),
});

export const discoveryGenerationSchema = z.object({
  projectUnderstanding: z.string().min(1).max(1_500),
  knownInformation: textList,
  missingInformation: textList,
  questions: z.array(discoveryQuestionSchema).max(7),
  challenges: z.array(challengeSchema).max(8),
  readyForSpec: z.boolean(),
});

export const discoverySchema = discoveryGenerationSchema.superRefine((discovery, context) => {
  for (const [label, items] of [['question', discovery.questions], ['challenge', discovery.challenges]] as const) {
    const ids = items.map((item) => item.id);
    if (new Set(ids).size !== ids.length) context.addIssue({ code: 'custom', path: [label === 'question' ? 'questions' : 'challenges'], message: `${label} IDs must be unique.` });
  }
});

export const projectSpecSchema = z.object({
  overview: z.object({
    projectName: requiredText,
    summary: requiredText,
    problem: requiredText,
    solution: requiredText,
    targetUser: requiredText,
    goals: textList,
  }),
  product: z.object({
    mvpFeatures: textList,
    outOfScope: textList,
    userStories: textList,
    primaryUserFlow: textList,
  }),
  engineering: z.object({
    recommendedStack: textList,
    architecture: requiredText,
    mainComponents: textList,
    dataModel: textList,
    apiEndpoints: textList,
    integrations: textList,
    decisions: textList,
  }),
  quality: z.object({
    security: textList,
    privacy: textList,
    edgeCases: textList,
    errorScenarios: textList,
    acceptanceCriteria: textList.min(1),
  }),
  execution: z.object({
    phases: textList,
    developmentTasks: textList,
    risks: textList,
    openQuestions: textList,
    futureImprovements: textList,
  }),
});

export const specRequestSchema = z.object({
  input: ideaInputSchema,
  discovery: discoverySchema,
  answers: z.record(z.string(), z.string().max(1_000)).default({}),
  challengeDecisions: z.record(z.string(), z.enum(['accept', 'keep'])).default({}),
});

export type IdeaInput = z.infer<typeof ideaInputSchema>;
export type IdeaInputDraft = z.input<typeof ideaInputSchema>;
export type DiscoveryQuestion = z.infer<typeof discoveryQuestionSchema>;
export type Challenge = z.infer<typeof challengeSchema>;
export type Discovery = z.infer<typeof discoverySchema>;
export type ProjectSpec = z.infer<typeof projectSpecSchema>;
export type SpecRequest = z.infer<typeof specRequestSchema>;
