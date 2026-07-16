export type RunVerdict = "verified" | "rejected" | "incomplete";

export type RunEvent =
  | { type: "CONTRACT_SEALED" }
  | { type: "VALIDATOR_BLUEPRINT_BUILD_STARTED" }
  | { type: "VALIDATOR_BLUEPRINT_READY" }
  | { type: "VALIDATOR_BLUEPRINT_LINTED" }
  | { type: "VALIDATOR_PACK_COMPILATION_STARTED" }
  | { type: "VALIDATOR_PACK_QUALIFICATION_STARTED" }
  | { type: "VALIDATOR_PACK_QUALIFIED" }
  | { type: "VALIDATOR_PACK_REJECTED" }
  | { type: "VALIDATOR_PACK_INCOMPLETE" }
  | { type: "VALIDATOR_PACK_SEALING_STARTED" }
  | { type: "VALIDATOR_PACK_SEALED" }
  | { type: "WORKSPACE_PREPARATION_STARTED" }
  | { type: "WORKSPACE_CREATED"; workspaceId: string }
  | { type: "BASELINE_VERIFIED" }
  | { type: "CANDIDATE_APPLIED" }
  | { type: "VALIDATOR_STARTED"; validatorId: string }
  | { type: "EVIDENCE_RECORDED"; evidenceId: string }
  | { type: "VALIDATOR_COMPLETED"; validatorId: string }
  | { type: "VERDICT_ISSUED"; verdict: RunVerdict }
  | { type: "RECEIPT_ISSUED"; receiptId: string }
  | { type: "RUN_FAILED"; reason: string };
