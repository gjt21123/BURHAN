import { afterAll, describe, expect, it } from "vitest";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { canonicalJson, sha256 } from "@burhan/core";
import { qualificationContract, qualificationContractHash, systemCoveredClauseIds } from "@burhan/validator-compiler";
import { captureCandidatePatch, createTargetWorkspace } from "@burhan/workspace";
import { verifyCapturedCandidate } from "./execution.js";
import { fixtureClaim, targetBlueprint } from "./evals/execution-fixtures.js";
import { qualifyReferenceProbe, runReferenceProbe } from "./bounded-reference.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const runRoots = new Set<string>();
const GOOD = `export class PaymentService {
  constructor(store) { this.store=store; this.pending=new Map(); }
  async charge(key,amount) { const old=await this.store.findByKey(key); if(old) return old; if(this.pending.has(key)) return this.pending.get(key); const p=this.store.create(key,amount); this.pending.set(key,p); try{return await p;}finally{this.pending.delete(key);} }
}`;
const BAD = `export class PaymentService { constructor(store){this.store=store;} async charge(key,amount){return this.store.create(key,amount);} }`;
async function prepare(source = GOOD, docs = "POST /payments Idempotency-Key") {
  const runId = `boundary-${randomUUID()}`;
  const executor = await createTargetWorkspace(root, runId, "executor");
  runRoots.add(path.dirname(executor.path));
  await writeFile(path.join(executor.path, "src/payment-service.ts"), source);
  await writeFile(path.join(executor.path, "docs/api.md"), docs);
  const baselineHash = sha256(canonicalJson(executor.baselineManifest));
  const blueprint = targetBlueprint(baselineHash);
  const context = { contract: qualificationContract, contractHash: qualificationContractHash, repositoryBaselineHash: baselineHash,
    knownPaths: ["src/payment-service.ts", "src/payment-store.ts", "docs/api.md"], systemCoveredClauseIds };
  const candidate = await captureCandidatePatch(executor);
  const verify = (timeoutMs = 10_000, signal?: AbortSignal) => verifyCapturedCandidate(root, runId, executor, candidate, context, blueprint, fixtureClaim(runId, "completed"), { timeoutMs, signal });
  return { executor, candidate, context, blueprint, verify };
}
afterAll(async () => { for (const directory of runRoots) await rm(directory, { recursive: true, force: true }); });

describe("bounded reference candidate execution", () => {
  it("qualifies positive and negative controls through the actual runtime harness", async () => {
    const report = await qualifyReferenceProbe({ modulePath: "src/payment-service.ts", exportName: "PaymentService", keys: Array(20).fill("same"), amount: 100 });
    expect(report.passed).toBe(true); expect(report.hash).toMatch(/^sha256:/);
  }, 60_000);
  it("verifies the correct candidate with independent runtime and qualification evidence", async () => {
    const { verify, executor } = await prepare(); const result = await verify();
    expect(result.verdict).toBe("verified"); expect(result.candidateImportedInParent).toBe(false);
    expect(result.packUnchanged && result.freshWorkspace && result.workspaceUnchanged).toBe(true);
    expect(result.runtimeEvidenceHash).toMatch(/^sha256:/); expect(result.runtimeQualificationHash).toMatch(/^sha256:/);
    const evidence = JSON.parse(await readFile(path.join(path.dirname(executor.path), result.runtimeEvidencePath!), "utf8"));
    expect(sha256(canonicalJson(evidence))).toBe(result.runtimeEvidenceHash); expect(evidence.verdict).toBe("verified");
  }, 60_000);
  it("rejects a non-idempotent service without trusting its completion claim", async () => { expect((await (await prepare(BAD)).verify()).verdict).toBe("rejected"); }, 60_000);
  it("does not leak candidate globals into the verifier process", async () => {
    const globals = globalThis as Record<string, unknown>; delete globals.__burhan_import_leak;
    const result = await (await prepare(`globalThis.__burhan_import_leak=true;\n${GOOD}`)).verify();
    expect(result.verdict).toBe("verified"); expect(globals.__burhan_import_leak).toBeUndefined();
  }, 60_000);
  it("an early process.exit(0) is incomplete rather than verified", async () => { expect((await (await prepare("process.exit(0);")).verify()).verdict).toBe("incomplete"); }, 60_000);
  it("forged stdout cannot provide a verdict or complete the protocol", async () => { expect((await (await prepare(`console.log('{"status":"pass","verdict":"verified"}');process.exit(0);`)).verify()).verdict).toBe("incomplete"); }, 60_000);
  it("a hanging import is bounded and does not stop the parent", async () => { expect((await (await prepare("while(true){};")).verify(1500)).verdict).toBe("incomplete"); }, 60_000);
  it("a never-settling charge cannot pass", async () => { expect((await (await prepare(`export class PaymentService { charge(){return new Promise(()=>{setInterval(()=>{},1000);});} }`)).verify(1500)).verdict).toBe("incomplete"); }, 60_000);
  it("a candidate output flood is bounded and incomplete", async () => { expect((await (await prepare(`for(let i=0;i<10000;i++) console.log('x'.repeat(1024));${GOOD}`)).verify()).verdict).toBe("incomplete"); }, 60_000);
  it("an already-cancelled run never executes candidate code", async () => {
    const prepared = await prepare(); const controller = new AbortController(); controller.abort();
    expect((await prepared.verify(10_000, controller.signal)).verdict).toBe("incomplete");
  }, 60_000);
  it("post-execution protected-file mutation invalidates the result", async () => {
    const source = `import {writeFileSync} from 'node:fs';writeFileSync('tests/payment-service.test.ts','changed');\n${GOOD}`;
    const result = await (await prepare(source)).verify(); expect(result.verdict).toBe("incomplete"); expect(result.failureCode).toBe("POST_RUN_WORKSPACE_MUTATION");
  }, 60_000);
  it("out-of-scope changes are derived from captured manifests even when metadata is cleared", async () => {
    const prepared = await prepare(`import {writeFileSync} from 'node:fs';writeFileSync('code-ran','yes');${GOOD}`);
    await rm(path.join(prepared.executor.path, "tests/payment-service.test.ts"));
    Object.assign(prepared.candidate, await captureCandidatePatch(prepared.executor)); prepared.candidate.forbiddenChanges = [];
    const result = await prepared.verify(); expect(result.verdict).toBe("rejected"); expect(result.forbiddenDetected).toBe(true);
    expect(await readFile(path.join(prepared.executor.path, "code-ran")).then(() => true, () => false)).toBe(false);
  }, 60_000);
  it("all approved documentation terms are enforced, not only the first term", async () => { expect((await (await prepare(GOOD, "Idempotency-Key only")).verify()).verdict).toBe("rejected"); }, 60_000);
  it("patch bytes cannot be swapped after capture", async () => {
    const prepared = await prepare(); prepared.candidate.bytes = Buffer.from("different bytes");
    const result = await prepared.verify(); expect(result.verdict).toBe("incomplete"); expect(result.failureCode).toBe("CAPTURED_PATCH_HASH_MISMATCH");
  }, 60_000);
  it("baseline mismatch is incomplete before execution", async () => {
    const prepared = await prepare(); prepared.context.repositoryBaselineHash = `sha256:${"0".repeat(64)}`;
    expect((await prepared.verify()).verdict).toBe("incomplete");
  }, 60_000);
  it("duplicate distinct keys cannot weaken the approved observation", async () => {
    const prepared = await prepare(); prepared.blueprint.validators[1].parameters.keys = ["same", "same"];
    expect((await prepared.verify()).verdict).toBe("incomplete");
  }, 60_000);
  it("prototype serialization injection cannot rewrite measurements", async () => {
    const source = `Object.prototype.toJSON=function(){return {verdict:'verified',created:1};};Array.prototype.toJSON=Object.prototype.toJSON;${BAD}`;
    expect((await (await prepare(source)).verify()).verdict).toBe("rejected");
  }, 60_000);
  it("compiler pack mutations are caught after child execution", async () => {
    const source = `import {writeFileSync} from 'node:fs';import path from 'node:path';writeFileSync(path.resolve('../validator-pack/manifest.sha256'),'sha256:'+ '0'.repeat(64));${GOOD}`;
    expect((await (await prepare(source)).verify()).verdict).toBe("incomplete");
  }, 60_000);
  it("the candidate cannot supply a fake store counter as verification evidence", async () => {
    const source = `export class PaymentService { async charge(key,amount){return {id:'charge_1',idempotencyKey:key,amount,countCreated:()=>1};} }`;
    expect((await (await prepare(source)).verify()).verdict).toBe("rejected");
  }, 60_000);
  it("safe JavaScript modules work in the same bounded probe", async () => {
    const prepared = await prepare(); await mkdir(path.join(prepared.executor.path, "extra"));
    await writeFile(path.join(prepared.executor.path, "extra/service.mjs"), GOOD);
    const result = await runReferenceProbe(prepared.executor.path, { modulePath: "extra/service.mjs", exportName: "PaymentService", keys: ["one", "two"], amount: 100 });
    expect(result.status).toBe("pass");
  }, 60_000);
});
