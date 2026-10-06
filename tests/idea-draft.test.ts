import { describe, expect, it } from 'vitest';
import { normalizeIdeaDraft } from '../lib/domain/idea-draft';

describe('idea form draft normalization', () => {
  it('fills omitted optional fields before binding values to form controls', () => {
    expect(normalizeIdeaDraft({ idea: 'A volunteer scheduling app' })).toEqual({
      projectName: '',
      idea: 'A volunteer scheduling app',
      platform: "I don't know yet",
      targetUser: '',
      preferences: '',
      outputLanguage: 'English',
    });
  });
});
