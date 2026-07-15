import { z } from "zod";

export const evidenceRecordSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  clauseId: z.string().min(1),
  validatorId: z.string().min(1),
  producer: z.literal("burhan-verifier"),
  evidenceClass: z.enum(["deterministic", "semantic", "human_attestation"]),
  assurance: z.enum(["proven", "supported", "attested", "unverified"]),
  status: z.enum(["pass", "fail", "blocked"]),
  execution: z.object({
    executable: z.string().min(1),
    args: z.array(z.string()),
    exitCode: z.number().int().nullable(),
    signal: z.string().nullable(),
    timedOut: z.boolean(),
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime(),
  }).optional(),
  observedValue: z.unknown().optional(),
  expectedValue: z.unknown().optional(),
  stdoutArtifact: z.object({
    relativePath: z.string().min(1),
    sha256: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    sizeBytes: z.number().int().nonnegative(),
  }).optional(),
  stderrArtifact: z.object({
    relativePath: z.string().min(1),
    sha256: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    sizeBytes: z.number().int().nonnegative(),
  }).optional(),
  previousEvidenceHash: z.string().regex(/^sha256:[a-f0-9]{64}$/).nullable(),
  evidenceHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
});

export type EvidenceClass = z.infer<typeof evidenceRecordSchema.shape.evidenceClass>;
export type AssuranceLevel = z.infer<typeof evidenceRecordSchema.shape.assurance>;
export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;
