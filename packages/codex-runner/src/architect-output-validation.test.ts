import { describe, expect, it } from "vitest";
import { inspectArchitectRoot } from "./architect-output-validation.js";
const valid = { schemaVersion: "1", contractHash: "x", repositoryBaselineHash: "x", subject: {}, validators: [], uncoveredClauses: [], assumptions: [] };
describe("Architect root validation", () => {
  it("rejects all known wrappers before Zod", () => { for (const key of ["error", "result", "data", "blueprint", "response"]) { const result = inspectArchitectRoot({ [key]: "x" }); expect(result.category).toBe("ARCHITECT_WRAPPER_OBJECT"); expect(result.reachesZod).toBe(false); expect(result.reachesLinter).toBe(false); expect(result.startsExecutor).toBe(false); expect(result.fixtureFallback).toBe(false); } });
  it("rejects missing and unexpected keys", () => { const { assumptions: _assumptions, ...missing } = valid; expect(inspectArchitectRoot(missing).category).toBe("CODEX_OUTPUT_SCHEMA_INVALID"); expect(inspectArchitectRoot({ ...valid, extra: true }).category).toBe("CODEX_OUTPUT_SCHEMA_INVALID"); });
  it("passes exactly seven keys to Zod", () => { expect(inspectArchitectRoot(valid).reachesZod).toBe(true); });
});
