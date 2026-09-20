import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canonical, digest, parseJson, PROFILE } from '../lib/common.mjs';
import { makeSeal, matches, starterContract, validateContract, validateSeal, validPath, validPattern } from '../lib/contract.mjs';
import { evaluate, primitiveControls } from '../lib/primitives.mjs';
const base = 'a'.repeat(40);
const expectCode = code => error => error.code === code;

test('starter contract validates without granting approval', () => assert.equal(validateContract(starterContract()).profile, PROFILE));
test('canonical JSON is stable across object insertion order', () => assert.equal(canonical({ b: 2, a: 1 }), canonical({ a: 1, b: 2 })));
test('hashes are domain separated', () => assert.notEqual(digest('seal', {}), digest('report', {})));
test('canonicalization rejects non-finite numbers and deep input', () => {
  assert.throws(() => canonical({ value: Infinity }));
  let value = true; for (let i = 0; i < 50; i++) value = { value };
  assert.throws(() => canonical(value), expectCode('JSON_DEPTH'));
});
test('strict JSON rejects duplicate keys including escaped aliases', () => {
  for (const value of ['{"x":1,"x":2}', '{"x":1,"\\u0078":2}', '{"outer":{"x":1,"x":2}}']) assert.throws(() => parseJson(Buffer.from(value)), expectCode('DUPLICATE_JSON_KEY'));
});
test('strict JSON permits repeated keys in different objects and escaped quotes', () => {
  assert.deepEqual(parseJson(Buffer.from('[{"x":1},{"x":2},"brace { quote \\\"",null]')), [{ x: 1 }, { x: 2 }, 'brace { quote "', null]);
});
test('strict JSON rejects invalid UTF-8 and malformed JSON', () => {
  assert.throws(() => parseJson(Buffer.from([0xff])), expectCode('INVALID_UTF8'));
  assert.throws(() => parseJson(Buffer.from('{')), expectCode('INVALID_JSON'));
});
test('Unicode strings cannot contain unpaired surrogates', () => assert.throws(() => parseJson(Buffer.from('"\\ud800"')), expectCode('INVALID_UNICODE')));
for (const path of ['../secret', '/absolute', 'a/../b', 'a//b', 'C:/file', 'a\\b', '.git/config', 'A/.GIT/config', 'CON', 'folder/NUL.txt', 'name.', 'name ', 'a\nb', 'a\tb', 'a:b', 'a*', 'e\u0301.txt']) {
  test(`rejects non-portable path ${JSON.stringify(path)}`, () => assert.equal(validPath(path), false));
}
test('portable Arabic paths and names containing spaces are allowed', () => assert.equal(validPath('docs/دليل المستخدم.md'), true));
test('only explicit supported scope patterns are accepted', () => {
  for (const pattern of ['**', 'src/**', 'package.json']) assert.equal(validPattern(pattern), true);
  for (const pattern of ['src/*', '../**', 'src/**/test', '/**']) assert.equal(validPattern(pattern), false);
  assert.equal(matches('src/**', 'src/file.js'), true); assert.equal(matches('src/**', 'src-other/file.js'), false);
});
test('unknown fields and command validators fail closed', () => {
  assert.throws(() => validateContract({ ...starterContract(), command: 'echo unsafe' }), expectCode('SCHEMA_INVALID'));
  const value = starterContract(); value.checks[0] = { id: 'CMD', kind: 'command', path: 'src/a', command: 'node x.js' };
  assert.throws(() => validateContract(value), expectCode('CHECK_UNSUPPORTED'));
  for (const kind of [['exists'], null, 3, {}]) assert.throws(() => validateContract({ ...starterContract(), checks: [{ id: 'KIND', kind, path: 'src/a' }] }), expectCode('CHECK_UNSUPPORTED'));
  assert.throws(() => validateContract({ ...starterContract(), $schema: {} }), expectCode('SCHEMA_INVALID'));
});
test('a contract cannot silently select runtime assurance', () => assert.throws(() => validateContract({ ...starterContract(), profile: 'runtime' }), expectCode('PROFILE_UNSUPPORTED')));
test('empty checks, duplicate IDs, and empty required text are rejected', () => {
  const original = starterContract();
  for (const checks of [[], [original.checks[0], original.checks[0]], [{ ...original.checks[0], value: '' }]]) assert.throws(() => validateContract({ ...original, checks }), expectCode('SCHEMA_INVALID'));
});
test('JSON equality supports precise scalar predicates, not unsafe numeric rounding', () => {
  const check = { id: 'JSON', kind: 'jsonEquals', path: 'src/config.json', pointer: '/ready', value: Number.MAX_SAFE_INTEGER + 1 };
  assert.throws(() => validateContract({ ...starterContract(), checks: [check] }), expectCode('SCHEMA_INVALID'));
});
test('seal binds contract and full baseline independently of key order', () => {
  const seal = makeSeal(starterContract(), base);
  assert.equal(validateSeal(seal, seal.sealHash), seal);
  assert.throws(() => validateSeal({ ...seal, baseCommit: 'b'.repeat(40) }, seal.sealHash), expectCode('SEAL_MISMATCH'));
  const large = { ...starterContract(), checks: Array.from({ length: 64 }, (_, index) => ({ id: 'C' + index, kind: 'textIncludes', path: 'docs/api.md', value: 'x'.repeat(3970) })) };
  validateContract(large);
  assert.throws(() => makeSeal(large, base), expectCode('SEAL_LIMIT'));
});
test('a substituted contract and recalculated seal still fail the independent pin', () => {
  const seal = makeSeal(starterContract(), base);
  const attacker = makeSeal({ ...starterContract(), forbiddenPaths: [] }, base);
  assert.throws(() => validateSeal(attacker, seal.sealHash), expectCode('SEAL_MISMATCH'));
});
test('missing pins and mutable refs cannot seal or verify', () => {
  assert.throws(() => validateSeal(makeSeal(starterContract(), base)), expectCode('PIN_REQUIRED'));
  for (const ref of ['HEAD', 'master', '--help', 'abcd']) assert.throws(() => makeSeal(starterContract(), ref), expectCode('COMMIT_REQUIRED'));
});
test('primitive controls contain positive and negative cases for every type', () => assert.deepEqual(primitiveControls(), { passed: 10, total: 10, status: 'PASS' }));
test('JSON pointer traversal uses own properties and correct escaping', () => {
  const bytes = Buffer.from('{"a/b":{"~key":[false,true]},"__proto__":{"ok":true}}');
  assert.equal(evaluate({ kind: 'jsonEquals', pointer: '/a~1b/~0key/1', value: true }, bytes), 'PASS');
  assert.equal(evaluate({ kind: 'jsonEquals', pointer: '/__proto__/ok', value: true }, bytes), 'PASS');
  assert.equal(evaluate({ kind: 'jsonEquals', pointer: '/constructor', value: true }, bytes), 'POINTER_MISSING');
});
test('candidate malformed JSON and bad UTF-8 cannot pass text checks', () => {
  assert.equal(evaluate({ kind: 'jsonEquals', pointer: '/ready', value: true }, Buffer.from('{')), 'INVALID_JSON');
  assert.equal(evaluate({ kind: 'textIncludes', value: 'ok' }, Buffer.from([0xff])), 'INVALID_UTF8');
});
