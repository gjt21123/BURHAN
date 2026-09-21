import { describe, it, expect } from "vitest";
import { mkdtemp, readFile, readdir, rm, writeFile, symlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { sha256, canonicalJson } from "@burhan/core";
import { compileTrustedValidatorPack, verifyTrustedValidatorPack } from "./validator-pack.js";
import { qualificationLintContext, validValidatorBlueprint } from "./fixtures.js";
async function stage(work: (directory: string, hash: string) => Promise<void>) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "burhan-pack-pin-"));
  try { const compiled = await compileTrustedValidatorPack(directory, validValidatorBlueprint(), qualificationLintContext()); await work(directory, compiled.packHash); }
  finally { await rm(directory, { recursive: true, force: true }); }
}
async function rewriteSidecar(directory: string) {
  const files = ["manifest.json", ...(await readdir(path.join(directory, "validators"))).map(name => `validators/${name}`)].sort();
  const chunks: Buffer[] = [];
  for (const name of files) chunks.push(Buffer.from(name), await readFile(path.join(directory, name)));
  await writeFile(path.join(directory, "manifest.sha256"), `${sha256(Buffer.concat(chunks))}\n`);
}
describe("compiler pack independent pins", () => {
  it("accepts a valid original pin while preserving legacy consistency reads", async () => stage(async (directory, hash) => {
    expect((await verifyTrustedValidatorPack(directory, hash)).validators).toHaveLength(3);
    expect((await verifyTrustedValidatorPack(directory)).validators).toHaveLength(3);
  }));
  it("recomputed sidecars cannot replace a separately retained pin", async () => stage(async (directory, hash) => {
    const manifestFile = path.join(directory, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
    manifest.contractHash = `sha256:${"0".repeat(64)}`;
    await writeFile(manifestFile, canonicalJson(manifest)); await rewriteSidecar(directory);
    await expect(verifyTrustedValidatorPack(directory, hash)).rejects.toThrow("mutation");
    expect((await verifyTrustedValidatorPack(directory)).contractHash).toBe(manifest.contractHash);
  }));
  it("each validator file is bound to its own size and content hash", async () => stage(async (directory) => {
    const manifest = await verifyTrustedValidatorPack(directory);
    await writeFile(path.join(directory, manifest.validators[0].relativePath), "changed"); await rewriteSidecar(directory);
    await expect(verifyTrustedValidatorPack(directory)).rejects.toThrow("binding");
  }));
  it("invalid independent pins fail closed", async () => stage(async (directory) => {
    await expect(verifyTrustedValidatorPack(directory, "")).rejects.toThrow("pin");
    await expect(verifyTrustedValidatorPack(directory, "sha256:fake")).rejects.toThrow("pin");
  }));
  it("symlinked or junction directories cannot hide extra pack contents", async () => stage(async (directory, hash) => {
    const external = await mkdtemp(path.join(os.tmpdir(), "burhan-external-"));
    try { await writeFile(path.join(external, "secret"), "not pack source"); await symlink(external, path.join(directory, "linked"), process.platform === "win32" ? "junction" : "dir"); await expect(verifyTrustedValidatorPack(directory, hash)).rejects.toThrow("link"); }
    finally { await rm(external, { recursive: true, force: true }); }
  }));
  it("unbounded files cannot be read as validator artifacts", async () => stage(async (directory, hash) => {
    await writeFile(path.join(directory, "large"), Buffer.alloc(1024 * 1024 + 1));
    await expect(verifyTrustedValidatorPack(directory, hash)).rejects.toThrow("limit");
  }));
});
