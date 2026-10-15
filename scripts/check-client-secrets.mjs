import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;

const secretVariablePattern = /(?:API_KEY|_TOKEN|HASH_SECRET)$/i;
const credentialPatterns = [
  { name: 'OpenRouter API credential', pattern: /sk-or-v1-[a-f0-9]{32,}/iu },
  { name: 'Google API credential', pattern: /AIza[0-9A-Za-z_-]{30,}/u },
];

async function listBrowserAssets(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const assets = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) assets.push(...await listBrowserAssets(path));
    else if (/\.(?:js|mjs|css|map)$/iu.test(entry.name)) assets.push(path);
  }
  return assets;
}

export async function findClientSecretLeaks(directory, env = process.env) {
  const assets = await listBrowserAssets(directory);
  const secrets = Object.entries(env)
    .filter(([name, value]) => secretVariablePattern.test(name) && typeof value === 'string' && value.length >= 8)
    .map(([name, value]) => ({ name, value }));
  const leaks = new Set();

  for (const asset of assets) {
    const contents = await readFile(asset, 'utf8');
    for (const secret of secrets) if (contents.includes(secret.value)) leaks.add(secret.name);
    for (const credential of credentialPatterns) if (credential.pattern.test(contents)) leaks.add(credential.name);
  }
  return [...leaks];
}

async function main() {
  loadEnvConfig(process.cwd(), true);
  const leaks = await findClientSecretLeaks(resolve(process.cwd(), '.next/static'));
  if (leaks.length) {
    console.error(`Client bundle secret scan failed: ${leaks.join(', ')} found in browser assets.`);
    process.exitCode = 1;
    return;
  }
  console.log('Client bundle secret scan passed.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
