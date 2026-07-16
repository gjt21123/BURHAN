import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { canonicalJson, sha256, type ProofContract } from "@burhan/core";
import { createBaselineManifest, createIndependentClone, createRunDirectory } from "@burhan/workspace";
import { appendEvidence, runWindowsLocalCommand, sealValidatorPack, verifyReceipt, verifyReceiptWithEvidence, verifySealedValidatorPack } from "@burhan/verifier";

const [command, ...args] = process.argv.slice(2);

if (command === "receipt" && args[0] === "verify" && args[1]) {
  const evidenceFlag = args.indexOf("--evidence");
  const valid = evidenceFlag >= 0 && args[evidenceFlag + 1]
    ? await verifyReceiptWithEvidence(path.resolve(args[1]), path.resolve(args[evidenceFlag + 1]))
    : await verifyReceipt(path.resolve(args[1]));
  console.log(valid ? "Receipt verification: PASS" : "Receipt verification: FAIL");
  process.exitCode = valid ? 0 : 1;
} else if (command === "eval") {
  await runEvaluation();
} else {
  console.error("Usage: burhan receipt verify <receipt.json> | burhan eval");
  process.exitCode = 1;
}

async function runEvaluation(): Promise<void> {
  const cases = ["correct", "sequential-only", "delete-tests", "forbidden-migration", "fake-evidence"];
  const actual = new Map<string, string>();
  for (const caseId of cases) actual.set(caseId, await evaluateCase(caseId));
  const tamperResult = await evaluateCase("correct", true);
  const accepted = actual.get("correct") === "verified" ? 1 : 0;
  const rejected = [...actual.entries()].filter(([caseId, verdict]) => caseId !== "correct" && verdict === "rejected").length;
  const passed = accepted === 1 && rejected === 4 && tamperResult === "incomplete";
  console.log("BURHAN EVALUATION\n");
  console.log("Functional cases:       5");
  console.log(`Valid accepted:         ${accepted} / 1`);
  console.log(`Invalid rejected:       ${rejected} / 4`);
  console.log(`False accepts:          ${4 - rejected}`);
  console.log(`False rejects:          ${1 - accepted}\n`);
  console.log("Integrity cases:        1");
  console.log(`Tampering detected:     ${tamperResult === "incomplete" ? 1 : 0} / 1\n`);
  console.log("Execution assurance:    LOCAL TRUSTED");
  console.log(`Result:                 ${passed ? "PASS" : "FAIL"}`);
  process.exitCode = passed ? 0 : 1;
}

async function evaluateCase(caseId: string, tamper = false): Promise<string> {
  const repositoryRoot = (await run("git", ["rev-parse", "--show-toplevel"], process.cwd())).stdout.trim();
  const baselineCommit = (await run("git", ["rev-parse", "milestone-1"], repositoryRoot)).stdout.trim();
  const runId = `eval-${caseId}-${crypto.randomUUID().slice(0, 8)}`;
  const runPath = await createRunDirectory(repositoryRoot, { runId, baselineCommit });
  const workspacePath = await createIndependentClone(repositoryRoot, runId, baselineCommit);
  const baseline = await createBaselineManifest(workspacePath);
  const contract = contractForEval();
  const contractHash = sha256(canonicalJson(contract));
  await writeFile(path.join(runPath, "contract", "contract.json"), `${canonicalJson(contract)}\n`);
  await writeFile(path.join(runPath, "baseline", "manifest.json"), `${canonicalJson(baseline)}\n`);
  const packPath = path.join(runPath, "validator-pack");
  await mkdir(path.join(packPath, "tests"), { recursive: true });
  await writeValidators(packPath);
  const packHash = await sealValidatorPack(packPath, { version: 1, contractHash, baselineCommit, validators: validatorManifest() });
  if (tamper) await writeFile(path.join(packPath, "tests", "out-001.mts"), "throw new Error('tampered');\n");
  try { await verifySealedValidatorPack(packPath); } catch { return "incomplete"; }
  await run("git", ["apply", path.join(repositoryRoot, "evals", "cases", caseId, "candidate.patch")], workspacePath);
  const after = await createBaselineManifest(workspacePath);
  const policyViolation = detectProtectedChanges(baseline.files, after.files);
  const evidencePath = path.join(runPath, "evidence");
  let previousEvidenceHash: string | null = null;
  const statuses: Record<string, boolean> = {};
  for (const validator of validatorManifest()) {
    const validatorPath = path.join(packPath, "tests", `${validator.id.toLowerCase()}.mts`);
    const temporaryPath = path.join(workspacePath, ".burhan-tmp");
    await mkdir(temporaryPath, { recursive: true });
    const execution = await runWindowsLocalCommand({ executableId: "node", args: [path.join(repositoryRoot, "node_modules", "tsx", "dist", "cli.mjs"), validatorPath], timeoutMs: 15_000, maxOutputBytes: 256_000 }, workspacePath, temporaryPath);
    const status = execution.exitCode === 0 && !execution.timedOut && !execution.outputCapped;
    statuses[validator.clauseId] = status;
    const record = await appendEvidence(evidencePath, { id: `${validator.id}-evidence`, runId, clauseId: validator.clauseId, validatorId: validator.id, producer: "burhan-verifier", evidenceClass: "deterministic", assurance: "proven", status: status ? "pass" : execution.timedOut ? "blocked" : "fail", execution: { executable: execution.executable, args: execution.args, exitCode: execution.exitCode, signal: execution.signal, timedOut: execution.timedOut, startedAt: execution.startedAt, completedAt: execution.completedAt } }, previousEvidenceHash);
    previousEvidenceHash = record.evidenceHash;
  }
  if (policyViolation) return "rejected";
  return Object.values(statuses).every(Boolean) ? "verified" : "rejected";
}

function contractForEval(): ProofContract {
  return { id: "payment-contract", version: 1, title: "Payment retry idempotency", goal: "Retries create one charge.", scope: { allowedPaths: ["examples/payment-service/src/**", "examples/payment-service/docs/**"], forbiddenPaths: ["examples/payment-service/db/migrations/**", "examples/payment-service/tests/**", "package.json", "package-lock.json"], networkAccess: "disabled", maxRepairAttempts: 0 }, clauses: [
    { id: "OUT-001", type: "outcome", statement: "Concurrent retries create one charge.", severity: "critical", evidenceStrategy: { mode: "test", evidenceClass: "deterministic", requiredAssurance: "proven" } },
    { id: "OUT-002", type: "outcome", statement: "Distinct keys remain independent.", severity: "high", evidenceStrategy: { mode: "test", evidenceClass: "deterministic", requiredAssurance: "proven" } },
    { id: "DOC-001", type: "documentation", statement: "Documentation names Idempotency-Key.", severity: "high", evidenceStrategy: { mode: "static_analysis", evidenceClass: "deterministic", requiredAssurance: "proven" } },
  ], assumptions: [], ambiguities: [] };
}

function validatorManifest() {
  return [
    { id: "OUT-001", clauseId: "OUT-001", kind: "vitest" as const, evidenceClass: "deterministic" as const, timeoutMs: 15_000 },
    { id: "OUT-002", clauseId: "OUT-002", kind: "vitest" as const, evidenceClass: "deterministic" as const, timeoutMs: 15_000 },
    { id: "DOC-001", clauseId: "DOC-001", kind: "structural_document_check" as const, evidenceClass: "deterministic" as const, timeoutMs: 15_000 },
  ];
}

async function writeValidators(packPath: string): Promise<void> {
  const testRoot = path.join(packPath, "tests");
  const imports = `import { pathToFileURL } from "node:url";\nimport path from "node:path";\nconst source = (name: string) => pathToFileURL(path.join(process.cwd(), "examples", "payment-service", "src", name)).href;\n`;
  await writeFile(path.join(testRoot, "out-001.mts"), `${imports}const { PaymentService } = await import(source("payment-service.ts")); const { PaymentStore } = await import(source("payment-store.ts")); const store = new PaymentStore(); const service = new PaymentService(store); await Promise.all(Array.from({ length: 20 }, () => service.charge("same", 100))); if (store.countCreated() !== 1) process.exit(1);\n`);
  await writeFile(path.join(testRoot, "out-002.mts"), `${imports}const { PaymentService } = await import(source("payment-service.ts")); const { PaymentStore } = await import(source("payment-store.ts")); const store = new PaymentStore(); const service = new PaymentService(store); await Promise.all([service.charge("one", 1), service.charge("two", 1)]); if (store.countCreated() !== 2) process.exit(1);\n`);
  await writeFile(path.join(testRoot, "doc-001.mts"), `import { readFile } from "node:fs/promises"; if (!(await readFile("examples/payment-service/docs/api.md", "utf8")).includes("Idempotency-Key")) process.exit(1);\n`);
}

function detectProtectedChanges(before: Array<{ path: string; sha256: string }>, after: Array<{ path: string; sha256: string }>): boolean {
  const baseline = new Map(before.map((file) => [file.path, file.sha256]));
  const current = new Map(after.map((file) => [file.path, file.sha256]));
  const paths = new Set([...baseline.keys(), ...current.keys()]);
  return [...paths].some((filePath) => baseline.get(filePath) !== current.get(filePath) && (filePath.startsWith("examples/payment-service/tests/") || filePath.startsWith("examples/payment-service/db/migrations/") || filePath === "package.json" || filePath === "package-lock.json"));
}

async function run(executable: string, args: string[], cwd: string): Promise<{ stdout: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd, shell: false, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk; });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => code === 0 ? resolve({ stdout }) : reject(new Error(`${executable} failed: ${stderr}`)));
  });
}
