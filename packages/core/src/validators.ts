import { z } from "zod";

export const validatorPackManifestSchema = z.object({
  version: z.literal(1),
  contractHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  baselineCommit: z.string().min(1),
  validators: z.array(z.object({
    id: z.string().min(1),
    clauseId: z.string().min(1),
    kind: z.enum(["vitest", "diff_policy", "file_manifest", "structural_document_check"]),
    evidenceClass: z.literal("deterministic"),
    timeoutMs: z.number().int().positive(),
    command: z.object({
      executable: z.string().min(1),
      args: z.array(z.string()),
    }).optional(),
    expectedExitCode: z.number().int().optional(),
  })).min(1),
});

export type ValidatorPackManifest = z.infer<typeof validatorPackManifestSchema>;
