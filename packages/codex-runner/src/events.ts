import type { PublicAgentEvent } from "./schemas.js";

const sensitive = [/(?:sk|rk|sess)[_-][A-Za-z0-9_-]{8,}/g, /Bearer\s+[A-Za-z0-9._-]+/gi, /(?:token|authorization|api[_-]?key|secret)\s*[:=]\s*\S+/gi, /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, /[A-Z]:\\[^\s"']+/gi, /%?(?:APPDATA|LOCALAPPDATA|CODEX_HOME|USERPROFILE|HOME)%?/gi, /(?:\.burhan|validator-pack|qualification|signing-key)[^\s]*/gi];

export function publicEvent(runId: string, type: PublicAgentEvent["type"], message: string): PublicAgentEvent {
  return { schemaVersion: "1", runId, type, timestamp: new Date().toISOString(), message: sanitizePublicMessage(message).slice(0, 500) || "[REDACTED]" };
}

export function sanitizePublicMessage(message: string): string {
  return sensitive.reduce((value, expression) => value.replace(expression, "[REDACTED]"), message);
}
