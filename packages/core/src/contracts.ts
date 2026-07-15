import { z } from "zod";

export const clauseTypeSchema = z.enum([
  "outcome",
  "invariant",
  "prohibition",
  "documentation",
]);

export const evidenceModeSchema = z.enum([
  "test",
  "benchmark",
  "file_hash",
  "diff_check",
  "static_analysis",
  "semantic_review",
]);

export const clauseSchema = z.object({
  id: z.string().min(1),
  type: clauseTypeSchema,
  statement: z.string().min(1),
  severity: z.enum(["critical", "high", "medium"]),
  sourceReference: z.string().optional(),
  evidenceStrategy: z.object({
    mode: evidenceModeSchema,
    evidenceClass: z.enum(["deterministic", "semantic", "human_attestation"]),
    requiredAssurance: z.enum(["proven", "supported", "attested", "unverified"]),
  }),
});

export const proofContractSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  title: z.string().min(1),
  goal: z.string().min(1),
  scope: z.object({
    allowedPaths: z.array(z.string()),
    forbiddenPaths: z.array(z.string()),
    networkAccess: z.enum(["disabled", "restricted", "enabled"]),
    maxRepairAttempts: z.number().int().min(0).max(5),
  }),
  clauses: z.array(clauseSchema).min(1),
  assumptions: z.array(z.string()),
  ambiguities: z.array(z.string()),
});

export type ProofContract = z.infer<typeof proofContractSchema>;
export type Clause = z.infer<typeof clauseSchema>;
