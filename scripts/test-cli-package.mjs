import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { fixture } from '../packages/cli/portable/tests/fixtures.mjs';
import { gitEnvironment } from '../packages/cli/portable/lib/git.mjs';
import { sha256 } from '../packages/cli/portable/lib/common.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = join(root, 'packages/cli/portable');
const npmCandidates = [process.env.npm_execpath, join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'), join(dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js')];
const npm = npmCandidates.find(path => path && existsSync(path));
assert.ok(npm, 'Run via npm run test:cli-package so the trusted npm CLI path is available.');
const temp = await mkdtemp(join(tmpdir(), 'burhan-distribution-'));
const cleanup = [];
const env = { ...gitEnvironment(), npm_config_cache: join(temp, 'npm-cache'), npm_config_offline: 'true', npm_config_update_notifier: 'false', npm_config_audit: 'false', npm_config_fund: 'false' };
function execute(entry, args, cwd = temp, expected = 0) {
  const result = spawnSync(process.execPath, [entry, ...args], { cwd, env, encoding: 'utf8', timeout: 45000, maxBuffer: 1048576 });
  assert.equal(result.error, undefined, 'Process must complete within its bound.');
  assert.equal(result.status, expected, `Command failed: ${args[0]}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
try {
  const packed = JSON.parse(execute(npm, ['pack', source, '--json', '--ignore-scripts', '--offline', '--pack-destination', temp]))[0];
  const paths = packed.files.map(file => file.path);
  for (const path of ['bin/burhan.mjs', 'lib/verify.mjs', 'lib/contract.mjs', 'lib/git.mjs', 'LICENSE', 'README.md']) assert.ok(paths.includes(path), `Required packed file: ${path}`);
  assert.ok(paths.every(path => /^(?:bin\/|lib\/|package\.json$|README\.md$|LICENSE$)/.test(path)), 'Tarball must not contain tests, credentials, legacy workspaces or media.');
  const consumer = join(temp, 'consumer'); await mkdir(consumer);
  await writeFile(join(consumer, 'package.json'), '{"name":"burhan-offline-consumer","version":"1.0.0","private":true}\n');
  const archive = join(temp, packed.filename);
  execute(npm, ['install', '--prefix', consumer, '--offline', '--ignore-scripts', '--no-audit', '--no-fund', archive], consumer);
  const installed = join(consumer, 'node_modules/@burhan/cli');
  const manifest = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
  assert.equal(Object.keys(manifest.dependencies ?? {}).length, 0, 'Runtime must not rely on workspace dependencies.');
  assert.ok(existsSync(join(consumer, 'node_modules/.bin', process.platform === 'win32' ? 'burhan.cmd' : 'burhan')), 'npm installed bin entry must exist');
  const entry = join(installed, 'bin/burhan.mjs');
  assert.equal(JSON.parse(execute(entry, ['doctor'], consumer)).status, 'READY');
  const fixtures = [];
  for (const kind of ['api-documentation', 'application-configuration', 'protected-source-policy']) {
    const f = await fixture({ after: callback => cleanup.push(callback) }, kind);
    const contract = { ...f.contract, checks: kind === 'api-documentation' ? [f.contract.checks[0]] : kind === 'application-configuration' ? [f.contract.checks[1]] : f.contract.checks.slice(2) };
    const input = join(f.home, 'contract.json'); const sealFile = join(f.home, 'seal.json');
    await writeFile(input, JSON.stringify(contract));
    const seal = JSON.parse(execute(entry, ['contract', 'seal', '--repo', f.repo, '--base', f.base, '--contract', input, '--out', sealFile, '--approve'], consumer));
    const args = ['verify', '--repo', f.repo, '--seal', sealFile, '--expect-seal', seal.sealHash];
    const passed = JSON.parse(execute(entry, [...args, '--head', f.head], consumer)); assert.equal(passed.verdict, 'PASSED');
    // Every fixture also exercises a negative control after installation, not just help/version.
    await writeFile(join(f.repo, 'tests/guard.test.js'), '// forbidden modification\n');
    const rejected = JSON.parse(execute(entry, [...args, '--head', f.commit()], consumer, 1)); assert.equal(rejected.verdict, 'REJECTED');
    fixtures.push({ fixture: kind, positive: 'PASSED', negative: 'REJECTED' });
  }
  const artifacts = join(root, 'reports/cli-distribution'); await mkdir(artifacts, { recursive: true });
  await copyFile(archive, join(artifacts, packed.filename));
  const hash = sha256(await readFile(archive));
  await writeFile(join(artifacts, 'SHA256SUMS'), `${hash}  ${packed.filename}\n`);
  await writeFile(join(artifacts, 'validation.json'), JSON.stringify({ scope: 'Maintainer-created independent Git fixtures, not external adoption', version: manifest.version, node: process.versions.node, platform: process.platform, package: packed.filename, sha256: hash, fixtures, offlineInstall: true, providerCalls: false, registryPublication: false }, null, 2) + '\n');
  console.log(`PASS offline installation of ${packed.filename}`);
  console.log('PASS three independent fixture repositories, each with positive and negative controls');
  console.log('PASS explicit package allowlist, executable bin and zero runtime dependencies');
  console.log(`Source package and checksums: reports/cli-distribution/${packed.filename}`);
} finally {
  for (const clean of cleanup) await clean();
  await rm(temp, { recursive: true, force: true, maxRetries: 3 });
}
