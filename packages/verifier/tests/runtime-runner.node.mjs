import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { runLocalCommand, runWindowsLocalCommand, createLocalExecutionEnvironment, classifyCommandExecution, resolveTrustedExecutable } from '../src/runner.ts';

async function fixture(t) {
  const cwd = await mkdtemp(path.join(tmpdir(), 'burhan runtime '));
  const temp = path.join(cwd, 'private temp'); await mkdir(temp);
  t.after(() => rm(cwd, { recursive: true, force: true }));
  return { cwd, temp };
}
const command = (code, overrides = {}) => ({ executableId: 'node', args: ['-e', code], timeoutMs: 5000, maxOutputBytes: 4096, ...overrides });
async function execute(t, code, overrides, options) {
  const { cwd, temp } = await fixture(t);
  return runLocalCommand(command(code, overrides), cwd, temp, options);
}
async function waitFile(file) {
  for (let i = 0; i < 150; i++) { try { return await readFile(file, 'utf8'); } catch { await delay(20); } }
  throw new Error('Child readiness marker missing');
}
async function assertNoHeartbeat(file) {
  await delay(100);
  const before = await readFile(file, 'utf8'); await delay(250);
  assert.equal(await readFile(file, 'utf8'), before, 'Descendant still writing after termination');
}
function treeCode(file) {
  const nested = `const fs=require('node:fs');let n=0;fs.writeFileSync(${JSON.stringify(file)},String(n));setInterval(()=>fs.writeFileSync(${JSON.stringify(file)},String(++n)),20);`;
  return `const {spawn}=require('node:child_process');spawn(process.execPath,['-e',${JSON.stringify(nested)}],{stdio:'inherit'});setInterval(()=>{},1000);`;
}

test('portable name preserves the historical API alias', () => assert.equal(runWindowsLocalCommand, runLocalCommand));
test('resolves the current Node executable instead of candidate PATH', () => assert.equal(resolveTrustedExecutable('node'), process.execPath));
test('unknown executable identifiers fail closed', () => assert.throws(() => resolveTrustedExecutable('bash'), /NOT_ALLOWED/));
test('passes successful execution with separated stdout and stderr', async t => {
  const r = await execute(t, "console.log('output');console.error('diagnostic')");
  assert.equal(r.exitCode, 0); assert.equal(r.stdout.toString(), 'output\n'); assert.equal(r.stderr.toString(), 'diagnostic\n');
  assert.equal(classifyCommandExecution(r), 'pass'); assert.equal(r.cleanupSucceeded, true); assert.equal(r.executionAssurance, 'local_trusted');
});
test('nonzero command exit is a functional fail, not infrastructure interruption', async t => {
  const r = await execute(t, 'process.exit(7)'); assert.equal(r.exitCode, 7); assert.equal(classifyCommandExecution(r), 'fail');
});
test('executes from the explicitly supplied directory with spaces', async t => {
  const { cwd, temp } = await fixture(t);
  const r = await runLocalCommand(command('process.stdout.write(process.cwd())'), cwd, temp);
  assert.equal(r.stdout.toString(), cwd); assert.equal(r.exitCode, 0);
});
test('shell metacharacters and spaces remain literal argument data', async t => {
  const args = ['semi;colon', '$(echo nope)', '&', 'one two', '"quoted"'];
  const r = await execute(t, '', { args: ['-e', 'process.stdout.write(JSON.stringify(process.argv.slice(1)))', ...args] });
  assert.deepEqual(JSON.parse(r.stdout), args); assert.equal(r.exitCode, 0);
});
test('child has no inherited provider credentials or injection variables', async t => {
  const names = ['BURHAN_FAKE_SECRET', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'NODE_OPTIONS', 'NODE_PATH', 'GIT_DIR', 'LD_PRELOAD'];
  const previous = new Map(names.map(name => [name, process.env[name]]));
  try {
    for (const name of names) process.env[name] = 'must-not-reach-child';
    const r = await execute(t, `process.stdout.write(JSON.stringify(${JSON.stringify(names)}.map(key=>process.env[key]??null)))`);
    assert.equal(r.exitCode, 0); assert.deepEqual(JSON.parse(r.stdout), names.map(() => null));
  } finally { for (const [name, value] of previous) { if (value === undefined) delete process.env[name]; else process.env[name] = value; } }
});
test('temporary and home paths are explicitly scoped to the run', async t => {
  const { cwd, temp } = await fixture(t); const env = createLocalExecutionEnvironment(temp);
  for (const name of ['HOME', 'USERPROFILE', 'TEMP', 'TMP', 'TMPDIR']) assert.equal(env[name], temp);
  assert.equal(env.NPM_CONFIG_OFFLINE, 'true'); assert.equal(env.PATH, path.dirname(process.execPath));
  const r = await runLocalCommand(command('console.log(process.env.TMPDIR)'), cwd, temp);
  assert.equal(r.stdout.toString().trim(), temp);
});
test('npm uses its Node entrypoint without launching npm.cmd in a shell', async t => {
  const { cwd, temp } = await fixture(t);
  assert.match(resolveTrustedExecutable('npm'), /npm-cli\.js$/);
  const r = await runLocalCommand({ executableId: 'npm', args: ['--version'], timeoutMs: 10000, maxOutputBytes: 4096 }, cwd, temp);
  assert.equal(r.exitCode, 0, r.stderr.toString()); assert.match(r.stdout.toString().trim(), /^\d+\.\d+\.\d+$/);
  assert.equal(r.executable, process.execPath); assert.match(r.args[0], /npm-cli\.js$/);
});
test('npx resolves an installation-local JavaScript entrypoint', () => assert.match(resolveTrustedExecutable('npx'), /npx-cli\.js$/));
test('an infinite loop times out and cannot return exit zero', async t => {
  const start = Date.now(); const r = await execute(t, 'while(true){}', { timeoutMs: 300 });
  assert.equal(r.timedOut, true); assert.equal(r.exitCode, null); assert.equal(classifyCommandExecution(r), 'blocked');
  assert.ok(Date.now() - start < 6500); assert.equal(r.cleanupSucceeded, true);
});
test('output bytes are jointly capped across stdout and stderr', async t => {
  const r = await execute(t, "process.stdout.write('a'.repeat(1500));process.stderr.write('b'.repeat(1500));setInterval(()=>{},1000)", { maxOutputBytes: 1000 });
  assert.equal(r.outputCapped, true); assert.equal(r.stdout.length + r.stderr.length, 1000); assert.equal(r.exitCode, null);
});
test('exactly the byte limit is permitted', async t => {
  const r = await execute(t, "process.stdout.write('a'.repeat(1024))", { maxOutputBytes: 1024 });
  assert.equal(r.outputCapped, false); assert.equal(r.exitCode, 0); assert.equal(r.stdout.length, 1024);
});
test('UTF-8 output is capped in bytes rather than character count', async t => {
  const r = await execute(t, "process.stdout.write('ع'.repeat(1024))", { maxOutputBytes: 1024 });
  assert.equal(r.outputCapped, true); assert.equal(r.stdout.length, 1024); assert.equal(classifyCommandExecution(r), 'blocked');
});
test('already aborted work does not launch candidate code', async t => {
  const controller = new AbortController(); controller.abort();
  const r = await execute(t, "throw Error('must not run')", {}, { signal: controller.signal });
  assert.equal(r.aborted, true); assert.equal(r.stdout.length + r.stderr.length, 0); assert.equal(r.exitCode, null);
});
test('abort terminates a running command and resolves as blocked', async t => {
  const { cwd, temp } = await fixture(t), marker = path.join(temp, 'started');
  const controller = new AbortController();
  const pending = runLocalCommand(command(`require('node:fs').writeFileSync(${JSON.stringify(marker)},'yes');setInterval(()=>{},1000)`), cwd, temp, { signal: controller.signal });
  await waitFile(marker); controller.abort(); const r = await pending;
  assert.equal(r.aborted, true); assert.equal(r.cleanupSucceeded, true); assert.equal(classifyCommandExecution(r), 'blocked');
});
test('timeout terminates a live command and its ordinary descendant', async t => {
  const { cwd, temp } = await fixture(t), heartbeat = path.join(temp, 'heartbeat');
  const pending = runLocalCommand(command(treeCode(heartbeat), { timeoutMs: 1500 }), cwd, temp);
  await waitFile(heartbeat); const r = await pending;
  assert.equal(r.timedOut, true); assert.equal(r.cleanupSucceeded, true); await assertNoHeartbeat(heartbeat);
});
test('abort terminates a live command tree with inherited output handles', async t => {
  const { cwd, temp } = await fixture(t), heartbeat = path.join(temp, 'heartbeat');
  const controller = new AbortController();
  const pending = runLocalCommand(command(treeCode(heartbeat)), cwd, temp, { signal: controller.signal });
  await waitFile(heartbeat); controller.abort(); const r = await pending;
  assert.equal(r.aborted, true); assert.equal(r.cleanupSucceeded, true); await assertNoHeartbeat(heartbeat);
});
test('simultaneous executions keep output and cancellation independent', async t => {
  const { cwd, temp } = await fixture(t);
  const [one, two] = await Promise.all([
    runLocalCommand(command('while(true){}', { timeoutMs: 250 }), cwd, temp),
    runLocalCommand(command("setTimeout(()=>console.log('survivor'),500)"), cwd, temp)
  ]);
  assert.equal(one.timedOut, true); assert.equal(two.exitCode, 0); assert.equal(two.stdout.toString().trim(), 'survivor');
});
test('unexpected supervisor exit cannot count as successful command evidence', async t => {
  const r = await execute(t, "process.kill(process.ppid,'SIGKILL');process.exit(0)");
  assert.equal(r.exitCode, null); assert.equal(classifyCommandExecution(r), 'blocked');
});
for (const value of [0, -1, 1.5, NaN, Infinity, 300001]) {
  test(`rejects invalid timeout ${String(value)} before spawning`, async t => {
    const { cwd, temp } = await fixture(t);
    await assert.rejects(runLocalCommand(command('process.exit(0)', { timeoutMs: value }), cwd, temp), /INVALID_COMMAND_LIMITS/);
  });
}
test('rejects oversized command arguments and output bounds', async t => {
  const { cwd, temp } = await fixture(t);
  for (const overrides of [{ args: ['\0'] }, { args: [5] }, { args: ['a'.repeat(65537)] }, { args: Array(257).fill('x') }, { maxOutputBytes: 0 }, { maxOutputBytes: 17 * 1024 * 1024 }]) {
    await assert.rejects(runLocalCommand(command('', overrides), cwd, temp));
  }
});
test('rejects relative working and temporary directories', async t => {
  const { cwd, temp } = await fixture(t);
  await assert.rejects(runLocalCommand(command(''), '.', temp), /ABSOLUTE/);
  await assert.rejects(runLocalCommand(command(''), cwd, '.'), /ABSOLUTE/);
});
test('classification cannot upgrade incomplete evidence to success', () => {
  const base = { exitCode: 0, signal: null, timedOut: false, outputCapped: false };
  for (const partial of [{ timedOut: true }, { outputCapped: true }, { aborted: true }, { cleanupSucceeded: false }, { failureCode: 'BAD' }, { exitCode: null }, { signal: 'SIGTERM' }]) {
    assert.equal(classifyCommandExecution({ ...base, ...partial }), 'blocked');
  }
});
test('records monotonic execution timestamps and an explicit local backend', async t => {
  const r = await execute(t, '');
  assert.ok(Date.parse(r.completedAt) >= Date.parse(r.startedAt));
  assert.equal(r.backend, process.platform === 'win32' ? 'windows_supervised_tree' : 'posix_process_group');
});
