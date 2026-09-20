import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gitEnvironment } from '../lib/git.mjs';
import { makeSeal } from '../lib/contract.mjs';
import { PROFILE, sha256 } from '../lib/common.mjs';
export const env = () => ({ ...gitEnvironment(), GIT_AUTHOR_NAME: 'BURHAN test', GIT_AUTHOR_EMAIL: 'test@example.invalid', GIT_COMMITTER_NAME: 'BURHAN test', GIT_COMMITTER_EMAIL: 'test@example.invalid' });
export function git(repo, args, input) {
  return execFileSync('git', ['-c', 'core.autocrlf=false', '-C', repo, ...args], { env: env(), input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 15000 });
}
export async function fixture(t, kind = 'api') {
  const home = await mkdtemp(join(tmpdir(), 'burhan-cli-test-'));
  t.after(() => rm(home, { recursive: true, force: true, maxRetries: 3 }));
  const repo = join(home, 'independent project');
  await mkdir(repo);
  for (const folder of ['src', 'docs', 'tests']) await mkdir(join(repo, folder));
  await writeFile(join(repo, 'src/index.js'), 'export const enabled = false;\n');
  await writeFile(join(repo, 'docs/api.md'), 'Old API documentation\n');
  await writeFile(join(repo, 'src/config.json'), '{"nested":{"enabled":false}}\n');
  await writeFile(join(repo, 'tests/guard.test.js'), '// protected reference test\n');
  await writeFile(join(repo, 'package.json'), JSON.stringify({ name: `fixture-${kind}`, private: true }));
  git(repo, ['init', '-q']); git(repo, ['add', '.']); git(repo, ['commit', '-qm', 'baseline']);
  const base = git(repo, ['rev-parse', 'HEAD']).trim();
  const contract = { schemaVersion: 1, profile: PROFILE, title: 'Static fixture contract', allowedPaths: ['src/**', 'docs/**'], forbiddenPaths: ['tests/**', 'package.json'], requireChanges: true, checks: [
    { id: 'DOC', kind: 'textIncludes', path: 'docs/api.md', value: 'Idempotency-Key' },
    { id: 'CONFIG', kind: 'jsonEquals', path: 'src/config.json', pointer: '/nested/enabled', value: true },
    { id: 'EXISTS', kind: 'exists', path: 'src/index.js' },
    { id: 'ABSENT', kind: 'absent', path: 'src/unsafe.js' },
    { id: 'HASH', kind: 'sha256', path: 'tests/guard.test.js', value: sha256('// protected reference test\n') }
  ] };
  const seal = makeSeal(contract, base);
  await writeFile(join(repo, 'docs/api.md'), 'Send Idempotency-Key with requests.\n');
  await writeFile(join(repo, 'src/config.json'), '{"nested":{"enabled":true}}\n');
  git(repo, ['add', '.']); git(repo, ['commit', '-qm', 'candidate']);
  const head = git(repo, ['rev-parse', 'HEAD']).trim();
  const commit = () => { git(repo, ['add', '-A']); git(repo, ['commit', '-qm', 'changed candidate']); return git(repo, ['rev-parse', 'HEAD']).trim(); };
  return { home, repo, base, head, contract, seal, commit };
}
