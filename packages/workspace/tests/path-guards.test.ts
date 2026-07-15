import path from "node:path";
import { describe, expect, it } from "vitest";
import { assertContainedPath, assertSafeRunId } from "../src/index.js";

describe("workspace path guards", () => {
  const runsRoot = path.resolve("D:/BURHAN/.burhan/runs");

  it("accepts a child run path", () => {
    expect(assertContainedPath(runsRoot, path.join(runsRoot, "run-001"))).toContain("run-001");
  });

  it("rejects traversal, repository root, and drive paths", () => {
    expect(() => assertContainedPath(runsRoot, path.join(runsRoot, "..", "..", "apps"))).toThrow();
    expect(() => assertContainedPath(runsRoot, "D:/BURHAN")).toThrow();
    expect(() => assertSafeRunId("../../escape")).toThrow();
  });
});
