import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findClientSecretLeaks } from '../scripts/check-client-secrets.mjs';

describe('client bundle secret scanner', () => {
  let directory = '';

  afterEach(async () => {
    if (directory) await rm(directory, { recursive: true, force: true });
    directory = '';
  });

  it('accepts browser bundles with no server credential', async () => {
    directory = await mkdtemp(join(tmpdir(), 'p2p-client-bundle-'));
    await mkdir(join(directory, 'chunks'));
    await writeFile(join(directory, 'chunks', 'app.js'), 'fetch("/api/spec")');

    await expect(findClientSecretLeaks(directory, { OPENROUTER_API_KEY: 'sk-or-v1-test-secret-value' })).resolves.toEqual([]);
  });

  it('detects a bundled credential without returning its value', async () => {
    directory = await mkdtemp(join(tmpdir(), 'p2p-client-bundle-'));
    const secret = 'sk-or-v1-test-secret-value';
    await writeFile(join(directory, 'app.js'), `const accidentallyBundled = "${secret}"`);

    await expect(findClientSecretLeaks(directory, { OPENROUTER_API_KEY: secret })).resolves.toEqual(['OPENROUTER_API_KEY']);
  });
});
