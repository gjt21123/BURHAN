import { z } from "zod";

export const evidenceRecordSchema = z.object({
  id: z.string().min(1),
  clauseId: z.string().min(1),
  collector: z.string().min(1),
  deterministic: z.boolean(),
  result: z.enum(["pass", "fail", "blocked"]),
  command: z.string().optional(),
  exitCode: z.number().int().optional(),
  artifactHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  observedValue: z.unknown().optional(),
  expectedValue: z.unknown().optional(),
  timestamp: z.string().datetime(),
});

export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;
