#!/usr/bin/env node
import { resolve } from 'node:path';
import { BurhanError, LIMITS, PROFILE, readJson, requireThat, VERSION, writeNewJson } from '../lib/common.mjs';
import { makeSeal, starterContract, validateContract } from '../lib/contract.mjs';
import { repository, requireCommit, runGit } from '../lib/git.mjs';
import { primitiveControls } from '../lib/primitives.mjs';
import { validateReport, verify } from '../lib/verify.mjs';

const HELP = `BURHAN ${VERSION} — portable static Git snapshot preview

Commands:
  doctor [--repo DIRECTORY]
  init --out CONTRACT.json
  contract validate --contract CONTRACT.json
  contract seal --repo DIRECTORY --base FULL_SHA --contract CONTRACT.json --out SEAL.json --approve
  verify --repo DIRECTORY --head FULL_SHA --seal SEAL.json --expect-seal SHA256 [--base FULL_SHA] [--out REPORT.json]
  report --file REPORT.json --expect-report SHA256
  receipt verify --file REPORT.json --expect-report SHA256

All results are JSON; exit 0=pass, 1=declared checks rejected, 2=incomplete/error.
verify checks committed snapshots, NOT dirty/untracked files or runtime correctness.
The retained seal pin must come from the maintainer, never from the candidate.
No API keys, npm install, candidate execution, remote fetch or milestone tags are used.
receipt verifies a pinned static report checksum, NOT a signature or live execution.
The existing Windows semantic reference suite remains: npm run eval:burhan.
`;
function parse(argv) {
  const positionals = [];
  const flags = Object.create(null);
  for (let i = 0; i < argv.length; i++) {
    const item = argv[i];
    if (!item.startsWith('--')) { positionals.push(item); continue; }
    const name = item.slice(2);
    requireThat(name && !Object.hasOwn(flags, name), 'USAGE', 'Duplicate or invalid option.');
    if (name === 'approve') flags[name] = true;
    else {
      requireThat(i + 1 < argv.length && !argv[i + 1].startsWith('--'), 'USAGE', 'Option value is missing.');
      flags[name] = argv[++i];
    }
  }
  return { command: positionals.join(' '), flags };
}
function options(flags, required, optional = []) {
  requireThat(required.every(key => Object.hasOwn(flags, key)) && Object.keys(flags).every(key => [...required, ...optional].includes(key)), 'USAGE', 'Missing or unsupported command option. Use --help.');
}
async function main() {
  requireThat(Number(process.versions.node.split('.')[0]) >= 22, 'NODE_UNSUPPORTED', 'Node.js 22 or newer is required; CI targets 22 and 24.');
  const argv = process.argv.slice(2);
  if (argv.length === 0 || (argv.length === 1 && ['--help', '-h'].includes(argv[0]))) { process.stdout.write(HELP); return; }
  if (argv.length === 1 && argv[0] === '--version') { console.log(VERSION); return; }
  const { command, flags } = parse(argv);
  let result;
  if (command === 'doctor') {
    options(flags, [], ['repo']);
    const gitVersion = runGit(process.cwd(), ['--version'], 8192).toString('utf8').trim();
    if (flags.repo) await repository(resolve(flags.repo));
    result = { status: 'READY', profile: PROFILE, version: VERSION, node: process.versions.node, git: gitVersion, repositoryChecked: Boolean(flags.repo), primitiveControls: primitiveControls(), networkRequired: false };
  } else if (command === 'init') {
    options(flags, ['out']);
    await writeNewJson(flags.out, starterContract());
    result = { status: 'DRAFT_CREATED', requiresHumanReview: true, next: 'Edit the draft, validate it, and explicitly approve a seal against a full baseline commit.' };
  } else if (command === 'contract validate') {
    options(flags, ['contract']);
    const contract = validateContract(await readJson(flags.contract));
    result = { status: 'VALID', profile: PROFILE, checks: contract.checks.length, approvalGranted: false };
  } else if (command === 'contract seal') {
    options(flags, ['repo', 'base', 'contract', 'out', 'approve']);
    const root = await repository(resolve(flags.repo));
    const seal = makeSeal(await readJson(flags.contract), requireCommit(root, flags.base));
    await writeNewJson(flags.out, seal);
    result = { status: 'SEALED', profile: PROFILE, baseCommit: seal.baseCommit, sealHash: seal.sealHash, note: 'Retain sealHash outside candidate control. This is an explicit approval/checksum, not a digital signature.' };
  } else if (command === 'verify') {
    options(flags, ['repo', 'head', 'seal', 'expect-seal'], ['base', 'out']);
    result = await verify({ repo: resolve(flags.repo), head: flags.head, base: flags.base, seal: await readJson(flags.seal), expectedSeal: flags['expect-seal'] });
    if (flags.out) await writeNewJson(flags.out, result);
    process.exitCode = result.verdict === 'PASSED' ? 0 : 1;
  } else if (command === 'report' || command === 'receipt verify') {
    options(flags, ['file', 'expect-report']);
    result = validateReport(await readJson(flags.file, LIMITS.reportBytes), flags['expect-report']);
    if (command === 'receipt verify') result = { status: 'INTEGRITY_MATCH', reportHash: result.reportHash, originalVerdict: result.verdict, meaning: 'Pinned content identity only; not signer authentication or a fresh rerun.' };
  } else requireThat(false, 'USAGE', 'Unknown command. Use --help.');
  console.log(JSON.stringify(result, null, 2));
}
main().catch(error => {
  const known = error instanceof BurhanError;
  console.log(JSON.stringify({ verdict: 'INCOMPLETE', profile: PROFILE, error: { code: known ? error.code : 'INTERNAL_ERROR', message: known ? error.message : 'Operation failed; no successful verification is claimed.' } }, null, 2));
  process.exitCode = 2;
});
