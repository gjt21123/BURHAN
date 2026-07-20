export type RunVerdict = "verified" | "rejected" | "incomplete";

export type RunEvent =
  | { type: "CONTRACT_SEALED" }
  | { type: "VALIDATOR_ARCHITECT_PREPARATION_STARTED" }
  | { type: "VALIDATOR_ARCHITECT_STARTED" }
  | { type: "VALIDATOR_BLUEPRINT_RECEIVED" }
  | { type: "VALIDATOR_BLUEPRINT_LINT_STARTED" }
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
  | { type: "EXECUTOR_PREPARATION_STARTED" }
  | { type: "EXECUTOR_STARTED" }
  | { type: "AGENT_CLAIM_RECEIVED" }
  | { type: "CANDIDATE_PATCH_CAPTURE_STARTED" }
  | { type: "VERIFICATION_WORKSPACE_PREPARATION_STARTED" }
  | { type: "CANDIDATE_PATCH_APPLICATION_STARTED" }
  | { type: "CANDIDATE_VERIFICATION_STARTED" }
  | { type: "CANDIDATE_VERIFIED" }
  | { type: "CANDIDATE_REJECTED" }
  | { type: "CANDIDATE_INCOMPLETE" }
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
