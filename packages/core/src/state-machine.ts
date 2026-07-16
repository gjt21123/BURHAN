import type { RunEvent, RunVerdict } from "./run-events.js";

export type RunState =
  | "DRAFT"
  | "SEALED"
  | "BUILDING_VALIDATOR_BLUEPRINT"
  | "LINTING_VALIDATOR_BLUEPRINT"
  | "COMPILING_VALIDATOR_PACK"
  | "QUALIFYING_VALIDATOR_PACK"
  | "VALIDATOR_PACK_QUALIFIED"
  | "VALIDATOR_PACK_REJECTED"
  | "VALIDATOR_PACK_INCOMPLETE"
  | "SEALING_VALIDATOR_PACK"
  | "VALIDATOR_PACK_SEALED"
  | "PREPARING_WORKSPACE"
  | "VERIFYING_BASELINE"
  | "APPLYING_CANDIDATE"
  | "RUNNING_VALIDATORS"
  | "EVALUATING"
  | "ISSUING_RECEIPT"
  | "COMPLETED"
  | "FAILED";

export type RunModel = { state: RunState; verdict?: RunVerdict };

export function reduceRun(model: RunModel, event: RunEvent): RunModel {
  const transition = (state: RunState, verdict?: RunVerdict): RunModel => ({ state, verdict });

  switch (event.type) {
    case "CONTRACT_SEALED":
      return model.state === "DRAFT" ? transition("SEALED") : invalid(model, event);
    case "VALIDATOR_BLUEPRINT_BUILD_STARTED":
      return model.state === "SEALED" ? transition("BUILDING_VALIDATOR_BLUEPRINT") : invalid(model, event);
    case "VALIDATOR_BLUEPRINT_READY":
      return model.state === "BUILDING_VALIDATOR_BLUEPRINT" ? transition("LINTING_VALIDATOR_BLUEPRINT") : invalid(model, event);
    case "VALIDATOR_BLUEPRINT_LINTED":
      return model.state === "LINTING_VALIDATOR_BLUEPRINT" ? transition("COMPILING_VALIDATOR_PACK") : invalid(model, event);
    case "VALIDATOR_PACK_COMPILATION_STARTED":
      return model.state === "COMPILING_VALIDATOR_PACK" ? model : invalid(model, event);
    case "VALIDATOR_PACK_QUALIFICATION_STARTED":
      return model.state === "COMPILING_VALIDATOR_PACK" ? transition("QUALIFYING_VALIDATOR_PACK") : invalid(model, event);
    case "VALIDATOR_PACK_QUALIFIED":
      return model.state === "QUALIFYING_VALIDATOR_PACK" ? transition("VALIDATOR_PACK_QUALIFIED") : invalid(model, event);
    case "VALIDATOR_PACK_REJECTED":
      return model.state === "QUALIFYING_VALIDATOR_PACK" ? transition("VALIDATOR_PACK_REJECTED") : invalid(model, event);
    case "VALIDATOR_PACK_INCOMPLETE":
      return model.state === "QUALIFYING_VALIDATOR_PACK" ? transition("VALIDATOR_PACK_INCOMPLETE") : invalid(model, event);
    case "VALIDATOR_PACK_SEALING_STARTED":
      return model.state === "VALIDATOR_PACK_QUALIFIED" ? transition("SEALING_VALIDATOR_PACK") : invalid(model, event);
    case "VALIDATOR_PACK_SEALED":
      return model.state === "SEALING_VALIDATOR_PACK" ? transition("VALIDATOR_PACK_SEALED") : invalid(model, event);
    case "WORKSPACE_PREPARATION_STARTED":
      return model.state === "SEALED" || model.state === "VALIDATOR_PACK_SEALED" ? transition("PREPARING_WORKSPACE") : invalid(model, event);
    case "WORKSPACE_CREATED":
      return model.state === "PREPARING_WORKSPACE" ? transition("VERIFYING_BASELINE") : invalid(model, event);
    case "BASELINE_VERIFIED":
      return model.state === "VERIFYING_BASELINE" ? transition("APPLYING_CANDIDATE") : invalid(model, event);
    case "CANDIDATE_APPLIED":
      return model.state === "APPLYING_CANDIDATE" ? transition("RUNNING_VALIDATORS") : invalid(model, event);
    case "VALIDATOR_STARTED":
    case "EVIDENCE_RECORDED":
    case "VALIDATOR_COMPLETED":
      return model.state === "RUNNING_VALIDATORS" ? model : invalid(model, event);
    case "VERDICT_ISSUED":
      return model.state === "RUNNING_VALIDATORS" ? transition("EVALUATING", event.verdict) : invalid(model, event);
    case "RECEIPT_ISSUED":
      return model.state === "EVALUATING" ? transition("COMPLETED", model.verdict) : invalid(model, event);
    case "RUN_FAILED":
      return transition("FAILED", "incomplete");
  }
}

function invalid(model: RunModel, event: RunEvent): never {
  throw new Error(`Invalid event ${event.type} in state ${model.state}`);
}
