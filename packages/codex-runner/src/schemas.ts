import { z } from "zod";

const relativePathSchema = z.string().min(1).max(240);
const subjectSchema = z.object({
  modulePath: relativePathSchema,
  exportName: z.string().min(1).max(120),
}).strict();

export const validatorBlueprintSchema = z.object({
  schemaVersion: z.literal("1"),
  contractHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  repositoryBaselineHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  subject: subjectSchema,
  validators: z.array(z.object({
    id: z.string().min(1).max(120),
    clauseId: z.string().min(1).max(120),
    capabilityId: z.string().min(1).max(160),
    subject: subjectSchema,
    parameters: z.record(z.unknown()),
    expectedObservation: z.string().min(1).max(500),
    rationale: z.string().min(1).max(500),
  }).strict()).min(1).max(16),
  uncoveredClauses: z.array(z.string().min(1)).max(32),
  assumptions: z.array(z.string().min(1).max(300)).max(32),
}).strict();

export const agentExecutionClaimSchema = z.object({
  schemaVersion: z.literal("1"),
  runId: z.string().min(1),
  claimedStatus: z.enum(["completed", "failed", "incomplete"]),
  summary: z.string().min(1),
  claimedFilesChanged: z.array(relativePathSchema).max(200),
  claimedTestsRun: z.array(z.string().min(1).max(300)).max(50),
  claimedConstraintsPreserved: z.array(z.string().min(1).max(300)).max(50),
  assumptions: z.array(z.string().min(1).max(300)).max(50),
  limitations: z.array(z.string().min(1).max(300)).max(50),
}).strict();

export const counterexamplePacketSchema = z.object({
  schemaVersion: z.literal("1"),
  originalRunId: z.string().min(1).max(120),
  contractHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  validatorPackContentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  originalVerdict: z.literal("rejected"),
  repairAttempt: z.literal(1),
  failedClauses: z.array(z.object({ clauseId: z.string().min(1), statement: z.string().min(1).max(500), evidenceClass: z.literal("deterministic"), expectedObservation: z.string().min(1).max(500), observedValue: z.string().min(1).max(500), explanation: z.string().min(1).max(500) }).strict()).min(1),
  policyViolations: z.array(z.object({ clauseId: z.string().min(1), violationType: z.string().min(1).max(120), paths: z.array(relativePathSchema).max(32), explanation: z.string().min(1).max(500) }).strict()).max(32),
  provenClausesToPreserve: z.array(z.string().min(1)).max(32),
  candidateSummary: z.object({ filesChanged: z.number().int().min(0), patchEmpty: z.boolean(), regressionResult: z.enum(["pass", "fail", "not_run"]), documentationResult: z.enum(["pass", "fail", "not_run"]) }).strict(),
  hiddenDetailsWithheld: z.literal(true),
  counterexampleHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
}).strict();

export const repairApprovalSchema = z.object({ schemaVersion: z.literal("1"), originalRunId: z.string().min(1), executorThreadId: z.string().uuid(), contractHash: z.string().regex(/^sha256:[a-f0-9]{64}$/), validatorPackContentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/), counterexampleHash: z.string().regex(/^sha256:[a-f0-9]{64}$/), approvedAction: z.literal("repair_once"), approvedAt: z.string().datetime(), actor: z.literal("human"), approvalHash: z.string().regex(/^sha256:[a-f0-9]{64}$/) }).strict();

export const repairExecutionClaimSchema = z.object({ schemaVersion: z.literal("1"), claimedStatus: z.enum(["completed", "partially_completed", "blocked"]), summary: z.string().min(1).max(500), claimedFilesChanged: z.array(relativePathSchema).max(200), claimedTestsRun: z.array(z.string().min(1).max(300)).max(50), claimedConstraintsPreserved: z.array(z.string().min(1).max(300)).max(50), failedItemsRemaining: z.array(z.string().min(1).max(300)).max(50), assumptions: z.array(z.string().min(1).max(300)).max(50), limitations: z.array(z.string().min(1).max(300)).max(50) }).strict();

export const publicAgentEventSchema = z.object({
  schemaVersion: z.literal("1"),
  type: z.enum(["agent_started", "thread_started", "command_started", "command_completed", "file_changed", "agent_message", "agent_completed", "agent_failed"]),
  runId: z.string().min(1),
  timestamp: z.string().datetime(),
  message: z.string().min(1).max(500),
}).strict();

export type ValidatorBlueprint = z.infer<typeof validatorBlueprintSchema>;
export type AgentExecutionClaim = z.infer<typeof agentExecutionClaimSchema>;
export type CounterexamplePacket = z.infer<typeof counterexamplePacketSchema>;
export type RepairApproval = z.infer<typeof repairApprovalSchema>;
export type RepairExecutionClaim = z.infer<typeof repairExecutionClaimSchema>;
export type PublicAgentEvent = z.infer<typeof publicAgentEventSchema>;
