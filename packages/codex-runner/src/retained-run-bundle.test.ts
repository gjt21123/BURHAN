import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { prepareRetainedRunBundle, retainBundleArtifact } from "./retained-run-bundle.js";
describe("retained run bundle", () => { it("creates and atomically verifies protected retention", async () => { const root = await mkdtemp(path.join(os.tmpdir(), "burhan-retention-")); try { const result = await prepareRetainedRunBundle(root, "future-live-run", "live"); expect(result.category).toBe("READY"); const hash = await retainBundleArtifact(result.bundlePath!, "contract/contract.json", { schemaVersion: "1" }); expect((await readFile(path.join(result.bundlePath!, "contract/contract.json"), "utf8")).length).toBeGreaterThan(0); expect(hash).toMatch(/^sha256:/); } finally { await rm(root, { recursive: true, force: true }); } }); });
