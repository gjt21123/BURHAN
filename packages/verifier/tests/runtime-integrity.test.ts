import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { classifyCommandExecution, reduceRuntimeStatuses, sealValidatorPack, verifySealedValidatorPack, type CommandExecution } from "../src/index.js";
import type { ValidatorPackManifest } from "@burhan/core";

const temporary: string[] = [];
afterEach(async () => { await Promise.all(temporary.splice(0).map(dir => rm(dir, { recursive: true, force: true }))); });
const manifest: ValidatorPackManifest = {
  version: 1, contractHash: `sha256:${"a".repeat(64)}`, baselineCommit: "base",
  validators: [{ id: "v", clauseId: "OUT-001", kind: "vitest", evidenceClass: "deterministic", timeoutMs: 1000 }]
};
async function createPack() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "burhan-pin-")); temporary.push(dir);
  await writeFile(path.join(dir, "validator.txt"), "original trusted check");
  return { dir, pin: await sealValidatorPack(dir, manifest) };
}

describe("independently pinned legacy runtime validator packs", () => {
  it("accepts an unchanged pack against its retained hash", async () => {
    const { dir, pin } = await createPack();
    expect(await verifySealedValidatorPack(dir, pin)).toEqual(manifest);
  });
  it("rejects changed validator contents even when the sidecar is recalculated", async () => {
    const { dir, pin } = await createPack();
    await writeFile(path.join(dir, "validator.txt"), "weaker replacement");
    const substituted = await sealValidatorPack(dir, manifest);
    expect(substituted).not.toBe(pin);
    await expect(verifySealedValidatorPack(dir, pin)).rejects.toThrow("mutation");
  });
  it("rejects a replaced contract reference even with a consistent new sidecar", async () => {
    const { dir, pin } = await createPack();
    await sealValidatorPack(dir, { ...manifest, contractHash: `sha256:${"b".repeat(64)}` });
    await expect(verifySealedValidatorPack(dir, pin)).rejects.toThrow("mutation");
  });
  it("rejects a different valid pin and malformed expected pins", async () => {
    const { dir } = await createPack();
    await expect(verifySealedValidatorPack(dir, `sha256:${"0".repeat(64)}`)).rejects.toThrow("mutation");
    for (const pin of ["", "a".repeat(64), "sha256:bad"]) {
      await expect(verifySealedValidatorPack(dir, pin)).rejects.toThrow("Invalid");
    }
  });
  it("preserves the legacy single-argument format without changing old pack hashes", async () => {
    const { dir, pin } = await createPack();
    expect(await verifySealedValidatorPack(dir)).toEqual(manifest);
    expect(await sealValidatorPack(dir, manifest)).toBe(pin);
  });
});

describe("runtime execution verdict reduction", () => {
  it("requires nonempty complete evidence and passes only all-pass checks", () => {
    expect(reduceRuntimeStatuses([])).toBe("incomplete");
    expect(reduceRuntimeStatuses(["pass"])).toBe("verified");
    expect(reduceRuntimeStatuses(["pass", "pass", "pass"])).toBe("verified");
  });
  it("keeps functional rejection distinct from infrastructure interruption", () => {
    expect(reduceRuntimeStatuses(["pass", "fail"])).toBe("rejected");
    expect(reduceRuntimeStatuses(["fail", "blocked"])).toBe("incomplete");
    expect(reduceRuntimeStatuses(["blocked", "fail"])).toBe("incomplete");
  });
  it("fails closed for every unknown status and all permutations of interrupted evidence", () => {
    for (const unknown of [undefined, null, true, 0, "verified", "", {}, []]) {
      expect(reduceRuntimeStatuses(["pass", unknown])).toBe("incomplete");
    }
    for (const a of ["pass", "fail", "blocked"]) for (const b of ["pass", "fail", "blocked"]) {
      const expected = [a, b].includes("blocked") ? "incomplete" : [a, b].includes("fail") ? "rejected" : "verified";
      expect(reduceRuntimeStatuses([a, b])).toBe(expected);
    }
  });
  it("propagates abnormal runner results without accepting an apparent zero exit", () => {
    const normal = { exitCode: 0, signal: null, timedOut: false, outputCapped: false } as CommandExecution;
    for (const interruption of [{ timedOut: true }, { outputCapped: true }, { aborted: true }, { cleanupSucceeded: false }, { failureCode: "INTERRUPTED" }]) {
      expect(reduceRuntimeStatuses(["pass", classifyCommandExecution({ ...normal, ...interruption })])).toBe("incomplete");
    }
  });
});
