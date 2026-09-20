import { createHash } from 'node:crypto';
import { open } from 'node:fs/promises';

export const VERSION = '0.3.0-preview.1';
export const PROFILE = 'static_git_snapshot_v1';
export const LIMITS = Object.freeze({ jsonBytes: 262144, reportBytes: 4194304, blobBytes: 1048576, treeBytes: 4194304, treeEntries: 10000, checks: 64, totalBlobBytes: 16777216 });
export class BurhanError extends Error {
  constructor(code, message) { super(message); this.name = 'BurhanError'; this.code = code; }
}
export function fail(code, message) { throw new BurhanError(code, message); }
export function requireThat(condition, code, message) { if (!condition) fail(code, message); }
export function canonical(value, depth = 0) {
  requireThat(depth <= 40, 'JSON_DEPTH', 'JSON exceeds the supported nesting depth.');
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    requireThat(Number.isFinite(value), 'INVALID_NUMBER', 'Only finite JSON numbers are supported.');
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    requireThat(value.isWellFormed(), 'INVALID_UNICODE', 'JSON contains an unpaired surrogate.');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return '[' + value.map(item => canonical(item, depth + 1)).join(',') + ']';
  requireThat(value && Object.getPrototypeOf(value) === Object.prototype, 'INVALID_JSON', 'Expected a plain JSON value.');
  return '{' + Object.keys(value).sort().map(key => canonical(key, depth + 1) + ':' + canonical(value[key], depth + 1)).join(',') + '}';
}
export function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
export function digest(domain, value) { return sha256(domain + '\0' + canonical(value)); }
export function exactKeys(object, required, optional = []) {
  requireThat(object && typeof object === 'object' && !Array.isArray(object), 'SCHEMA_INVALID', 'Expected a JSON object.');
  requireThat(required.every(key => Object.hasOwn(object, key)) && Object.keys(object).every(key => [...required, ...optional].includes(key)), 'SCHEMA_INVALID', 'Missing or unsupported fields.');
}
export function text(bytes) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { fail('INVALID_UTF8', 'Input must be valid UTF-8.'); }
}
export function parseJson(bytes) {
  let value;
  try { value = JSON.parse(text(bytes)); }
  catch (error) { if (error instanceof BurhanError) throw error; fail('INVALID_JSON', 'Input is not valid JSON.'); }
  rejectDuplicateKeys(text(bytes));
  canonical(value); // Apply depth, Unicode and number limits before further processing.
  return value;
}
/** Native JSON parsing establishes syntax; this bounded walk rejects ambiguous duplicate keys. */
function rejectDuplicateKeys(source) {
  let at = 0;
  const whitespace = () => { while (/\s/.test(source[at] ?? '') && at < source.length) at++; };
  function string() {
    const start = at++;
    while (source[at] !== '"') { if (source[at] === '\\') at++; at++; }
    at++;
    return JSON.parse(source.slice(start, at));
  }
  function walk(depth) {
    requireThat(depth <= 40, 'JSON_DEPTH', 'JSON exceeds the supported nesting depth.');
    whitespace();
    if (source[at] === '"') { string(); return; }
    if (source[at] === '{') {
      at++; whitespace();
      const keys = new Set();
      if (source[at] === '}') { at++; return; }
      while (true) {
        whitespace(); const key = string();
        requireThat(!keys.has(key), 'DUPLICATE_JSON_KEY', 'Duplicate JSON object keys are ambiguous.');
        keys.add(key); whitespace(); at++; walk(depth + 1); whitespace();
        if (source[at++] === '}') return;
      }
    }
    if (source[at] === '[') {
      at++; whitespace();
      if (source[at] === ']') { at++; return; }
      while (true) { walk(depth + 1); whitespace(); if (source[at++] === ']') return; }
    }
    while (at < source.length && !/[\s,}\]]/.test(source[at])) at++;
  }
  walk(0);
}
export async function readJson(file, maxBytes = LIMITS.jsonBytes) {
  let handle;
  try {
    handle = await open(file, 'r');
    const stats = await handle.stat();
    requireThat(stats.isFile() && stats.size <= maxBytes, 'INPUT_LIMIT', 'Expected a regular JSON file within the configured byte limit.');
    const buffer = Buffer.alloc(maxBytes + 1);
    let length = 0;
    while (length < buffer.length) {
      const result = await handle.read(buffer, length, buffer.length - length, null);
      if (!result.bytesRead) break;
      length += result.bytesRead;
    }
    requireThat(length <= maxBytes, 'INPUT_LIMIT', 'JSON input exceeds the configured byte limit.');
    return parseJson(buffer.subarray(0, length));
  } catch (error) {
    if (error instanceof BurhanError) throw error;
    fail('INPUT_UNAVAILABLE', 'Cannot read the requested JSON input.');
  } finally { await handle?.close(); }
}
export async function writeNewJson(file, value) {
  let handle;
  try {
    handle = await open(file, 'wx', 0o600);
    await handle.writeFile(JSON.stringify(value, null, 2) + '\n');
  } catch (error) {
    if (error?.code === 'EEXIST') fail('OUTPUT_EXISTS', 'Output already exists; choose a new path.');
    fail('OUTPUT_UNAVAILABLE', 'Cannot create the output file; its parent must exist.');
  } finally { await handle?.close(); }
}
export function validOid(value) { return typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value); }
export function validDigest(value) { return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value); }
