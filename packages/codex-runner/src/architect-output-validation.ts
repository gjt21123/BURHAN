const required = ["assumptions", "contractHash", "repositoryBaselineHash", "schemaVersion", "subject", "uncoveredClauses", "validators"];
const wrappers = new Set(["error", "result", "data", "blueprint", "response"]);
export function inspectArchitectRoot(value: unknown): { valid: boolean; category: "ARCHITECT_WRAPPER_OBJECT" | "CODEX_OUTPUT_SCHEMA_INVALID" | null; reachesZod: boolean; reachesLinter: false; startsExecutor: false; fixtureFallback: false } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return bad("CODEX_OUTPUT_SCHEMA_INVALID");
  const keys = Object.keys(value as Record<string, unknown>);
  if (keys.some((key) => wrappers.has(key))) return bad("ARCHITECT_WRAPPER_OBJECT");
  return keys.slice().sort().join(",") === required.join(",") ? { valid: true, category: null, reachesZod: true, reachesLinter: false, startsExecutor: false, fixtureFallback: false } : bad("CODEX_OUTPUT_SCHEMA_INVALID");
}
function bad(category: "ARCHITECT_WRAPPER_OBJECT" | "CODEX_OUTPUT_SCHEMA_INVALID") { return { valid: false, category, reachesZod: false, reachesLinter: false, startsExecutor: false, fixtureFallback: false } as const; }
