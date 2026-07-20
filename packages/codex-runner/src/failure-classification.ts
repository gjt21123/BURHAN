export type RetainedProviderError = {
  code: string | null;
  errorType: string | null;
  message: string;
};

export type LifecycleForClassification = {
  timedOut: boolean;
  signal: string | null;
  processExitCode: number | null;
  threadStarted: boolean;
  turnStarted: boolean;
  turnCompleted: boolean;
  turnFailed: boolean;
  jsonParseFailures: number;
  errors: RetainedProviderError[];
};

export function classifyLifecycleFailure(lifecycle: LifecycleForClassification): string | null {
  if (lifecycle.timedOut) return "CODEX_WORKER_TIMEOUT";
  if (lifecycle.signal === "spawn") return "CODEX_PROCESS_START_FAILED";

  const diagnostic = lifecycle.errors.map((error) => `${error.code ?? ""} ${error.errorType ?? ""} ${error.message}`).join(" ").toLowerCase();
  if (includesAny(diagnostic, ["invalid_json_schema", "invalid json schema", "response_format", "output schema"])) return "CODEX_OUTPUT_SCHEMA_FAILED";
  if (includesAny(diagnostic, ["authentication_error", "invalid_api_key", "authentication failed", "expired login", "login required"])) return "CODEX_AUTH_UNAVAILABLE";
  if (includesAny(diagnostic, ["insufficient_quota", "usage limit", "usage_limit", "credits exhausted", "quota exceeded"])) return "CODEX_USAGE_UNAVAILABLE";
  if (includesAny(diagnostic, ["model_not_found", "model unavailable", "model access", "model is not available"])) return "CODEX_MODEL_UNAVAILABLE";
  if (includesAny(diagnostic, ["invalid configuration", "invalid config", "unsupported cli", "unsupported config", "unknown option", "invalid option"])) return "CODEX_CONFIGURATION_INVALID";
  if (includesAny(diagnostic, ["approval required", "approval policy", "requires approval"])) return "CODEX_APPROVAL_REQUIRED";
  if (includesAny(diagnostic, ["permission denied", "access is denied", "eacces", "eperm", "workspace permission", "command permission"])) return "CODEX_TOOL_EXECUTION_FAILED";
  if (includesAny(diagnostic, ["stream disconnected", "stream disconnect", "transport failure", "connection reset", "econnreset", "econnrefused", "network error"])) return "CODEX_TRANSPORT_FAILED";

  if (lifecycle.processExitCode !== 0 && !lifecycle.threadStarted) return "CODEX_THREAD_START_FAILED";
  if (lifecycle.threadStarted && !lifecycle.turnStarted) return "CODEX_TURN_START_FAILED";
  if (lifecycle.turnStarted && lifecycle.turnFailed) return "CODEX_TURN_FAILED";
  if (lifecycle.processExitCode === 0 && (!lifecycle.threadStarted || !lifecycle.turnCompleted || lifecycle.jsonParseFailures > 0)) return "CODEX_PROTOCOL_INVALID";
  return null;
}

function includesAny(value: string, patterns: string[]): boolean {
  return patterns.some((pattern) => value.includes(pattern));
}
