import { describe, expect, it } from "vitest";
import { classifyLifecycleFailure } from "./failure-classification.js";

describe("classifyLifecycleFailure", () => {
  it("classifies a provider output-schema rejection before generation", () => {
    expect(classifyLifecycleFailure({
      timedOut: false,
      signal: null,
      processExitCode: 1,
      threadStarted: true,
      turnStarted: true,
      turnCompleted: false,
      turnFailed: true,
      jsonParseFailures: 0,
      errors: [{ code: "invalid_json_schema", errorType: "invalid_request_error", message: "Response format schema is invalid." }]
    })).toBe("CODEX_OUTPUT_SCHEMA_FAILED");
  });
});
