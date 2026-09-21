import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink, lstat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REFERENCE_PROTOCOL, parseProbeOutput, judgeObservation, validateProbeRequest, readBoundedFile, referenceFile, snapshotReference, relativeReferencePath } from '../src/reference-protocol.mjs';
const worker = fileURLToPath(new URL('../src/reference-worker.mjs', import.meta.url));
const nonce = 'a'.repeat(64);
const request = (overrides = {}) => ({ protocol: REFERENCE_PROTOCOL, nonce, modulePath: 'subject.mjs', exportName: 'PaymentService', keys: Array(20).fill('same'), amount: 100, sequential: false, ...overrides });
const good = `export class PaymentService {
  constructor(store) { this.store=store; this.pending=new Map(); }
  async charge(key,amount) { const old=await this.store.findByKey(key); if(old) return old; if(this.pending.has(key)) return this.pending.get(key); const p=this.store.create(key,amount); this.pending.set(key,p); try{return await p;}finally{this.pending.delete(key);} }
}`;
const bad = `export class PaymentService { constructor(store){this.store=store;} async charge(key,amount){return this.store.create(key,amount);} }`;
async function run(source, input = request(), timeout = 3000) {
  const stage = await mkdtemp(path.join(tmpdir(), 'burhan-worker-test-'));
  const cwd = path.join(stage, 'candidate'); await mkdir(cwd);
  const file = path.join(stage, `request-${randomBytes(16).toString('hex')}.json`);
  await writeFile(path.join(cwd, 'subject.mjs'), source);
  await writeFile(file, JSON.stringify(input));
  try {
    const result = spawnSync(process.execPath, [worker, file], { cwd, timeout, maxBuffer: 128 * 1024 });
    const consumed = await lstat(file).then(() => false, () => true);
    return { ...result, consumed };
  } finally { await rm(stage, { recursive: true, force: true }); }
}
const frame = () => ({ protocol: REFERENCE_PROTOCOL, nonce, observation: { created: 1, completed: 20, createdKeys: ['same'], createdAmounts: [100], matchingResults: 20 }, error: null });
const buffer = value => Buffer.from(JSON.stringify(value));

test('request schema accepts only the bounded observation request', () => assert.deepEqual(validateProbeRequest(request()), request()));
for (const fields of [{ keys: [] }, { keys: [''] }, { keys: Array(65).fill('x') }, { amount: NaN }, { amount: -1 }, { sequential: 'yes' }, { verdict: 'pass' }, { nonce: 'fake' }, { exportName: '../module' }]) {
  test(`rejects invalid request fields ${JSON.stringify(fields)}`, () => assert.throws(() => validateProbeRequest(request(fields))));
}
for (const p of ['../outside', '/absolute', 'a/../b', 'a\\b', '.git/config', 'a//b', 'a\0b']) test(`rejects unsafe path ${JSON.stringify(p)}`, () => assert.throws(() => relativeReferencePath(p)));
test('valid measurement is judged by the parent', () => assert.equal(judgeObservation(parseProbeOutput(buffer(frame()), nonce).observation, request().keys, 100), true));
test('wrong charge count is a functional rejection', () => assert.equal(judgeObservation({ ...frame().observation, created: 20 }, request().keys, 100), false));
test('fabricated pass labels cannot replace measured fields', () => assert.throws(() => parseProbeOutput(buffer({ protocol: REFERENCE_PROTOCOL, nonce, verdict: 'verified' }), nonce)));
test('measurements cannot be replayed with a new run challenge', () => assert.throws(() => parseProbeOutput(buffer(frame()), 'b'.repeat(64))));
test('duplicate JSON keys are rejected', () => assert.throws(() => parseProbeOutput(Buffer.from(JSON.stringify(frame()).replace('"completed":20', '"completed":0,"completed":20')), nonce)));
test('trailing frames or log text are rejected', () => { for (const suffix of ['\nPASS', JSON.stringify(frame())]) assert.throws(() => parseProbeOutput(Buffer.from(JSON.stringify(frame()) + suffix), nonce)); });
test('invalid UTF-8 and oversized output are rejected', () => { for (const value of [Buffer.from([0xff]), Buffer.alloc(33 * 1024, 32)]) assert.throws(() => parseProbeOutput(value, nonce)); });
test('forged integer and array measurements fail the schema', () => { for (const value of [{ completed: 1000 }, { createdKeys: [] }, { matchingResults: 21 }, { created: -1 }]) assert.throws(() => parseProbeOutput(buffer({ ...frame(), observation: { ...frame().observation, ...value } }), nonce)); });
test('correct implementation passes same-key concurrency and consumes its request', async () => { const r = await run(good); assert.equal(r.status, 0); assert.equal(r.consumed, true); assert.equal(judgeObservation(parseProbeOutput(r.stdout, nonce).observation, request().keys, 100), true); });
test('non-idempotent implementation is measured, not self-reported', async () => { const r = await run(bad); const observation = parseProbeOutput(r.stdout, nonce).observation; assert.equal(observation.created, 20); assert.equal(judgeObservation(observation, request().keys, 100), false); });
test('distinct keys are observed independently', async () => { const input = request({ keys: ['one', 'two'] }); const r = await run(good, input); assert.equal(judgeObservation(parseProbeOutput(r.stdout, nonce).observation, input.keys, 100), true); });
test('sequential retries validate the returned charge', async () => { const input = request({ keys: ['retry', 'retry'], sequential: true }); const r = await run(good, input); assert.equal(judgeObservation(parseProbeOutput(r.stdout, nonce).observation, input.keys, 100), true); });
test('returning a fabricated charge without using the observed store fails', async () => { const r = await run(`export class PaymentService { async charge(key,amount){return {id:'charge_1',idempotencyKey:key,amount};} }`); assert.equal(judgeObservation(parseProbeOutput(r.stdout, nonce).observation, request().keys, 100), false); });
test('candidate cannot replace the observed store methods', async () => { const r = await run(`export class PaymentService { constructor(store){store.create=async()=>({});} }`); assert.equal(parseProbeOutput(r.stdout, nonce).error, 'SUBJECT_THREW'); });
test('an early zero exit does not generate completed evidence', async () => { const r = await run('process.exit(0)'); assert.equal(r.status, 0); assert.throws(() => parseProbeOutput(r.stdout, nonce)); });
test('fabricated candidate stdout does not determine acceptance', async () => { const r = await run(`console.log('{"status":"pass"}'); process.exit(0);`); assert.throws(() => parseProbeOutput(r.stdout, nonce)); });
test('extra candidate logs fail closed rather than accepting ambiguous output', async () => { const r = await run(`console.log('verified');\n${good}`); assert.throws(() => parseProbeOutput(r.stdout, nonce)); });
test('Object and Array toJSON injection cannot replace measurements', async () => { const r = await run(`Object.prototype.toJSON=function(){return {created:1,verdict:'verified'};}; Array.prototype.toJSON=Object.prototype.toJSON;\n${bad}`); const data = parseProbeOutput(r.stdout, nonce); assert.equal(data.observation.created, 20); assert.equal(judgeObservation(data.observation, request().keys, 100), false); });
test('overwriting stdout._write does not rewrite the verifier measurement frame', async () => { const r = await run(`process.stdout._write=(_c,_e,cb)=>cb();\n${good}`); assert.equal(judgeObservation(parseProbeOutput(r.stdout, nonce).observation, request().keys, 100), true); });
test('changing global JSON.stringify cannot forge measurements', async () => { const r = await run(`JSON.stringify=()=>'{"status":"pass"}';\n${bad}`); assert.equal(parseProbeOutput(r.stdout, nonce).observation.created, 20); });
test('candidate syntax failures are distinct from completed measurements', async () => { const r = await run('export class {'); assert.equal(parseProbeOutput(r.stdout, nonce).error, 'SUBJECT_IMPORT_FAILED'); });
test('candidate globals never appear in the parent test process', async () => { delete globalThis.__burhan_candidate_marker; await run(`globalThis.__burhan_candidate_marker=true;\n${good}`); assert.equal(globalThis.__burhan_candidate_marker, undefined); });
test('candidate arguments contain no nonce or request filename after input consumption', async () => { const r = await run(`if(process.argv.length!==2) process.exit(0);\n${good}`); assert.equal(judgeObservation(parseProbeOutput(r.stdout, nonce).observation, request().keys, 100), true); });
test('infinite import cannot produce a valid frame', async () => { const r = await run('while(true){}', request(), 500); assert.equal(r.error?.code, 'ETIMEDOUT'); assert.throws(() => parseProbeOutput(r.stdout, nonce)); });
test('snapshot detects file edits, deletions and new files', async () => { const root = await mkdtemp(path.join(tmpdir(), 'burhan-snapshot-')); try { await writeFile(path.join(root, 'a'), 'original'); const a=await snapshotReference(root); await writeFile(path.join(root,'a'),'changed'); const b=await snapshotReference(root); assert.notEqual(a.hash,b.hash); await writeFile(path.join(root,'b'),'new'); assert.notEqual((await snapshotReference(root)).hash,b.hash); await rm(path.join(root,'a')); assert.notDeepEqual((await snapshotReference(root)).files,a.files); } finally { await rm(root,{recursive:true,force:true}); } });
test('bounded file reads reject oversize contents', async () => { const root=await mkdtemp(path.join(tmpdir(),'burhan-bound-')); try{const file=path.join(root,'data');await writeFile(file,'12345');await assert.rejects(readBoundedFile(file,4));assert.equal((await readBoundedFile(file,5)).toString(),'12345');}finally{await rm(root,{recursive:true,force:true});} });
test('directory symlinks/junctions cannot redirect a subject or a snapshot', async () => { const root=await mkdtemp(path.join(tmpdir(),'burhan-link-')); try{const inside=path.join(root,'inside'), outside=path.join(root,'outside');await mkdir(inside);await mkdir(outside);await writeFile(path.join(outside,'data'),'outside');await symlink(outside,path.join(inside,'link'),process.platform==='win32'?'junction':'dir');await assert.rejects(referenceFile(inside,'link/data'));await assert.rejects(snapshotReference(inside));}finally{await rm(root,{recursive:true,force:true});} });
