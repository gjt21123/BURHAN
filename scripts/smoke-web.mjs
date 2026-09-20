import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer } from 'node:net';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(join(root, 'apps/web/package.json'));
const next = require.resolve('next/dist/bin/next');
const reservation = createServer();
await new Promise((resolve, reject) => { reservation.once('error', reject); reservation.listen(0, '127.0.0.1', resolve); });
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, [next, 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: join(root, 'apps/web'),
  env: { ...process.env, OPENAI_API_KEY: '', CODEX_API_KEY: '', BURHAN_ENABLE_LIVE_COMPILER: '0', NEXT_TELEMETRY_DISABLED: '1' },
  stdio: 'ignore'
});
let startError;
child.on('error', error => { startError = error; });
const stopped = new Promise(resolve => child.once('exit', resolve));
async function check(label, path, init, status, code) {
  const response = await fetch(origin + path, { ...init, signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, status, label);
  if (code) assert.equal((await response.json()).error, code, label);
  else await response.text();
  console.log(`PASS ${label}`);
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (startError) throw startError;
    if (child.exitCode !== null) throw new Error('Demo server exited before readiness');
    try { const response = await fetch(origin, { signal: AbortSignal.timeout(1000) }); ready = response.status === 200; await response.text(); } catch {}
    if (ready) break;
    await delay(500);
  }
  assert.ok(ready, 'Production demo did not become ready');
  const base = { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin } };
  const endpoint = '/api/contracts/compile';
  await check('homepage', '/', {}, 200);
  await check('live calls disabled', endpoint, { ...base, body: '{"task":"Test bounded task"}' }, 503, 'LIVE_COMPILER_DISABLED');
  await check('malformed JSON', endpoint, { ...base, body: '{' }, 400, 'INVALID_JSON');
  await check('invalid task', endpoint, { ...base, body: 'null' }, 400, 'INVALID_TASK');
  await check('bounded body', endpoint, { ...base, body: JSON.stringify({ task: 'x'.repeat(20000) }) }, 413, 'BODY_TOO_LARGE');
  await check('JSON only', endpoint, { ...base, headers: { 'Content-Type': 'text/plain', Origin: origin }, body: '{}' }, 415, 'JSON_REQUIRED');
  await check('cross-origin compiler blocked', endpoint, { ...base, headers: { ...base.headers, Origin: 'https://example.com' }, body: '{}' }, 403, 'SAME_ORIGIN_REQUIRED');
  await check('cross-origin reset blocked', '/api/demo/reset', { method: 'POST', headers: { Origin: 'https://example.com' } }, 403, 'SAME_ORIGIN_REQUIRED');
  await check('local reset preserved', '/api/demo/reset', { method: 'POST', headers: { Origin: origin } }, 200);
  console.log('9 HTTP smoke checks passed; live compiler disabled; no provider calls requested.');
} finally {
  if (child.exitCode === null) child.kill('SIGTERM');
  await Promise.race([stopped, delay(3000)]);
  if (child.exitCode === null) child.kill('SIGKILL');
}
