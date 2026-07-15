export type RunVerdict = "verified" | "rejected" | "incomplete";

export type RunEvent =
  | { type: "CONTRACT_SEALED" }
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
