import { canonicalJson, sha256 } from "@burhan/core";
import { counterexamplePacketSchema, repairApprovalSchema, type CounterexamplePacket, type RepairApproval } from "./schemas.js";

const forbidden = [/(?:sk|rk|sess)[_-][A-Za-z0-9_-]{8,}/i, /bearer\s+/i, /(?:api[_-]?key|token|secret|authorization)\s*[:=]/i, /[A-Z]:\\/i, /(?:validator|qualification|oracle|evidence|receipt)[^\s]*/i, /\.burhan/i];

export type TrustedCounterexampleInput = Omit<CounterexamplePacket, "counterexampleHash">;

export function buildCounterexamplePacket(input: TrustedCounterexampleInput): CounterexamplePacket {
  const sanitized = sanitize(input) as TrustedCounterexampleInput;
  const unsigned = { ...sanitized, hiddenDetailsWithheld: true as const };
  const packet = { ...unsigned, counterexampleHash: sha256(canonicalJson(unsigned)) };
  return counterexamplePacketSchema.parse(packet);
}

export function verifyCounterexamplePacket(packet: CounterexamplePacket): boolean {
  const { counterexampleHash, ...unsigned } = packet;
  return counterexamplePacketSchema.safeParse(packet).success && sha256(canonicalJson(unsigned)) === counterexampleHash;
}

export function buildRepairApproval(input: Omit<RepairApproval, "approvalHash">): RepairApproval {
  const approval = { ...input, approvalHash: sha256(canonicalJson(input)) };
  return repairApprovalSchema.parse(approval);
}

export function verifyRepairApproval(approval: RepairApproval, packet: CounterexamplePacket, expected: { executorThreadId: string; contractHash: string; validatorPackContentHash: string; originalRunId: string; alreadyRepaired: boolean }): boolean {
  const { approvalHash, ...unsigned } = approval;
  return repairApprovalSchema.safeParse(approval).success && verifyCounterexamplePacket(packet) && sha256(canonicalJson(unsigned)) === approvalHash && !expected.alreadyRepaired && approval.originalRunId === expected.originalRunId && approval.executorThreadId === expected.executorThreadId && approval.contractHash === expected.contractHash && approval.validatorPackContentHash === expected.validatorPackContentHash && approval.counterexampleHash === packet.counterexampleHash && approval.approvedAction === "repair_once";
}

function sanitize(value: unknown): unknown {
  if (typeof value === "string") return forbidden.some((pattern) => pattern.test(value)) ? "[WITHHELD]" : value;
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, sanitize(child)]));
  return value;
}
