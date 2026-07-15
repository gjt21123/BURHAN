import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertContainedPath, assertSafeRunId } from "./path-guards.js";

export type RunMarker = { runId: string; baselineCommit: string };

export function getRunsRoot(repositoryRoot: string): string {
  const localAppData = process.env.LOCALAPPDATA ?? path.join(repositoryRoot, ".burhan", "local-app-data");
  return path.join(localAppData, "BURHAN", "runs");
}

export function getWorkspacesRoot(repositoryRoot: string): string {
  return path.join(repositoryRoot, ".burhan", "workspaces");
}

export async function createRunDirectory(repositoryRoot: string, marker: RunMarker): Promise<string> {
  const runsRoot = getRunsRoot(repositoryRoot);
  const runPath = assertContainedPath(runsRoot, path.join(runsRoot, assertSafeRunId(marker.runId)));
  await mkdir(runPath, { recursive: true });
  await writeAtomicJson(path.join(runPath, "run.marker.json"), marker);
  for (const child of ["contract", "baseline", "validator-pack", "workspace", "evidence", "receipt"]) {
    await mkdir(path.join(runPath, child), { recursive: true });
  }
  return runPath;
}

export async function validateRunMarker(runPath: string, expected: RunMarker): Promise<void> {
  const marker = JSON.parse(await readFile(path.join(runPath, "run.marker.json"), "utf8")) as RunMarker;
  if (marker.runId !== expected.runId || marker.baselineCommit !== expected.baselineCommit) {
    throw new Error("Run marker does not match the expected run identity.");
  }
}

export async function writeAtomicJson(filePath: string, value: unknown): Promise<void> {
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
}
