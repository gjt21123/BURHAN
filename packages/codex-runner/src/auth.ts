import { runLocalCodex } from "./codex-launch.js";

export type CodexAuthAvailability = "AVAILABLE" | "UNAVAILABLE" | "USAGE_UNAVAILABLE";

export async function codexAuthenticationPreflight(): Promise<CodexAuthAvailability> {
  try { await runLocalCodex(["login", "status"]); return "AVAILABLE"; } catch { return "UNAVAILABLE"; }
}

export function classifyCodexFailure(category: string): "incomplete" | "rejected" {
  return ["CODEX_AUTH_UNAVAILABLE", "CODEX_USAGE_UNAVAILABLE", "CODEX_MODEL_UNAVAILABLE", "CODEX_CONFIGURATION_INVALID", "CODEX_OUTPUT_SCHEMA_FAILED", "CODEX_APPROVAL_REQUIRED", "CODEX_TOOL_EXECUTION_FAILED", "CODEX_TRANSPORT_FAILED", "CODEX_TURN_FAILED", "CODEX_WORKER_TIMEOUT", "CODEX_WORKER_CRASHED", "CODEX_OUTPUT_INVALID", "CODEX_THREAD_FAILED"].includes(category) ? "incomplete" : "rejected";
}
