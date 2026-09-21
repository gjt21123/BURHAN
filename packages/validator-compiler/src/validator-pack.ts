import { mkdir, readdir, writeFile, lstat, open } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { canonicalJson, sha256, type ProofContract } from "@burhan/core";
import type { ValidatorBlueprint } from "@burhan/codex-runner";
import { trustedCapabilityCompilerVersion } from "./capability-registry.js";
import { lintValidatorBlueprint, type BlueprintLintContext } from "./blueprint-linter.js";

export type CompiledValidator = {
  id: string;
  clauseId: string;
  capabilityId: string;
  relativePath: string;
  sha256: string;
  sizeBytes: number;
  compilerVersion: string;
};
export type ValidatorPackManifest = {
  schemaVersion: "1";
  contractHash: string;
  repositoryBaselineHash: string;
  compilerVersion: string;
  validators: CompiledValidator[];
};
export type CompiledValidatorPack = { packHash: string; manifest: ValidatorPackManifest };

export async function compileTrustedValidatorPack(packPath: string, blueprint: ValidatorBlueprint, context: BlueprintLintContext): Promise<CompiledValidatorPack> {
  const lint = lintValidatorBlueprint(blueprint, context);
  if (!lint.accepted || !lint.blueprint) throw new Error(`Blueprint rejected: ${lint.issues.map((entry) => entry.code).join(",")}`);
  if (lint.blueprint.validators.some(v => !/^[A-Za-z0-9_-]{1,128}$/.test(v.id))) throw new Error("Validator identifier is not a safe pack filename.");
  await mkdir(path.join(packPath, "validators"), { recursive: true });
  const validators: CompiledValidator[] = [];
  for (const validator of lint.blueprint.validators) {
    const relativePath = `validators/${validator.id}.test.ts`;
    const contents = renderTrustedTemplate(validator);
    const bytes = Buffer.from(contents, "utf8");
    await writeFile(path.join(packPath, relativePath), bytes);
    validators.push({ id: validator.id, clauseId: validator.clauseId, capabilityId: validator.capabilityId, relativePath, sha256: sha256(bytes), sizeBytes: bytes.byteLength, compilerVersion: trustedCapabilityCompilerVersion });
  }
  const manifest: ValidatorPackManifest = { schemaVersion: "1", contractHash: context.contractHash, repositoryBaselineHash: context.repositoryBaselineHash, compilerVersion: trustedCapabilityCompilerVersion, validators };
  await writeFile(path.join(packPath, "manifest.json"), `${canonicalJson(manifest)}\n`, "utf8");
  const packHash = sha256(await collectPackBytes(packPath));
  await writeFile(path.join(packPath, "manifest.sha256"), `${packHash}\n`, "utf8");
  return { packHash, manifest };
}

/** Supply a separately retained pin for approval identity. Without one, this only checks consistency. */
export async function verifyTrustedValidatorPack(packPath: string, expectedPackHash?: string): Promise<ValidatorPackManifest> {
  if (expectedPackHash !== undefined && !/^sha256:[a-f0-9]{64}$/.test(expectedPackHash)) throw new Error("Invalid independent validator pack pin.");
  const expectedHash = (await boundedRead(path.join(packPath, "manifest.sha256"), 128)).toString("utf8").trim();
  const actualHash = sha256(await collectPackBytes(packPath));
  if (expectedHash !== actualHash || (expectedPackHash !== undefined && expectedPackHash !== actualHash)) throw new Error("Validator pack mutation detected after sealing.");
  const manifest = JSON.parse((await boundedRead(path.join(packPath, "manifest.json"), 256 * 1024)).toString("utf8")) as ValidatorPackManifest;
  if (manifest.schemaVersion !== "1" || !Array.isArray(manifest.validators) || !manifest.validators.length || manifest.validators.length > 64 ||
      typeof manifest.contractHash !== "string" || typeof manifest.repositoryBaselineHash !== "string" || typeof manifest.compilerVersion !== "string") throw new Error("Invalid validator pack manifest.");
  const expectedFiles = new Set(["manifest.json", "manifest.sha256"]);
  for (const validator of manifest.validators) {
    if (!validator || !/^[A-Za-z0-9_-]{1,128}$/.test(validator.id) || validator.relativePath !== `validators/${validator.id}.test.ts` ||
        expectedFiles.has(validator.relativePath) || !Number.isSafeInteger(validator.sizeBytes) || validator.sizeBytes < 0 || validator.sizeBytes > 1024 * 1024 ||
        !/^sha256:[a-f0-9]{64}$/.test(validator.sha256) || validator.compilerVersion !== manifest.compilerVersion) throw new Error("Invalid validator file binding.");
    const bytes = await boundedRead(path.join(packPath, validator.relativePath), 1024 * 1024);
    if (bytes.length !== validator.sizeBytes || sha256(bytes) !== validator.sha256) throw new Error("Validator file binding mismatch.");
    expectedFiles.add(validator.relativePath);
  }
  const actualFiles = await listFiles(packPath);
  if (actualFiles.length !== expectedFiles.size || actualFiles.some(file => !expectedFiles.has(file))) throw new Error("Unexpected validator pack entry.");
  return manifest;
}

export function requiredClauseCoverage(contract: ProofContract, manifest: ValidatorPackManifest, systemCoveredClauseIds: readonly string[]): boolean {
  const covered = new Set([...manifest.validators.map((validator) => validator.clauseId), ...systemCoveredClauseIds]);
  return contract.clauses.every((clause) => covered.has(clause.id));
}

function renderTrustedTemplate(validator: ValidatorBlueprint["validators"][number]): string {
  const parameters = canonicalJson(validator.parameters);
  const subject = canonicalJson(validator.subject);
  const title = JSON.stringify(`${validator.clauseId} ${validator.capabilityId}`);
  if (validator.capabilityId === "docs.idempotency_header_present") {
    return [
      "import { readFile } from \"node:fs/promises\";",
      "import { expect, it } from \"vitest\";",
      "",
      `const subject = ${subject};`,
      `const parameters = ${parameters};`,
      `it(${title}, async () => {`,
      "  const document = await readFile(String(parameters.documentationPath), \"utf8\");",
      "  for (const term of parameters.requiredTerms as string[]) expect(document).toContain(term);",
      "  expect(subject.modulePath).toBeTruthy();",
      "});",
      "",
    ].join("\n");
  }
  const count = validator.capabilityId === "payment.same_key_concurrency" ? "requestCount" : "keyCount";
  const keys = validator.capabilityId === "payment.same_key_concurrency"
    ? "Array.from({ length: Number(parameters.requestCount) }, () => String(parameters.key))"
    : "parameters.keys as string[]";
  return [
    "import path from \"node:path\";",
    "import { pathToFileURL } from \"node:url\";",
    "import { expect, it } from \"vitest\";",
    "",
    `const subject = ${subject};`,
    `const parameters = ${parameters};`,
    `it(${title}, async () => {`,
    "  const source = (file: string) => pathToFileURL(path.join(process.cwd(), file)).href;",
    "  const { PaymentService } = await import(source(subject.modulePath));",
    "  const { PaymentStore } = await import(source(\"examples/payment-service/src/payment-store.ts\"));",
    "  const store = new PaymentStore();",
    "  const service = new PaymentService(store);",
    `  await Promise.all(${keys}.map((key) => service.charge(key, Number(parameters.amount))));`,
    "  expect(store.countCreated()).toBe(Number(parameters.expectedCharges));",
    `  expect(Number(parameters.${count})).toBeGreaterThan(0);`,
    "});",
    "",
  ].join("\n");
}

async function boundedRead(filename: string, limit: number): Promise<Buffer> {
  const handle = await open(filename, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > limit) throw new Error("Validator pack resource limit.");
    const buffer = Buffer.alloc(info.size + 1);
    let size = 0;
    while (size < buffer.length) {
      const { bytesRead } = await handle.read(buffer, size, buffer.length - size, null);
      if (!bytesRead) break;
      size += bytesRead;
    }
    if (size !== info.size) throw new Error("Validator file changed during read.");
    return buffer.subarray(0, size);
  } finally { await handle.close(); }
}

async function collectPackBytes(packPath: string): Promise<Buffer> {
  const names = await listFiles(packPath);
  const chunks: Buffer[] = [];
  let total = 0;
  for (const name of names.filter((file) => file !== "manifest.sha256")) {
    const bytes = await boundedRead(path.join(packPath, name), 1024 * 1024);
    total += Buffer.byteLength(name) + bytes.length;
    if (total > 16 * 1024 * 1024) throw new Error("Validator pack resource limit.");
    // Retain historical byte serialization; strict per-file bindings above prevent
    // substituting a different file partition while preserving aggregate bytes.
    chunks.push(Buffer.from(name)); chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}

async function listFiles(rootPath: string, currentPath = rootPath, depth = 0): Promise<string[]> {
  if (depth > 4 || !(await lstat(currentPath)).isDirectory()) throw new Error("Unsafe validator pack directory.");
  const entries = await readdir(currentPath, { withFileTypes: true });
  if (entries.length > 128) throw new Error("Validator pack entry limit.");
  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(currentPath, entry.name);
    if (entry.isSymbolicLink()) throw new Error("Unsafe validator pack link.");
    if (entry.isDirectory()) files.push(...await listFiles(rootPath, entryPath, depth + 1));
    else if (entry.isFile()) files.push(path.relative(rootPath, entryPath).replaceAll("\\", "/"));
    else throw new Error("Unsafe validator pack entry.");
    if (files.length > 128) throw new Error("Validator pack entry limit.");
  }
  return files.sort();
}
