import { z } from "zod";

export const proofReceiptSchema = z.object({
  receiptId: z.string().min(1),
  contractHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  validatorPackHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  baselineCommit: z.string().min(1),
  finalCommit: z.string().min(1),
  verdict: z.enum(["verified", "rejected", "incomplete"]),
  clauseResults: z.array(
    z.object({
      clauseId: z.string().min(1),
      verdict: z.enum(["proven", "failed", "blocked", "needs_human"]),
      evidenceIds: z.array(z.string()),
    }),
  ),
  eventLogRootHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  issuedAt: z.string().datetime(),
  signature: z.string().min(1),
});

export type ProofReceipt = z.infer<typeof proofReceiptSchema>;
