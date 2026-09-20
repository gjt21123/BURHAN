import { canonical, digest, exactKeys, LIMITS, PROFILE, requireThat, validDigest, validOid } from './common.mjs';

export function validPath(value) {
  if (typeof value !== 'string' || !value.length || value.length > 512 || !value.isWellFormed() || value !== value.normalize('NFC')) return false;
  return value.split('/').every(part => part && !['.', '..', '.git'].includes(part.toLowerCase()) &&
    !/[<>:"\\|?*\x00-\x1f\x7f]/.test(part) && !/[. ]$/.test(part) &&
    !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part));
}
export function validPattern(value) {
  return value === '**' || (typeof value === 'string' && (value.endsWith('/**') ? validPath(value.slice(0, -3)) : validPath(value)));
}
export function matches(pattern, file) {
  return pattern === '**' || (pattern.endsWith('/**') ? file.startsWith(pattern.slice(0, -2)) : file === pattern);
}
export function pointerTokens(pointer) {
  requireThat(typeof pointer === 'string' && pointer.length <= 512 && (pointer === '' || pointer.startsWith('/')) && !/~(?:[^01]|$)/.test(pointer), 'SCHEMA_INVALID', 'Expected an RFC 6901 JSON pointer.');
  return pointer === '' ? [] : pointer.slice(1).split('/').map(part => part.replaceAll('~1', '/').replaceAll('~0', '~'));
}
export function validateContract(contract) {
  exactKeys(contract, ['schemaVersion', 'profile', 'title', 'allowedPaths', 'forbiddenPaths', 'requireChanges', 'checks'], ['$schema']);
  if (Object.hasOwn(contract, '$schema')) requireThat(typeof contract.$schema === 'string' && contract.$schema.length <= 2048, 'SCHEMA_INVALID', 'Schema metadata must be a bounded string.');
  requireThat(contract.schemaVersion === 1 && contract.profile === PROFILE, 'PROFILE_UNSUPPORTED', 'Only the explicit static Git snapshot profile is supported.');
  requireThat(typeof contract.title === 'string' && contract.title.trim().length > 0 && contract.title.length <= 160 && !/[\x00-\x1f\x7f]/.test(contract.title), 'SCHEMA_INVALID', 'Expected a bounded printable title.');
  for (const key of ['allowedPaths', 'forbiddenPaths']) requireThat(Array.isArray(contract[key]) && contract[key].length <= 128 && contract[key].every(validPattern) && new Set(contract[key]).size === contract[key].length, 'SCHEMA_INVALID', 'Paths must use exact names, directory/**, or **; duplicates are invalid.');
  requireThat(contract.allowedPaths.length > 0 && typeof contract.requireChanges === 'boolean', 'SCHEMA_INVALID', 'An allowed scope and explicit requireChanges boolean are required.');
  requireThat(Array.isArray(contract.checks) && contract.checks.length > 0 && contract.checks.length <= LIMITS.checks, 'SCHEMA_INVALID', 'A contract requires 1 to 64 checks.');
  const ids = new Set();
  for (const check of contract.checks) {
    requireThat(check && typeof check === 'object', 'SCHEMA_INVALID', 'Invalid check.');
    const fields = { exists: [], absent: [], textIncludes: ['value'], jsonEquals: ['pointer', 'value'], sha256: ['value'] };
    requireThat(typeof check.kind === 'string' && Object.hasOwn(fields, check.kind), 'CHECK_UNSUPPORTED', 'Unknown validator primitive; arbitrary commands are not supported.');
    exactKeys(check, ['id', 'kind', 'path', ...fields[check.kind]]);
    requireThat(typeof check.id === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,47}$/.test(check.id) && !ids.has(check.id), 'SCHEMA_INVALID', 'Check identifiers must be unique and printable.');
    ids.add(check.id);
    requireThat(validPath(check.path), 'PATH_UNSUPPORTED', 'Check paths must be portable relative paths.');
    if (check.kind === 'textIncludes') requireThat(typeof check.value === 'string' && check.value.length > 0 && check.value.length <= 4096, 'SCHEMA_INVALID', 'Text predicates require a nonempty bounded literal.');
    if (check.kind === 'sha256') requireThat(validDigest(check.value), 'SCHEMA_INVALID', 'Expected a lowercase SHA-256 digest.');
    if (check.kind === 'jsonEquals') {
      pointerTokens(check.pointer);
      requireThat(check.value === null || ['string', 'number', 'boolean'].includes(typeof check.value), 'SCHEMA_INVALID', 'JSON equality supports scalar values only.');
      requireThat(typeof check.value !== 'number' || Number.isSafeInteger(check.value), 'SCHEMA_INVALID', 'Numeric equality requires a safe integer.');
    }
  }
  requireThat(Buffer.byteLength(canonical(contract)) <= LIMITS.jsonBytes, 'INPUT_LIMIT', 'Contract exceeds 256 KiB.');
  return contract;
}
export function makeSeal(contract, baseCommit) {
  validateContract(contract);
  requireThat(validOid(baseCommit), 'COMMIT_REQUIRED', 'Use a full lowercase commit object ID.');
  const payload = { kind: 'burhan.static-seal.v1', profile: PROFILE, baseCommit, contractHash: digest('burhan.contract.v1', contract), contract };
  const seal = { ...payload, sealHash: digest('burhan.seal.v1', payload) };
  requireThat(Buffer.byteLength(JSON.stringify(seal, null, 2)) + 1 <= LIMITS.jsonBytes, 'SEAL_LIMIT', 'The formatted seal exceeds the 256 KiB input limit. Reduce contract size.');
  return seal;
}
export function validateSeal(seal, expectedHash) {
  requireThat(validDigest(expectedHash), 'PIN_REQUIRED', 'An independently retained --expect-seal SHA-256 pin is required.');
  exactKeys(seal, ['kind', 'profile', 'baseCommit', 'contractHash', 'contract', 'sealHash']);
  requireThat(seal.kind === 'burhan.static-seal.v1' && seal.profile === PROFILE, 'PROFILE_UNSUPPORTED', 'Unsupported seal format.');
  const rebuilt = makeSeal(seal.contract, seal.baseCommit);
  requireThat(canonical(rebuilt) === canonical(seal) && rebuilt.sealHash === expectedHash, 'SEAL_MISMATCH', 'Seal or approved digest does not match.');
  return seal;
}
export function starterContract() {
  return { schemaVersion: 1, profile: PROFILE, title: 'Review and customize this static contract', allowedPaths: ['src/**', 'docs/**'], forbiddenPaths: ['tests/**', '.github/**', 'package.json', 'package-lock.json'], requireChanges: true, checks: [{ id: 'DOC-001', kind: 'textIncludes', path: 'docs/api.md', value: 'Idempotency-Key' }] };
}
