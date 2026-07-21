import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256 } from "@burhan/core";

export const retainedRunBundleVersion = "1";
const requiredDirectories = ["contract", "baseline", "architect", "qualification", "validator-pack", "executor", "evidence", "receipts"];
export type RetainedRunBundle = { schemaVersion: "1"; runId: string; mode: "live" | "deterministic_demo"; artifacts: Record<string, { sha256: string }> };

export async function prepareRetainedRunBundle(root: string, runId: string, mode: RetainedRunBundle["mode"]): Promise<{ valid: boolean; category: "READY" | "RETENTION_PREFLIGHT_FAILED"; bundlePath: string | null }> {
  try {
    const bundlePath = path.join(root, runId);
    await mkdir(bundlePath, { recursive: true });
    await Promise.all(requiredDirectories.map((directory) => mkdir(path.join(bundlePath, directory), { recursive: true })));
    const probe = path.join(bundlePath, ".retention-probe");
    await writeFile(probe, "ok", "utf8"); await stat(probe);
    const bundle: RetainedRunBundle = { schemaVersion: retainedRunBundleVersion, runId, mode, artifacts: {} };
    await atomicJson(path.join(bundlePath, "retained-run.json"), bundle);
    const reread = JSON.parse(await readFile(path.join(bundlePath, "retained-run.json"), "utf8")) as RetainedRunBundle;
    return { valid: reread.schemaVersion === retainedRunBundleVersion && reread.runId === runId, category: "READY", bundlePath };
  } catch { return { valid: false, category: "RETENTION_PREFLIGHT_FAILED", bundlePath: null }; }
}
export async function retainBundleArtifact(bundlePath: string, name: string, value: unknown): Promise<string> { const bytes = Buffer.from(canonicalJson(value)); const target = path.join(bundlePath, name); await atomicBytes(target, bytes); const hash = sha256(await readFile(target)); if (hash !== sha256(bytes)) throw new Error("Retained artifact verification failed."); return hash; }
export const oldLiveRepairLimitation = { status: "REPAIR_CONTEXT_UNAVAILABLE", liveRepairAttempted: false, reason: "required protected artifacts were not retained" } as const;
async function atomicJson(filePath: string, value: unknown): Promise<void> { await atomicBytes(filePath, Buffer.from(canonicalJson(value))); }
async function atomicBytes(filePath: string, bytes: Buffer): Promise<void> { const temporary = `${filePath}.tmp`; await writeFile(temporary, bytes); await rename(temporary, filePath); }
