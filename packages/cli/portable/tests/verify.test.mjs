import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture, git } from './fixtures.mjs';
import { makeSeal } from '../lib/contract.mjs';
import { gitEnvironment } from '../lib/git.mjs';
import { verify, validateReport } from '../lib/verify.mjs';
const verifyFixture = (f, overrides = {}) => verify({ repo: f.repo, head: f.head, seal: f.seal, expectedSeal: f.seal.sealHash, ...overrides });
const expectCode = code => error => error.code === code;

test('verifies an independent Git repository with no BURHAN history or milestone tags', async t => {
  const f = await fixture(t); const result = await verifyFixture(f);
  assert.equal(result.verdict, 'PASSED'); assert.equal(result.checks.length, 5);
  assert.equal(result.candidateCodeExecuted, false); assert.equal(git(f.repo, ['tag']).trim(), '');
});
test('report is deterministic and contains no absolute checkout paths or source contents', async t => {
  const f = await fixture(t); const first = await verifyFixture(f); const second = await verifyFixture(f);
  assert.deepEqual(first, second); assert.equal(JSON.stringify(first).includes(f.home), false);
  assert.equal(JSON.stringify(first).includes('Send Idempotency-Key'), false);
});
test('ignores dirty and untracked files rather than pretending they were verified', async t => {
  const f = await fixture(t); const before = await verifyFixture(f);
  await writeFile(join(f.repo, 'docs/api.md'), 'uncommitted wrong value');
  await writeFile(join(f.repo, 'untracked.txt'), 'not part of this commit');
  assert.deepEqual(await verifyFixture(f), before);
  assert.match(await readFile(join(f.repo, 'docs/api.md'), 'utf8'), /uncommitted/);
});
test('detects forbidden test deletion', async t => {
  const f = await fixture(t); await rm(join(f.repo, 'tests/guard.test.js'));
  const result = await verifyFixture(f, { head: f.commit() });
  assert.equal(result.verdict, 'REJECTED'); assert.ok(result.policyIssues.some(item => item.code === 'FORBIDDEN_CHANGE'));
});
test('detects out-of-scope additions and renames', async t => {
  const f = await fixture(t); await writeFile(join(f.repo, 'unexpected.js'), 'not in scope');
  const result = await verifyFixture(f, { head: f.commit() });
  assert.ok(result.policyIssues.some(item => item.code === 'OUTSIDE_SCOPE'));
});
test('forbidden paths take precedence over broad allowed scope', async t => {
  const f = await fixture(t); const seal = makeSeal({ ...f.contract, allowedPaths: ['**'] }, f.base);
  await writeFile(join(f.repo, 'tests/guard.test.js'), '// changed');
  assert.equal((await verifyFixture(f, { head: f.commit(), seal, expectedSeal: seal.sealHash })).verdict, 'REJECTED');
});
test('wrong text, missing file, wrong scalar and forbidden presence are independent rejections', async t => {
  const f = await fixture(t);
  await writeFile(join(f.repo, 'docs/api.md'), 'incorrect'); await rm(join(f.repo, 'src/index.js'));
  await writeFile(join(f.repo, 'src/config.json'), '{"nested":{"enabled":false}}'); await writeFile(join(f.repo, 'src/unsafe.js'), 'exists');
  const result = await verifyFixture(f, { head: f.commit() });
  assert.equal(result.verdict, 'REJECTED'); assert.equal(result.checks.filter(check => check.status === 'FAIL').length, 4);
});
test('duplicate keys in candidate JSON fail the declared check', async t => {
  const f = await fixture(t); await writeFile(join(f.repo, 'src/config.json'), '{"nested":{"enabled":false,"enabled":true}}');
  const result = await verifyFixture(f, { head: f.commit() });
  assert.equal(result.checks.find(check => check.id === 'CONFIG').reason, 'DUPLICATE_JSON_KEY');
});
test('empty changes cannot pass a requireChanges contract', async t => {
  const f = await fixture(t); const seal = makeSeal(f.contract, f.head);
  const result = await verifyFixture(f, { seal, expectedSeal: seal.sealHash });
  assert.equal(result.verdict, 'REJECTED'); assert.ok(result.policyIssues.some(issue => issue.code === 'NO_CHANGES'));
});
test('base must match the independently approved seal', async t => {
  const f = await fixture(t); await assert.rejects(verifyFixture(f, { base: f.head }), expectCode('BASE_MISMATCH'));
});
test('a changed sealed scope cannot authorize its own forbidden patch', async t => {
  const f = await fixture(t); const seal = makeSeal({ ...f.contract, allowedPaths: ['**'], forbiddenPaths: [] }, f.base);
  await assert.rejects(verifyFixture(f, { seal }), expectCode('SEAL_MISMATCH'));
});
test('reports require an independent pin and reject tampering', async t => {
  const f = await fixture(t); const result = await verifyFixture(f);
  assert.equal(validateReport(result, result.reportHash), result);
  assert.throws(() => validateReport(result), expectCode('PIN_REQUIRED'));
  assert.throws(() => validateReport({ ...result, verdict: 'REJECTED' }, result.reportHash), expectCode('REPORT_MISMATCH'));
});
test('mutable refs, options, shell metacharacters and abbreviated commits are not accepted', async t => {
  const f = await fixture(t);
  for (const head of ['HEAD', '--help', f.head.slice(0, 8), '$(echo x)', 'master; echo unsafe']) await assert.rejects(verifyFixture(f, { head }), expectCode('COMMIT_REQUIRED'));
});
test('missing commit is INCOMPLETE rather than successful or an ordinary functional rejection', async t => {
  const f = await fixture(t); await assert.rejects(verifyFixture(f, { head: 'f'.repeat(40) }), expectCode('GIT_FAILED'));
});
test('unrelated histories are rejected as invalid verification ranges', async t => {
  const f = await fixture(t); const tree = git(f.repo, ['rev-parse', `${f.head}^{tree}`]).trim();
  const unrelated = git(f.repo, ['commit-tree', tree, '-m', 'unrelated']).trim();
  await assert.rejects(verifyFixture(f, { head: unrelated }), expectCode('BASE_NOT_ANCESTOR'));
});
test('a tree object cannot masquerade as a commit', async t => {
  const f = await fixture(t); const tree = git(f.repo, ['rev-parse', `${f.head}^{tree}`]).trim();
  await assert.rejects(verifyFixture(f, { head: tree }), expectCode('COMMIT_REQUIRED'));
});
test('git replace cannot substitute a passing snapshot for a failing candidate', async t => {
  const f = await fixture(t); await writeFile(join(f.repo, 'docs/api.md'), 'wrong'); const bad = f.commit();
  git(f.repo, ['replace', bad, f.head]);
  const result = await verifyFixture(f, { head: bad }); assert.equal(result.verdict, 'REJECTED');
});
test('Git filters and checkout hooks are not executed', async t => {
  const f = await fixture(t); const marker = join(f.home, 'should-not-exist');
  git(f.repo, ['config', 'filter.burhan.smudge', `echo unsafe > "${marker}"`]);
  await writeFile(join(f.repo, '.git/hooks/post-checkout'), `#!/bin/sh\necho unsafe > "${marker}"\n`); await chmod(join(f.repo, '.git/hooks/post-checkout'), 0o755);
  await verifyFixture(f); await assert.rejects(readFile(marker));
});
test('Git subprocess environment excludes provider credentials and inherited override variables', () => {
  const previous = { GIT_DIR: process.env.GIT_DIR, OPENAI_API_KEY: process.env.OPENAI_API_KEY, NODE_OPTIONS: process.env.NODE_OPTIONS };
  try {
    process.env.GIT_DIR = '/untrusted'; process.env.OPENAI_API_KEY = 'fixture-value-not-a-key'; process.env.NODE_OPTIONS = '--trace-warnings';
    const value = gitEnvironment(); for (const key of Object.keys(previous)) assert.equal(Object.hasOwn(value, key), false);
  } finally { for (const [key, value] of Object.entries(previous)) if (value === undefined) delete process.env[key]; else process.env[key] = value; }
});
test('oversized checked blob fails closed without reading arbitrary-size output', async t => {
  const f = await fixture(t); await writeFile(join(f.repo, 'docs/api.md'), 'x'.repeat(1048577));
  await assert.rejects(verifyFixture(f, { head: f.commit() }), expectCode('BLOB_LIMIT'));
});
for (const [name, mode, type, expected] of [['link', '120000', 'blob', 'TREE_UNSUPPORTED'], ['CON', '100644', 'blob', 'PATH_UNSUPPORTED'], ['two\nlines', '100644', 'blob', 'PATH_UNSUPPORTED']]) {
  test(`unsupported tree path/mode ${JSON.stringify(name)} fails closed`, async t => {
    const f = await fixture(t); const blob = git(f.repo, ['hash-object', '-w', '--stdin'], 'outside').trim();
    const tree = git(f.repo, ['mktree', '-z'], `${mode} ${type} ${blob}\t${name}\0`).trim();
    const head = git(f.repo, ['commit-tree', tree, '-p', f.base, '-m', 'unsupported tree']).trim();
    await assert.rejects(verifyFixture(f, { head }), expectCode(expected));
  });
}
test('case-colliding Git filenames fail even on case-sensitive hosts', async t => {
  const f = await fixture(t); const blob = git(f.repo, ['hash-object', '-w', '--stdin'], 'data').trim();
  const tree = git(f.repo, ['mktree', '-z'], [`100644 blob ${blob}\tA.txt`, `100644 blob ${blob}\ta.txt`, ''].join('\0')).trim();
  const head = git(f.repo, ['commit-tree', tree, '-p', f.base, '-m', 'case collision']).trim();
  await assert.rejects(verifyFixture(f, { head }), expectCode('PATH_COLLISION'));
});
