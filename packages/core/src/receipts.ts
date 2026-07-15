import { z } from "zod";

export const proofReceiptSchema = z.object({
  receiptId: z.string().min(1),
  contractHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  validatorPackHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  baselineCommit: z.string().min(1),
  finalCommit: z.string().min(1),
  contractVerdict: z.enum(["verified", "rejected", "incomplete"]),
  executionAssurance: z.enum(["local_trusted", "isolated", "remote_attested"]),
  integrityStatus: z.enum(["intact", "tampered", "unknown"]),
  operatingSystem: z.string().min(1),
  nodeVersion: z.string().min(1),
  gitVersion: z.string().min(1),
  baselineHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  clauseResults: z.array(
    z.object({
      clauseId: z.string().min(1),
      verdict: z.enum(["proven", "failed", "blocked", "needs_human"]),
      evidenceIds: z.array(z.string()),
    }),
  ),
  eventLogRootHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  issuedAt: z.string().datetime(),
  signature: z.object({
    algorithm: z.literal("Ed25519"),
    publicKey: z.string().min(1),
    value: z.string().min(1),
  }),
  signatureScope: z.literal("local artifact integrity; not external attestation or hostile-code containment"),
});

export type ProofReceipt = z.infer<typeof proofReceiptSchema>;
