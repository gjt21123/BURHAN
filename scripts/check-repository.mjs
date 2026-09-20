import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).split('\0').filter(Boolean);
const failures = [];
const required = ['LICENSE', 'NOTICE', 'README.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CODE_OF_CONDUCT.md', 'GOVERNANCE.md', 'ROADMAP.md', 'CHANGELOG.md', 'AGENTS.md', '.env.example', 'docs/codex-for-oss/application.json'];
for (const path of required) if (!files.includes(path) || !existsSync(resolve(root, path))) failures.push(`${path}: missing required project file`);
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
if (pkg.license !== 'Apache-2.0') failures.push('package.json: license metadata disagrees with project license');
if (pkg.private !== true) failures.push('package.json: workspace root must not accidentally publish to npm');
if (files.includes('apps/web/next-env.d.ts')) failures.push('Next.js generated declarations must not be tracked');
const secretRules = [
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ['fine-grained GitHub token', /\bgithub_pat_[A-Za-z0-9_]{50,}\b/],
  ['OpenAI project key', /\bsk-proj-[A-Za-z0-9_-]{30,}\b/],
  ['private PEM key', /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----\r?\n[A-Za-z0-9+/=\r\n]{40,}/]
];
let links = 0;
for (const path of files) {
  if (/(^|\/)\.env(?:\.|$)/.test(path) && !path.endsWith('.env.example')) failures.push(`${path}: local environment file is tracked`);
  const full = resolve(root, path);
  if (!existsSync(full) || !statSync(full).isFile() || statSync(full).size > 1024 * 1024) continue;
  const buffer = readFileSync(full);
  if (buffer.includes(0)) continue;
  const text = buffer.toString('utf8');
  for (const [rule, expression] of secretRules) if (expression.test(text)) failures.push(`${path}: potential ${rule}; investigate privately (matched value omitted)`);
  if (!path.endsWith('.md')) continue;
  const prose = text.replace(/```[\s\S]*?```/g, '');
  for (const match of prose.matchAll(/\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const url = match[1];
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(url)) continue;
    const target = decodeURIComponent(url.split('#', 1)[0].split('?', 1)[0]);
    if (target && !existsSync(resolve(dirname(full), target))) failures.push(`${path}: broken relative link ${target}`);
    links++;
  }
}
const applicationPath = resolve(root, 'docs/codex-for-oss/application.json');
if (existsSync(applicationPath)) {
  const application = JSON.parse(readFileSync(applicationPath, 'utf8'));
  for (const field of ['eligibility', 'api_credit_use', 'additional_information']) {
    const value = application[field];
    if (typeof value !== 'string' || value.length === 0 || value.length > 500) failures.push(`application.json: ${field} must contain 1-500 characters`);
    else console.log(`PASS application ${field}: ${value.length}/500 characters`);
  }
}
if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`PASS repository hygiene: ${files.length} tracked paths; ${links} relative links checked`);
  console.log('Secret-pattern checks are conservative hygiene, not a complete secret scan or security audit.');
}
