export type RunState =
  | "DRAFT"
  | "AWAITING_APPROVAL"
  | "SEALED"
  | "BUILDING_VALIDATORS"
  | "EXECUTING"
  | "VERIFYING"
  | "REPAIRING"
  | "VERIFIED"
  | "REJECTED"
  | "INCOMPLETE";

const transitions: Record<RunState, readonly RunState[]> = {
  DRAFT: ["AWAITING_APPROVAL"],
  AWAITING_APPROVAL: ["DRAFT", "SEALED"],
  SEALED: ["BUILDING_VALIDATORS"],
  BUILDING_VALIDATORS: ["EXECUTING", "INCOMPLETE"],
  EXECUTING: ["VERIFYING", "INCOMPLETE"],
  VERIFYING: ["VERIFIED", "REJECTED", "REPAIRING", "INCOMPLETE"],
  REPAIRING: ["EXECUTING", "INCOMPLETE"],
  VERIFIED: [],
  REJECTED: [],
  INCOMPLETE: [],
};

export function canTransition(from: RunState, to: RunState): boolean {
  return transitions[from].includes(to);
}

export function transition(from: RunState, to: RunState): RunState {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid BURHAN state transition: ${from} → ${to}`);
  }

  return to;
}
