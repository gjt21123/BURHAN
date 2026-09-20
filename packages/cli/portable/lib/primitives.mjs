import { BurhanError, canonical, parseJson, sha256, text } from './common.mjs';
import { pointerTokens } from './contract.mjs';

/** Static predicates only. No candidate modules, scripts, filters or regex are executed. */
export function evaluate(check, bytes) {
  if (check.kind === 'exists') return bytes === null ? 'FILE_MISSING' : 'PASS';
  if (check.kind === 'absent') return bytes === null ? 'PASS' : 'FILE_PRESENT';
  if (bytes === null) return 'FILE_MISSING';
  try {
    if (check.kind === 'sha256') return sha256(bytes) === check.value ? 'PASS' : 'HASH_MISMATCH';
    if (check.kind === 'textIncludes') return text(bytes).includes(check.value) ? 'PASS' : 'TEXT_MISSING';
    if (check.kind === 'jsonEquals') {
      let value = parseJson(bytes);
      for (const token of pointerTokens(check.pointer)) {
        if (value === null || typeof value !== 'object' || (Array.isArray(value) && !/^(?:0|[1-9]\d*)$/.test(token)) || !Object.hasOwn(value, token)) return 'POINTER_MISSING';
        value = value[token];
      }
      return canonical(value) === canonical(check.value) ? 'PASS' : 'VALUE_MISMATCH';
    }
    return 'CHECK_UNSUPPORTED';
  } catch (error) {
    if (error instanceof BurhanError) return error.code;
    throw error;
  }
}
/** Positive and negative controls test template behavior, not semantic adequacy of a task. */
export function primitiveControls() {
  const bytes = Buffer.from('qualification');
  const cases = [
    [{ kind: 'exists' }, bytes, true], [{ kind: 'exists' }, null, false],
    [{ kind: 'absent' }, null, true], [{ kind: 'absent' }, bytes, false],
    [{ kind: 'sha256', value: sha256(bytes) }, bytes, true], [{ kind: 'sha256', value: sha256(bytes) }, Buffer.from('different'), false],
    [{ kind: 'textIncludes', value: 'qualification' }, bytes, true], [{ kind: 'textIncludes', value: 'qualification' }, Buffer.from(''), false],
    [{ kind: 'jsonEquals', pointer: '/nested/value', value: true }, Buffer.from('{"nested":{"value":true}}'), true],
    [{ kind: 'jsonEquals', pointer: '/nested/value', value: true }, Buffer.from('{"nested":{"value":false}}'), false]
  ];
  const passed = cases.filter(([check, value, expected]) => (evaluate(check, value) === 'PASS') === expected).length;
  return { passed, total: cases.length, status: passed === cases.length ? 'PASS' : 'FAIL' };
}
