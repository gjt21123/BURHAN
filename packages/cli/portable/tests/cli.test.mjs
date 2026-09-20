import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { fixture } from './fixtures.mjs';
import { gitEnvironment } from '../lib/git.mjs';
import { VERSION } from '../lib/common.mjs';
const entry = fileURLToPath(new URL('../bin/burhan.mjs', import.meta.url));
function cli(args, options = {}) {
  const result = spawnSync(process.execPath, [entry, ...args], { encoding: 'utf8', env: gitEnvironment(), timeout: 20000, ...options });
  assert.equal(result.error, undefined);
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, json: () => JSON.parse(result.stdout) };
}
test('help and version work without installing workspace dependencies', () => {
  assert.match(cli(['--help']).stdout, /NOT dirty\/untracked/);
  assert.equal(cli(['--version']).stdout.trim(), VERSION);
});
test('doctor reports capability, not credentials', () => {
  const result = cli(['doctor']); assert.equal(result.status, 0); assert.equal(result.json().status, 'READY');
  assert.equal(result.json().networkRequired, false);
});
test('unknown commands, unexpected flags and duplicate flags fail with JSON exit 2', () => {
  for (const args of [['invented'], ['doctor', '--unknown', 'x'], ['doctor', '--repo', '.', '--repo', '.'], ['doctor', '--__proto__', 'x'], ['doctor', '--repo']]) {
    const result = cli(args); assert.equal(result.status, 2); assert.equal(result.json().verdict, 'INCOMPLETE');
  }
});
test('missing Git is reported as incomplete', () => {
  const result = cli(['doctor'], { env: { ...gitEnvironment(), PATH: '', Path: '' } });
  assert.equal(result.status, 2); assert.equal(result.json().error.code, 'GIT_UNAVAILABLE');
});
test('init never overwrites an existing file', async t => {
  const f = await fixture(t); const out = join(f.home, 'draft.json');
  assert.equal(cli(['init', '--out', out]).json().status, 'DRAFT_CREATED');
  const bytes = await readFile(out, 'utf8');
  assert.equal(cli(['init', '--out', out]).json().error.code, 'OUTPUT_EXISTS'); assert.equal(await readFile(out, 'utf8'), bytes);
});
test('contract seal requires explicit approval and does not implicitly use HEAD', async t => {
  const f = await fixture(t); const input = join(f.home, 'contract.json'); const out = join(f.home, 'seal.json');
  await writeFile(input, JSON.stringify(f.contract));
  const result = cli(['contract', 'seal', '--repo', f.repo, '--base', f.base, '--contract', input, '--out', out]);
  assert.equal(result.status, 2); assert.equal(result.json().error.code, 'USAGE'); await assert.rejects(readFile(out));
});
test('CLI full contract, verification, reporting and integrity flow', async t => {
  const f = await fixture(t); const input = join(f.home, 'contract.json'); const sealed = join(f.home, 'seal.json'); const report = join(f.home, 'report.json');
  await writeFile(input, JSON.stringify(f.contract));
  assert.equal(cli(['contract', 'validate', '--contract', input]).json().status, 'VALID');
  const seal = cli(['contract', 'seal', '--repo', f.repo, '--base', f.base, '--contract', input, '--out', sealed, '--approve']).json();
  const args = ['verify', '--repo', f.repo, '--head', f.head, '--seal', sealed, '--expect-seal', seal.sealHash];
  const result = cli([...args, '--out', report]); assert.equal(result.status, 0); assert.equal(result.json().verdict, 'PASSED');
  assert.deepEqual(JSON.parse(await readFile(report, 'utf8')), result.json());
  assert.equal(cli(['report', '--file', report, '--expect-report', result.json().reportHash]).json().reportHash, result.json().reportHash);
  assert.equal(cli(['receipt', 'verify', '--file', report, '--expect-report', result.json().reportHash]).json().status, 'INTEGRITY_MATCH');
  assert.equal(cli([...args, '--out', report]).json().error.code, 'OUTPUT_EXISTS');
});
test('functional rejection returns 1 while missing evidence returns 2', async t => {
  const f = await fixture(t); const seal = join(f.home, 'seal.json'); await writeFile(seal, JSON.stringify(f.seal));
  const args = ['verify', '--repo', f.repo, '--seal', seal, '--expect-seal', f.seal.sealHash];
  const rejection = cli([...args, '--head', f.base]); assert.equal(rejection.status, 1); assert.equal(rejection.json().verdict, 'REJECTED');
  const missing = cli([...args, '--head', 'f'.repeat(40)]); assert.equal(missing.status, 2); assert.equal(missing.json().verdict, 'INCOMPLETE');
});
test('a forged report is not accepted without its independently retained hash', async t => {
  const f = await fixture(t); const path = join(f.home, 'report.json'); await writeFile(path, '{"verdict":"PASSED"}');
  assert.equal(cli(['receipt', 'verify', '--file', path, '--expect-report', 'a'.repeat(64)]).status, 2);
});
test('oversized JSON and malformed contracts return controlled errors without raw paths', async t => {
  const f = await fixture(t); const path = join(f.home, 'input.json');
  await writeFile(path, 'x'.repeat(262145)); const result = cli(['contract', 'validate', '--contract', path]);
  assert.equal(result.json().error.code, 'INPUT_LIMIT'); assert.equal(result.stdout.includes(f.home), false);
  await writeFile(path, '{'); assert.equal(cli(['contract', 'validate', '--contract', path]).json().error.code, 'INVALID_JSON');
});
