import { createHash } from 'node:crypto';
import { lstat, open, readdir, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

export const REFERENCE_PROTOCOL = 'burhan-payment-observation-v1';
export const REFERENCE_PROFILE = 'bounded_payment_reference_v1';
export const digest = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join('\0') === [...keys].sort().join('\0');

export function relativeReferencePath(value) {
  if (typeof value !== 'string' || value.length > 512 || !value || /[\\\x00-\x1f:]/.test(value) || path.posix.isAbsolute(value) ||
      value.split('/').some(part => !part || part === '.' || part === '..' || part.toLowerCase() === '.git')) throw new Error('REFERENCE_PATH_INVALID');
  return value;
}

/** Reject links and special files; the local filesystem remains a trusted-host boundary. */
export async function referenceFile(root, relative) {
  relativeReferencePath(relative);
  const canonicalRoot = await realpath(root);
  let target = canonicalRoot;
  const parts = relative.split('/');
  for (let i = 0; i < parts.length; i++) {
    target = path.join(target, parts[i]);
    const info = await lstat(target);
    if (info.isSymbolicLink() || (i < parts.length - 1 ? !info.isDirectory() : !info.isFile())) throw new Error('REFERENCE_FILE_UNSAFE');
  }
  const canonical = await realpath(target);
  if (path.relative(canonicalRoot, canonical).split(path.sep).includes('..')) throw new Error('REFERENCE_PATH_ESCAPE');
  return canonical;
}

export async function readBoundedFile(filename, maxBytes = 1024 * 1024) {
  const handle = await open(filename, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > maxBytes) throw new Error('REFERENCE_FILE_LIMIT');
    const buffer = Buffer.alloc(info.size + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, null);
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (length !== info.size) throw new Error('REFERENCE_FILE_CHANGED');
    return buffer.subarray(0, length);
  } finally { await handle.close(); }
}

export async function snapshotReference(root) {
  const files = [];
  let size = 0, visitedEntries = 0;
  async function visit(directory, prefix = '', depth = 0) {
    if (depth > 32) throw new Error('REFERENCE_TREE_LIMIT');
    const entries = await readdir(directory, { withFileTypes: true });
    if (entries.length > 2048) throw new Error('REFERENCE_TREE_LIMIT');
    entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    for (const entry of entries) {
      if (!prefix && entry.name === '.git') continue;
      if (++visitedEntries > 4096) throw new Error('REFERENCE_TREE_LIMIT');
      const relative = prefix + entry.name;
      relativeReferencePath(relative);
      const full = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error('REFERENCE_FILE_UNSAFE');
      if (entry.isDirectory()) await visit(full, relative + '/', depth + 1);
      else if (entry.isFile()) {
        if (files.length >= 2048) throw new Error('REFERENCE_TREE_LIMIT');
        const bytes = await readBoundedFile(full);
        size += bytes.length;
        if (size > 16 * 1024 * 1024) throw new Error('REFERENCE_TREE_LIMIT');
        const info = await lstat(full);
        files.push({ path: relative, hash: digest(bytes), executable: (info.mode & 0o111) !== 0 });
      } else throw new Error('REFERENCE_FILE_UNSAFE');
    }
  }
  await visit(await realpath(root));
  return { files, hash: digest(JSON.stringify(files)) };
}

export function validateProbeRequest(value) {
  if (!exact(value, ['protocol', 'nonce', 'modulePath', 'exportName', 'keys', 'amount', 'sequential']) ||
      value.protocol !== REFERENCE_PROTOCOL || !/^[a-f0-9]{64}$/.test(value.nonce ?? '') ||
      typeof value.exportName !== 'string' || !/^[A-Za-z_$][A-Za-z0-9_$]{0,127}$/.test(value.exportName) ||
      !Array.isArray(value.keys) || value.keys.length < 1 || value.keys.length > 64 ||
      value.keys.some(key => typeof key !== 'string' || key.length < 1 || key.length > 128) ||
      !Number.isSafeInteger(value.amount) || value.amount < 0 || typeof value.sequential !== 'boolean') throw new Error('REFERENCE_REQUEST_INVALID');
  relativeReferencePath(value.modulePath);
  return value;
}

/** Exact serialization also rejects duplicate keys, trailing output and fabricated log frames. */
export function parseProbeOutput(bytes, nonce) {
  if (!Buffer.isBuffer(bytes) || bytes.length > 32 * 1024) throw new Error('REFERENCE_PROTOCOL_INVALID');
  let value, text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).trim(); value = JSON.parse(text); }
  catch { throw new Error('REFERENCE_PROTOCOL_INVALID'); }
  if (!exact(value, ['protocol', 'nonce', 'observation', 'error']) || JSON.stringify(value) !== text ||
      value.protocol !== REFERENCE_PROTOCOL || value.nonce !== nonce) throw new Error('REFERENCE_PROTOCOL_INVALID');
  if (value.error !== null) {
    if (value.observation !== null || !['SUBJECT_IMPORT_FAILED', 'SUBJECT_INVALID', 'SUBJECT_THREW'].includes(value.error)) throw new Error('REFERENCE_PROTOCOL_INVALID');
    return value;
  }
  const o = value.observation;
  if (!exact(o, ['created', 'completed', 'createdKeys', 'createdAmounts', 'matchingResults']) ||
      !Number.isSafeInteger(o.created) || o.created < 0 || o.created > 1024 ||
      !Number.isSafeInteger(o.completed) || o.completed < 0 || o.completed > 64 ||
      !Number.isSafeInteger(o.matchingResults) || o.matchingResults < 0 || o.matchingResults > o.completed ||
      !Array.isArray(o.createdKeys) || o.createdKeys.length !== o.created || o.createdKeys.some(x => typeof x !== 'string' || x.length > 128) ||
      !Array.isArray(o.createdAmounts) || o.createdAmounts.length !== o.created || o.createdAmounts.some(x => !Number.isSafeInteger(x) || x < 0)) throw new Error('REFERENCE_PROTOCOL_INVALID');
  return value;
}

/** Acceptance is reduced here in the parent, not from a child-provided pass/fail flag. */
export function judgeObservation(observation, keys, amount) {
  const unique = [...new Set(keys)].sort();
  return observation.created === unique.length && observation.completed === keys.length &&
    observation.matchingResults === keys.length && JSON.stringify([...observation.createdKeys].sort()) === JSON.stringify(unique) &&
    observation.createdAmounts.every(value => value === amount);
}
