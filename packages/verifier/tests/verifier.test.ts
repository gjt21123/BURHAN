import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { appendEvidence, issueReceipt, sealValidatorPack, verifyReceipt, verifyReceiptWithEvidence, verifySealedValidatorPack, writeArtifact } from "../src/index.js";

describe("verification integrity", () => {
  it("detects a post-seal validator mutation", async () => {
    const packPath = await mkdtemp(path.join(os.tmpdir(), "burhan-pack-"));
    await writeFile(path.join(packPath, "validator.txt"), "original");
    await sealValidatorPack(packPath, { version: 1, contractHash: "sha256:" + "a".repeat(64), baselineCommit: "base", validators: [{ id: "v", clauseId: "OUT-001", kind: "vitest", evidenceClass: "deterministic", timeoutMs: 1 }] });
    await writeFile(path.join(packPath, "validator.txt"), "mutated");
    await expect(verifySealedValidatorPack(packPath)).rejects.toThrow("mutation");
  });

  it("rejects a tampered receipt signature", async () => {
    const receiptPath = await mkdtemp(path.join(os.tmpdir(), "burhan-receipt-"));
    await issueReceipt(receiptPath, { receiptId: "r", contractHash: "sha256:" + "a".repeat(64), validatorPackHash: "sha256:" + "b".repeat(64), baselineCommit: "base", finalCommit: "final", contractVerdict: "verified", executionAssurance: "local_trusted", integrityStatus: "intact", operatingSystem: "Windows", nodeVersion: process.version, gitVersion: "git test", baselineHash: "sha256:" + "d".repeat(64), clauseResults: [], eventLogRootHash: "sha256:" + "c".repeat(64), issuedAt: new Date().toISOString(), signatureScope: "local artifact integrity; not external attestation or hostile-code containment" });
    const receiptFile = path.join(receiptPath, "receipt.json");
    expect(await verifyReceipt(receiptFile)).toBe(true);
    const tampered = (await readFile(receiptFile, "utf8")).replace("verified", "rejected");
    await writeFile(receiptFile, tampered);
    expect(await verifyReceipt(receiptFile)).toBe(false);
  });

  it("chains evidence records", async () => {
    const evidencePath = await mkdtemp(path.join(os.tmpdir(), "burhan-evidence-"));
    const artifact = await writeArtifact(evidencePath, "logs/stdout.log", Buffer.from("trusted output"));
    const record = await appendEvidence(evidencePath, { id: "e-1", runId: "run-1", clauseId: "OUT-001", validatorId: "v-1", producer: "burhan-verifier", evidenceClass: "deterministic", assurance: "proven", status: "pass", stdoutArtifact: artifact }, null);
    expect(record.previousEvidenceHash).toBeNull();
    expect(record.evidenceHash).toMatch(/^sha256:/);
    const receiptPath = await mkdtemp(path.join(os.tmpdir(), "burhan-evidence-receipt-"));
    const receipt = await issueReceipt(receiptPath, { receiptId: "e-r", contractHash: "sha256:" + "a".repeat(64), validatorPackHash: "sha256:" + "b".repeat(64), baselineCommit: "base", finalCommit: "final", contractVerdict: "verified", executionAssurance: "local_trusted", integrityStatus: "intact", operatingSystem: "Windows", nodeVersion: process.version, gitVersion: "git test", baselineHash: "sha256:" + "d".repeat(64), clauseResults: [], eventLogRootHash: record.evidenceHash, issuedAt: new Date().toISOString(), signatureScope: "local artifact integrity; not external attestation or hostile-code containment" });
    expect(await verifyReceiptWithEvidence(path.join(receiptPath, "receipt.json"), evidencePath)).toBe(true);
    await writeFile(path.join(evidencePath, "logs", "stdout.log"), "tampered");
    expect(await verifyReceiptWithEvidence(path.join(receiptPath, "receipt.json"), evidencePath)).toBe(false);
  });
});
