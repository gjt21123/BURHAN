import { execFileSync } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import { fail, LIMITS, requireThat, text, validOid } from './common.mjs';
import { validPath } from './contract.mjs';

export function gitEnvironment() {
  const allowed = new Set(['path', 'systemroot', 'windir', 'home', 'userprofile', 'tmp', 'temp', 'tmpdir']);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.has(key.toLowerCase())));
  return { ...env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_TERMINAL_PROMPT: '0', GIT_ALLOW_PROTOCOL: '', GIT_NO_REPLACE_OBJECTS: '1', GIT_NO_LAZY_FETCH: '1', GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: 'cat', LC_ALL: 'C' };
}
export function runGit(repo, args, maxBuffer = LIMITS.treeBytes, allowOne = false) {
  try {
    return execFileSync('git', ['--no-replace-objects', '-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=' + (process.platform === 'win32' ? 'NUL' : '/dev/null'), '-c', 'protocol.allow=never', '-C', repo, ...args], { env: gitEnvironment(), shell: false, windowsHide: true, timeout: 15000, maxBuffer, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    if (allowOne && error.status === 1) return null;
    if (error.code === 'ENOENT') fail('GIT_UNAVAILABLE', 'Git must be installed on PATH.');
    if (error.code === 'ETIMEDOUT' || error.code === 'ENOBUFS') fail('RESOURCE_LIMIT', 'Git exceeded the operation time or output limit.');
    fail('GIT_FAILED', 'Git could not read local repository objects. Fetch missing history yourself; BURHAN never fetches.');
  }
}
export async function repository(directory) {
  let root;
  try { root = await realpath(directory); } catch { fail('REPOSITORY_UNAVAILABLE', 'Repository directory is unavailable.'); }
  runGit(root, ['rev-parse', '--git-dir'], 8192);
  return root;
}
export function requireCommit(repo, oid) {
  requireThat(validOid(oid), 'COMMIT_REQUIRED', 'Use full lowercase commit IDs, not mutable branches, abbreviated IDs or options.');
  requireThat(text(runGit(repo, ['cat-file', '-t', oid], 128)).trim() === 'commit', 'COMMIT_REQUIRED', 'The object must be a commit, not a tag, tree or blob.');
  return oid;
}
export function isAncestor(repo, base, head) {
  return runGit(repo, ['merge-base', '--is-ancestor', base, head], 8192, true) !== null;
}
export function readTree(repo, oid) {
  const raw = text(runGit(repo, ['ls-tree', '-r', '-l', '-z', '--full-tree', oid]));
  const records = raw.split('\0').filter(Boolean);
  requireThat(records.length <= LIMITS.treeEntries, 'TREE_LIMIT', 'Repository exceeds the 10,000-file preview limit.');
  const entries = new Map();
  const folded = new Set();
  const prefixCase = new Map();
  for (const record of records) {
    const match = /^(\d{6}) (\w+) ([a-f0-9]+) +([\d-]+)\t([\s\S]+)$/.exec(record);
    requireThat(match !== null, 'TREE_INVALID', 'Git returned an unsupported tree record.');
    const [, mode, type, objectId, sizeString, file] = match;
    requireThat(type === 'blob' && ['100644', '100755'].includes(mode), 'TREE_UNSUPPORTED', 'This profile refuses symlinks and submodules rather than following or executing them.');
    requireThat(validPath(file), 'PATH_UNSUPPORTED', 'The snapshot contains a non-portable or reserved path.');
    const foldedPath = file.toLowerCase();
    requireThat(!folded.has(foldedPath), 'PATH_COLLISION', 'Case-insensitive path collision in the snapshot.');
    folded.add(foldedPath);
    const parts = file.split('/');
    for (let i = 1; i <= parts.length; i++) {
      const prefix = parts.slice(0, i).join('/');
      const previous = prefixCase.get(prefix.toLowerCase());
      requireThat(previous === undefined || previous === prefix, 'PATH_COLLISION', 'Directory/file case collision in the snapshot.');
      prefixCase.set(prefix.toLowerCase(), prefix);
    }
    requireThat(validOid(objectId) && /^\d+$/.test(sizeString), 'TREE_INVALID', 'Invalid Git object metadata.');
    entries.set(file, { path: file, mode, objectId, size: Number(sizeString) });
  }
  // Also reject file/directory case collisions, e.g. A and a/child on Windows.
  for (const file of entries.keys()) {
    const parts = file.toLowerCase().split('/');
    for (let i = 1; i < parts.length; i++) requireThat(!folded.has(parts.slice(0, i).join('/')), 'PATH_COLLISION', 'File/directory path collision in the snapshot.');
  }
  return entries;
}
export function readBlob(repo, entry) {
  requireThat(entry.size <= LIMITS.blobBytes, 'BLOB_LIMIT', 'A checked blob exceeds the 1 MiB preview limit.');
  const bytes = runGit(repo, ['cat-file', 'blob', entry.objectId], LIMITS.blobBytes + 1);
  requireThat(bytes.length === entry.size && bytes.length <= LIMITS.blobBytes, 'BLOB_INVALID', 'Git object size is inconsistent or exceeds the limit.');
  return bytes;
}
