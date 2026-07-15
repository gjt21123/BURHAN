import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256, type EvidenceRecord } from "@burhan/core";

export async function appendEvidence(evidencePath: string, record: Omit<EvidenceRecord, "previousEvidenceHash" | "evidenceHash">, previousEvidenceHash: string | null): Promise<EvidenceRecord> {
  await mkdir(evidencePath, { recursive: true });
  const unsigned = { ...record, previousEvidenceHash };
  const evidenceHash = sha256(canonicalJson(unsigned));
  const complete = { ...unsigned, evidenceHash } as EvidenceRecord;
  await writeAtomic(path.join(evidencePath, `${record.id}.json`), `${canonicalJson(complete)}\n`);
  return complete;
}

export async function writeArtifact(evidencePath: string, relativePath: string, content: Buffer): Promise<{ relativePath: string; sha256: string; sizeBytes: number }> {
  const artifactPath = path.join(evidencePath, relativePath);
  await mkdir(path.dirname(artifactPath), { recursive: true });
  await writeAtomic(artifactPath, content);
  return { relativePath, sha256: sha256(content), sizeBytes: content.length };
}

export async function verifyEvidenceChain(evidencePath: string): Promise<{ valid: boolean; rootHash: string }> {
  const entries = (await readdir(evidencePath)).filter((name) => name.endsWith(".json")).sort();
  let previousEvidenceHash: string | null = null;
  for (const entry of entries) {
    const record = JSON.parse(await readFile(path.join(evidencePath, entry), "utf8")) as EvidenceRecord;
    const { evidenceHash, ...unsigned } = record;
    if (record.previousEvidenceHash !== previousEvidenceHash || sha256(canonicalJson(unsigned)) !== evidenceHash) return { valid: false, rootHash: previousEvidenceHash ?? sha256("") };
    for (const artifact of [record.stdoutArtifact, record.stderrArtifact]) {
      if (artifact) {
        const content = await readFile(path.join(evidencePath, artifact.relativePath));
        if (content.length !== artifact.sizeBytes || sha256(content) !== artifact.sha256) return { valid: false, rootHash: previousEvidenceHash ?? sha256("") };
      }
    }
    previousEvidenceHash = evidenceHash;
  }
  return { valid: true, rootHash: previousEvidenceHash ?? sha256("") };
}

async function writeAtomic(filePath: string, content: string | Buffer): Promise<void> {
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, content);
  await rename(temporaryPath, filePath);
}
