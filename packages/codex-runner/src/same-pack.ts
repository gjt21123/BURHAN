import { canonicalJson, sha256 } from "@burhan/core";

export type SealedPackSnapshot = { contractHash: string; validatorPackContentHash: string; qualificationReportHash: string; compilerVersion: string; compiledFileHashes: Record<string, string>; integrity: "intact" | "tampered" };
export type SamePackProof = { schemaVersion: "1"; originalRunId: string; repairRunId: string; contractHash: string; originalValidatorPackContentHash: string; repairValidatorPackContentHash: string; qualificationReportHash: string; originalCompiledFileHashes: Record<string, string>; repairCompiledFileHashes: Record<string, string>; compiledFileHashesMatch: boolean; samePack: boolean; issuedAt: string; proofHash: string };
export function buildSamePackProof(original: SealedPackSnapshot, repair: SealedPackSnapshot, originalRunId: string, repairRunId: string, issuedAt: string): SamePackProof {
  const compiledFileHashesMatch = canonicalJson(original.compiledFileHashes) === canonicalJson(repair.compiledFileHashes);
  const samePack = original.integrity === "intact" && repair.integrity === "intact" && original.contractHash === repair.contractHash && original.validatorPackContentHash === repair.validatorPackContentHash && original.qualificationReportHash === repair.qualificationReportHash && original.compilerVersion === repair.compilerVersion && compiledFileHashesMatch;
  const unsigned = { schemaVersion: "1" as const, originalRunId, repairRunId, contractHash: original.contractHash, originalValidatorPackContentHash: original.validatorPackContentHash, repairValidatorPackContentHash: repair.validatorPackContentHash, qualificationReportHash: original.qualificationReportHash, originalCompiledFileHashes: original.compiledFileHashes, repairCompiledFileHashes: repair.compiledFileHashes, compiledFileHashesMatch, samePack, issuedAt };
  return { ...unsigned, proofHash: sha256(canonicalJson(unsigned)) };
}
export function verifySamePackProof(proof: SamePackProof): boolean { const { proofHash, ...unsigned } = proof; return proof.samePack && sha256(canonicalJson(unsigned)) === proofHash; }
