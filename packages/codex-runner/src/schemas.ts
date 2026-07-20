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
  contractHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  clauseIds: z.array(z.string().min(1)).min(1),
  summary: z.string().min(1),
}).strict();

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
export type PublicAgentEvent = z.infer<typeof publicAgentEventSchema>;
