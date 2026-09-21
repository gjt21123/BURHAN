import { readBoundedFile, referenceFile, validateProbeRequest, REFERENCE_PROTOCOL } from './reference-protocol.mjs';
import { lstat, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { writeSync } from 'node:fs';
import path from 'node:path';

// Capture reporting primitives and measurement state before loading candidate code.
const emit = writeSync;
const make = Object.create;
const assign = Object.assign;
const safeInteger = Number.isSafeInteger;
const primitiveString = String;
const stringify = JSON.stringify.bind(JSON);
const all = Promise.all.bind(Promise);
const freeze = Object.freeze;
const own = Object.hasOwn;
let request;
try {
  const filename = process.argv[2];
  if (typeof filename !== 'string' || !path.isAbsolute(filename) || !/^request-[a-f0-9]{32}\.json$/.test(path.basename(filename)) ||
      !(await lstat(filename)).isFile() || (await lstat(filename)).isSymbolicLink()) throw new Error('invalid input');
  request = validateProbeRequest(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await readBoundedFile(filename, 32 * 1024))));
  // Consume the run challenge before importing the subject. It is never in argv,
  // environment, a candidate file, or a retained report/qualification artifact.
  await unlink(filename);
} catch { process.exitCode = 2; }

if (request) {
  const { nonce, modulePath, exportName, amount, sequential } = request;
  const keys = freeze([...request.keys]);
  request = null;
  process.argv.splice(2);
  const created = make(null), results = make(null);
  let completed = 0, createdCount = 0;
  const store = freeze(assign(make(null), {
    findByKey: async key => {
      for (let i = createdCount - 1; i >= 0; i--) if (created[i].idempotencyKey === key) return created[i];
      return undefined;
    },
    create: async (key, amountValue) => {
      if (typeof key !== 'string' || key.length > 128 || !safeInteger(amountValue) || amountValue < 0 || createdCount >= 1024) throw new Error('invalid store call');
      const value = freeze(assign(make(null), { id: `charge_${createdCount + 1}`, idempotencyKey: key, amount: amountValue }));
      created[createdCount++] = value;
      return value;
    }
  }));
  let error = null, observation = null, Subject;
  try {
    const filename = await referenceFile(process.cwd(), modulePath);
    const imported = await import(pathToFileURL(filename).href);
    Subject = own(imported, exportName) ? imported[exportName] : null;
  } catch { error = 'SUBJECT_IMPORT_FAILED'; }
  if (!error && typeof Subject !== 'function') error = 'SUBJECT_INVALID';
  if (!error) {
    try {
      const service = new Subject(store);
      if (!service || typeof service.charge !== 'function') throw new Error('missing method');
      const execute = async (key, index) => { results[index] = await service.charge(key, amount); completed++; };
      if (sequential) { for (let i = 0; i < keys.length; i++) await execute(keys[i], i); }
      else { const calls = []; for (let i = 0; i < keys.length; i++) calls[i] = execute(keys[i], i); await all(calls); }
      let matchingResults = 0;
      for (let i = 0; i < keys.length; i++) {
        const response = results[i];
        if (response && typeof response === 'object') {
          for (let j = 0; j < createdCount; j++) {
            const value = created[j];
            if (response.id === value.id && response.idempotencyKey === keys[i] && value.idempotencyKey === keys[i] &&
                response.amount === amount && value.amount === amount) { matchingResults++; break; }
          }
        }
      }
      const createdKeys = make(null), createdAmounts = make(null);
      for (let i = 0; i < createdCount; i++) { createdKeys[i] = created[i].idempotencyKey; createdAmounts[i] = created[i].amount; }
      observation = { created: createdCount, completed, createdKeys, createdAmounts, matchingResults };
    } catch { error = 'SUBJECT_THREW'; }
  }
  // This is observed data, never a child-authored verdict. Parent owns comparison.
  // Never hand an object/array to JSON.stringify after importing a candidate:
  // inherited toJSON hooks or stream monkeypatches must not rewrite observations.
  const list = (values, count) => {
    let out = '[';
    for (let i = 0; i < count; i++) out += (i ? ',' : '') + stringify(values[i]);
    return out + ']';
  };
  let data = 'null';
  if (observation) data = '{"created":' + primitiveString(observation.created) +
    ',"completed":' + primitiveString(observation.completed) + ',"createdKeys":' + list(observation.createdKeys, observation.created) +
    ',"createdAmounts":' + list(observation.createdAmounts, observation.created) + ',"matchingResults":' + primitiveString(observation.matchingResults) + '}';
  const frame = '{"protocol":' + stringify(REFERENCE_PROTOCOL) + ',"nonce":' + stringify(nonce) + ',"observation":' + data + ',"error":' + stringify(error) + '}\n';
  // Captured fs.writeSync bypasses candidate changes to process.stdout._write.
  emit(1, frame);
}
