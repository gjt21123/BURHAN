import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
// These packages are private workspaces. Reuse the reviewed backend, not another
// ad-hoc process runner; no new runtime package or distribution is introduced here.
import { runLocalCommand, classifyCommandExecution } from "../../verifier/src/runner.js";
import { digest, judgeObservation, parseProbeOutput, readBoundedFile, referenceFile,
  validateProbeRequest, REFERENCE_PROTOCOL, REFERENCE_PROFILE } from "./reference-protocol.mjs";

export type ReferenceProbe = { modulePath: string; exportName: string; keys: string[]; amount: number; sequential?: boolean };
export type ProbeResult = {
  status: "pass" | "fail" | "blocked";
  code: string | null;
  workerHash: string;
  observationHash: string | null;
  observed: { created: number; completed: number; matchingResults: number; distinctCreatedKeys: number } | null;
  execution: { exitCode: number | null; timedOut: boolean; outputCapped: boolean; aborted: boolean; cleanupSucceeded: boolean };
};
export type ProbeOptions = { timeoutMs?: number; signal?: AbortSignal };
const worker = fileURLToPath(new URL("./reference-worker.mjs", import.meta.url));
const support = fileURLToPath(new URL("./reference-protocol.mjs", import.meta.url));
const config = fileURLToPath(new URL("./reference-runtime.tsconfig.json", import.meta.url));
const require = createRequire(import.meta.url);

export async function referenceHarnessHash(): Promise<string> {
  const files = await Promise.all([worker, support, config].map(filename => readBoundedFile(filename, 64 * 1024)));
  // Names/lengths remove concatenation ambiguity; this binds runtime implementation,
  // not the historical compiler's independently retained validator-pack hash.
  return digest(JSON.stringify(files.map((bytes, index) => ({ index, bytes: bytes.length, sha256: digest(bytes) }))));
}

export async function runReferenceProbe(cwd: string, probe: ReferenceProbe, options: ProbeOptions = {}): Promise<ProbeResult> {
  const nonce = randomBytes(32).toString("hex");
  const request = validateProbeRequest({ protocol: REFERENCE_PROTOCOL, nonce, ...probe, sequential: probe.sequential ?? false });
  const timeoutMs = options.timeoutMs ?? 10_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 10_000) throw new Error("REFERENCE_TIMEOUT_INVALID");
  // Resolve all candidate input paths before launching the worker. No imports here.
  await referenceFile(cwd, request.modulePath);
  const workerHash = await referenceHarnessHash();
  const stage = await mkdtemp(path.join(tmpdir(), "burhan-reference-probe-"));
  try {
    const requestFile = path.join(stage, `request-${randomBytes(16).toString("hex")}.json`);
    await writeFile(requestFile, JSON.stringify(request), { flag: "wx", mode: 0o600 });
    const result = await runLocalCommand({ executableId: "node",
      args: [require.resolve("tsx/cli"), "--tsconfig", config, worker, requestFile],
      timeoutMs, maxOutputBytes: 64 * 1024 }, cwd, stage, { signal: options.signal });
    const execution = { exitCode: result.exitCode, timedOut: result.timedOut, outputCapped: result.outputCapped,
      aborted: result.aborted === true, cleanupSucceeded: result.cleanupSucceeded === true };
    const blocked = (code: string): ProbeResult => ({ status: "blocked", code, workerHash, observationHash: null, observed: null, execution });
    if (await referenceHarnessHash() !== workerHash) return blocked("REFERENCE_HARNESS_MUTATED");
    // Even a zero exit is insufficient: require complete, nonce-bound measurement.
    if (classifyCommandExecution(result) !== "pass") return blocked(result.failureCode ?? "REFERENCE_EXECUTION_INTERRUPTED");
    let frame;
    try { frame = parseProbeOutput(result.stdout, nonce); } catch { return blocked("REFERENCE_PROTOCOL_INVALID"); }
    if (frame.error) return { status: frame.error === "SUBJECT_THREW" ? "fail" : "blocked", code: frame.error, workerHash, observationHash: null, observed: null, execution };
    if (!frame.observation) return blocked("REFERENCE_OBSERVATION_MISSING");
    return { status: judgeObservation(frame.observation, request.keys, request.amount) ? "pass" : "fail", code: null,
      workerHash, observationHash: digest(JSON.stringify(frame.observation)), observed: { created: frame.observation.created, completed: frame.observation.completed, matchingResults: frame.observation.matchingResults, distinctCreatedKeys: new Set(frame.observation.createdKeys).size }, execution };
  } finally { await rm(stage, { recursive: true, force: true }); }
}

const POSITIVE = `export class Control {
  constructor(store) { this.store = store; this.pending = new Map(); }
  async charge(key, amount) {
    const old = await this.store.findByKey(key); if (old) return old;
    if (this.pending.has(key)) return this.pending.get(key);
    const operation = this.store.create(key, amount); this.pending.set(key, operation);
    try { return await operation; } finally { this.pending.delete(key); }
  }
}`;
const ALWAYS_CREATE = `export class Control { constructor(store) { this.store = store; } async charge(key, amount) { return this.store.create(key, amount); } }`;
const COALESCE_KEYS = `export class Control { constructor(store) { this.store = store; } async charge(key, amount) { if (!this.first) this.first = this.store.create('wrong-key', amount); return this.first; } }`;
const qualification = new Map<string, Promise<{ passed: boolean; hash: string }>>();

/** Positive/negative controls run through the same worker + parent comparison. */
export async function qualifyReferenceProbe(probe: ReferenceProbe): Promise<{ passed: boolean; hash: string }> {
  const workerHash = await referenceHarnessHash();
  const identity = digest(JSON.stringify({ workerHash, keys: probe.keys, amount: probe.amount, sequential: probe.sequential ?? false }));
  if (!qualification.has(identity)) {
    if (qualification.size >= 64) qualification.clear();
    qualification.set(identity, (async () => {
      const directory = await mkdtemp(path.join(tmpdir(), "burhan-reference-controls-"));
      try {
        await writeFile(path.join(directory, "positive.mjs"), POSITIVE, { flag: "wx" });
        await writeFile(path.join(directory, "negative.mjs"), new Set(probe.keys).size < probe.keys.length ? ALWAYS_CREATE : COALESCE_KEYS, { flag: "wx" });
        const positive = await runReferenceProbe(directory, { ...probe, modulePath: "positive.mjs", exportName: "Control" });
        const negative = await runReferenceProbe(directory, { ...probe, modulePath: "negative.mjs", exportName: "Control" });
        const passed = positive.status === "pass" && negative.status === "fail" && positive.code === null && negative.code === null && positive.workerHash === workerHash && negative.workerHash === workerHash;
        return Object.freeze({ passed, hash: digest(JSON.stringify({ profile: REFERENCE_PROFILE, identity, positive, negative })) });
      } finally { await rm(directory, { recursive: true, force: true }); }
    })());
  }
  return qualification.get(identity)!;
}
