import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
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

export async function verifyTrustedValidatorPack(packPath: string): Promise<ValidatorPackManifest> {
  const expectedHash = (await readFile(path.join(packPath, "manifest.sha256"), "utf8")).trim();
  const actualHash = sha256(await collectPackBytes(packPath));
  if (expectedHash !== actualHash) throw new Error("Validator pack mutation detected after sealing.");
  return JSON.parse(await readFile(path.join(packPath, "manifest.json"), "utf8")) as ValidatorPackManifest;
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

async function collectPackBytes(packPath: string): Promise<Buffer> {
  const names = await listFiles(packPath);
  const chunks: Buffer[] = [];
  for (const name of names.filter((file) => file !== "manifest.sha256")) {
    chunks.push(Buffer.from(name));
    chunks.push(await readFile(path.join(packPath, name)));
  }
  return Buffer.concat(chunks);
}

async function listFiles(rootPath: string, currentPath = rootPath): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(currentPath, { withFileTypes: true })) {
    const entryPath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(rootPath, entryPath));
    if (entry.isFile()) files.push(path.relative(rootPath, entryPath).replaceAll("\\", "/"));
  }
  return files.sort();
}
