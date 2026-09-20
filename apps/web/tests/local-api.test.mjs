import assert from "node:assert/strict";
import { test } from "node:test";
import { checkLocalRequest, readLimitedJson, parseTask, createExclusiveGate, MAX_TASK_CHARS } from "../lib/local-api.ts";
const request = (body = '{}', headers = {}, url = 'http://localhost:3000/api/test') =>
  new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body });

test('accepts same-origin JSON from the local UI', () => {
  assert.equal(checkLocalRequest(request('{}', { Origin: 'http://localhost:3000', Host: 'localhost:3000' })), null);
});
test('accepts a local JSON CLI request without browser headers', () => assert.equal(checkLocalRequest(request()), null));
test('accepts IPv4 and IPv6 loopback', () => {
  for (const host of ['127.0.0.1', '[::1]']) assert.equal(checkLocalRequest(request('{}', {}, `http://${host}:3000/api/test`)), null);
});
test('rejects cross-origin writes', () => assert.equal(checkLocalRequest(request('{}', { Origin: 'https://example.com' })).status, 403));
test('rejects opaque origins', () => assert.equal(checkLocalRequest(request('{}', { Origin: 'null' })).status, 403));
test('rejects cross-site browser requests even without an origin', () => assert.equal(checkLocalRequest(request('{}', { 'Sec-Fetch-Site': 'cross-site' })).status, 403));
test('rejects DNS rebinding hostnames', () => assert.equal(checkLocalRequest(request('{}', { Host: 'attacker.example:3000' })).status, 403));
test('rejects non-loopback request URLs', () => assert.equal(checkLocalRequest(request('{}', { Host: 'localhost:3000' }, 'http://example.com:3000/api/test')).status, 403));
test('rejects Host path, userinfo and port ambiguity', () => {
  for (const host of ['localhost:3000/extra', 'user@localhost:3000', 'localhost:4000']) {
    assert.equal(checkLocalRequest(request('{}', { Host: host })).status, 403);
  }
});
test('requires application/json to prevent simple cross-site form posts', () => assert.equal(checkLocalRequest(request('{}', { 'Content-Type': 'text/plain' })).status, 415));
test('permits JSON charset parameters', () => assert.equal(checkLocalRequest(request('{}', { 'Content-Type': 'application/json; charset=utf-8' })), null));
test('parses valid bounded JSON', async () => assert.deepEqual(await readLimitedJson(request('{"task":"test"}')), { ok: true, value: { task: 'test' } }));
test('malformed JSON is a controlled 400, not an uncaught exception', async () => assert.equal((await readLimitedJson(request('{'))).response.status, 400));
test('rejects advertised oversized bodies before parsing', async () => assert.equal((await readLimitedJson(request('{}', { 'Content-Length': '50000' }))).response.status, 413));
test('enforces limits when Content-Length is absent or lies', async () => {
  for (const headers of [{}, { 'Content-Length': '2' }]) assert.equal((await readLimitedJson(request('"' + 'x'.repeat(40) + '"', headers), 16)).response.status, 413);
});
test('limits UTF-8 bytes rather than JavaScript characters', async () => assert.equal((await readLimitedJson(request('"' + 'ع'.repeat(10) + '"'), 16)).response.status, 413));
test('rejects invalid UTF-8', async () => assert.equal((await readLimitedJson(request(new Uint8Array([0xff, 0xfe])))).response.status, 400));
test('times out a body that never finishes', async () => {
  const stream = new ReadableStream({ start() {} });
  const req = new Request('http://localhost:3000', { method: 'POST', body: stream, duplex: 'half' });
  assert.equal((await readLimitedJson(req, 1024, 5)).response.status, 408);
});
test('validates task shape, length and whitespace', () => {
  for (const value of [null, [], 4, {}, { task: 4 }, { task: '  ' }, { task: 'x'.repeat(MAX_TASK_CHARS + 1) }]) assert.equal(parseTask(value), null);
  assert.equal(parseTask({ task: '  bounded task  ' }), 'bounded task');
});
test('exclusive gate rejects overlap and releases after success', async () => {
  const gate = createExclusiveGate();
  let release;
  const pending = gate(() => new Promise(resolve => { release = resolve; }));
  assert.equal((await gate(async () => Response.json({}))).status, 429);
  release(Response.json({}));
  await pending;
  assert.equal((await gate(async () => Response.json({}))).status, 200);
});
test('exclusive gate releases after failure', async () => {
  const gate = createExclusiveGate();
  await assert.rejects(gate(async () => { throw new Error('expected'); }));
  assert.equal((await gate(async () => Response.json({}))).status, 200);
});
test('bodyless reset requests still enforce origin and host checks', () => {
  const req = new Request('http://localhost:3000/api/demo/reset', { method: 'POST' });
  assert.equal(checkLocalRequest(req, false), null);
  const cross = new Request('http://localhost:3000/api/demo/reset', { method: 'POST', headers: { Origin: 'https://example.com' } });
  assert.equal(checkLocalRequest(cross, false).status, 403);
});
