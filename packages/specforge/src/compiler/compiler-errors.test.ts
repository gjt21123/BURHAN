import { describe, expect, it } from "vitest";
import { classifyCompilationError } from "./compiler-errors.js";

describe("provider error classification", () => {
  it("classifies insufficient quota as terminal and non-retryable", () => {
    const failure = classifyCompilationError({ status: 429, type: "insufficient_quota", code: "insufficient_quota", request_id: "req_safe" });
    expect(failure.category).toBe("API_QUOTA_UNAVAILABLE");
    expect(failure.retryable).toBe(false);
    expect(failure.requestReachedProvider).toBe(true);
  });

  it("keeps transient request rate limits separate", () => {
    const failure = classifyCompilationError({ status: 429, type: "rate_limit_error", code: "rate_limit_exceeded" });
    expect(failure.category).toBe("API_RATE_LIMITED_TRANSIENT");
    expect(failure.retryable).toBe(true);
  });
});
