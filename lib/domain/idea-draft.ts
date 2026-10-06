import type { IdeaInputDraft } from '../schemas/project';

const emptyIdeaDraft: IdeaInputDraft = {
  projectName: '',
  idea: '',
  platform: "I don't know yet",
  targetUser: '',
  preferences: '',
  outputLanguage: 'English',
};

export function normalizeIdeaDraft(value: Partial<IdeaInputDraft> = {}): IdeaInputDraft {
  return {
    projectName: value.projectName ?? emptyIdeaDraft.projectName,
    idea: value.idea ?? emptyIdeaDraft.idea,
    platform: value.platform ?? emptyIdeaDraft.platform,
    targetUser: value.targetUser ?? emptyIdeaDraft.targetUser,
    preferences: value.preferences ?? emptyIdeaDraft.preferences,
    outputLanguage: value.outputLanguage ?? emptyIdeaDraft.outputLanguage,
  };
}
