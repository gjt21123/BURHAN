import { canonicalJson, sha256 } from "@burhan/core";
import { lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const demoRootName = ".burhan-demo";
const markerName = "demo-marker.json";
const stateName = "demo-state.json";
const demoId = "milestone-4c-submission-demo";
const generatedRoots = ["receipts", "evidence", "workspaces"];
const generatedFiles = ["approval.json", "repair-attempt.json", "counterexample-display.json"];

export type DemoResetErrorCode =
  | "DEMO_RESET_MARKER_MISSING"
  | "DEMO_RESET_MARKER_MISMATCH"
  | "DEMO_RESET_PATH_OUTSIDE_ROOT"
  | "DEMO_RESET_REPOSITORY_ROOT_FORBIDDEN"
  | "DEMO_RESET_PATH_TRAVERSAL"
  | "DEMO_RESET_LINK_ESCAPE"
  | "DEMO_RESET_FAILED";

export class DemoResetError extends Error {
  constructor(readonly code: DemoResetErrorCode) {
    super(code);
  }
}

export type DemoMarker = {
  schemaVersion: "1";
  demoId: typeof demoId;
  repositoryRootHash: string;
  createdAt: string;
};

export type DemoState = {
  schemaVersion: "1";
  originalVerdict: "REJECTED";
  repairApproved: false;
  repairAttemptConsumed: false;
  deterministicRepairExecuted: false;
  receiptStatus: "not_generated";
  counterexampleDisplay: "available";
};

export const originalDemoState: DemoState = {
  schemaVersion: "1",
  originalVerdict: "REJECTED",
  repairApproved: false,
  repairAttemptConsumed: false,
  deterministicRepairExecuted: false,
  receiptStatus: "not_generated",
  counterexampleDisplay: "available",
};

export function demoRootForRepository(repositoryRoot: string): string {
  return path.join(path.resolve(repositoryRoot), demoRootName);
}

export async function findRepositoryRoot(startPath: string): Promise<string> {
  let current = path.resolve(startPath);
  while (true) {
    try {
      const packageJson = JSON.parse(await readFile(path.join(current, "package.json"), "utf8")) as { name?: unknown };
      if (packageJson.name === "burhan") return current;
    } catch {
      // Continue to the parent. The public error below avoids exposing local paths.
    }
    const parent = path.dirname(current);
    if (parent === current) throw new DemoResetError("DEMO_RESET_FAILED");
    current = parent;
  }
}

export async function ensureDemoRoot(repositoryRoot: string, createdAt = new Date().toISOString()): Promise<DemoMarker> {
  const demoRoot = validateDemoRoot(repositoryRoot, demoRootForRepository(repositoryRoot));
  try {
    await lstat(demoRoot);
  } catch (error) {
    if (!isMissing(error)) throw new DemoResetError("DEMO_RESET_FAILED");
    await mkdir(demoRoot, { recursive: true });
    const marker = createMarker(repositoryRoot, createdAt);
    await writeJson(path.join(demoRoot, markerName), marker);
    return marker;
  }
  await assertDirectoryIsSafe(demoRoot);
  return readVerifiedMarker(repositoryRoot, demoRoot);
}

export async function resetDemo(input: { repositoryRoot: string; demoRoot?: string }): Promise<{ state: DemoState }> {
  const demoRoot = validateDemoRoot(input.repositoryRoot, input.demoRoot ?? demoRootForRepository(input.repositoryRoot));
  await assertDemoRootExists(demoRoot);
  await assertDirectoryIsSafe(demoRoot);
  await readVerifiedMarker(input.repositoryRoot, demoRoot);

  for (const artifact of [...generatedRoots, ...generatedFiles]) {
    const target = safeArtifactPath(demoRoot, artifact);
    if (await exists(target)) {
      await assertNoLinks(target);
      await rm(target, { recursive: true, force: false });
    }
  }

  await writeJson(path.join(demoRoot, stateName), originalDemoState);
  return { state: originalDemoState };
}

export async function readDemoState(repositoryRoot: string): Promise<DemoState> {
  const demoRoot = validateDemoRoot(repositoryRoot, demoRootForRepository(repositoryRoot));
  await assertDirectoryIsSafe(demoRoot);
  await readVerifiedMarker(repositoryRoot, demoRoot);
  const parsed = JSON.parse(await readFile(path.join(demoRoot, stateName), "utf8")) as DemoState;
  if (canonicalJson(parsed) !== canonicalJson(originalDemoState)) throw new DemoResetError("DEMO_RESET_FAILED");
  return parsed;
}

export async function writeGeneratedDemoArtifact(repositoryRoot: string, artifact: string, value: unknown): Promise<void> {
  const demoRoot = validateDemoRoot(repositoryRoot, demoRootForRepository(repositoryRoot));
  await assertDirectoryIsSafe(demoRoot);
  await readVerifiedMarker(repositoryRoot, demoRoot);
  const target = safeArtifactPath(demoRoot, artifact);
  await mkdir(path.dirname(target), { recursive: true });
  await writeJson(target, value);
}

export async function generatedDemoArtifactExists(repositoryRoot: string, artifact: string): Promise<boolean> {
  const demoRoot = validateDemoRoot(repositoryRoot, demoRootForRepository(repositoryRoot));
  await assertDirectoryIsSafe(demoRoot);
  await readVerifiedMarker(repositoryRoot, demoRoot);
  return exists(safeArtifactPath(demoRoot, artifact));
}

function createMarker(repositoryRoot: string, createdAt: string): DemoMarker {
  return { schemaVersion: "1", demoId, repositoryRootHash: repositoryIdentityHash(repositoryRoot), createdAt };
}

function repositoryIdentityHash(repositoryRoot: string): string {
  return sha256(canonicalJson({ project: "burhan", markerSchemaVersion: "1", rootName: path.basename(path.resolve(repositoryRoot)).toLowerCase() }));
}

function validateDemoRoot(repositoryRoot: string, candidateRoot: string): string {
  if (containsTraversal(candidateRoot)) throw new DemoResetError("DEMO_RESET_PATH_TRAVERSAL");
  const repository = path.resolve(repositoryRoot);
  const candidate = path.resolve(candidateRoot);
  if (candidate === repository || candidate === path.parse(candidate).root) throw new DemoResetError("DEMO_RESET_REPOSITORY_ROOT_FORBIDDEN");
  if (candidate !== path.join(repository, demoRootName)) throw new DemoResetError("DEMO_RESET_PATH_OUTSIDE_ROOT");
  return candidate;
}

async function readVerifiedMarker(repositoryRoot: string, demoRoot: string): Promise<DemoMarker> {
  let marker: DemoMarker;
  try {
    const markerStats = await lstat(path.join(demoRoot, markerName));
    if (!markerStats.isFile() || markerStats.isSymbolicLink()) throw new DemoResetError("DEMO_RESET_LINK_ESCAPE");
    marker = JSON.parse(await readFile(path.join(demoRoot, markerName), "utf8")) as DemoMarker;
  } catch (error) {
    if (error instanceof DemoResetError) throw error;
    if (isMissing(error)) throw new DemoResetError("DEMO_RESET_MARKER_MISSING");
    throw new DemoResetError("DEMO_RESET_FAILED");
  }
  if (marker.schemaVersion !== "1" || marker.demoId !== demoId || marker.repositoryRootHash !== repositoryIdentityHash(repositoryRoot) || typeof marker.createdAt !== "string") {
    throw new DemoResetError("DEMO_RESET_MARKER_MISMATCH");
  }
  return marker;
}

function safeArtifactPath(demoRoot: string, artifact: string): string {
  if (containsTraversal(artifact)) throw new DemoResetError("DEMO_RESET_PATH_TRAVERSAL");
  const target = path.resolve(demoRoot, artifact);
  const relative = path.relative(demoRoot, target);
  const allowed = generatedFiles.includes(relative) || generatedRoots.some((root) => relative === root || relative.startsWith(`${root}${path.sep}`));
  if (!allowed || relative === "" || path.isAbsolute(relative)) throw new DemoResetError("DEMO_RESET_PATH_OUTSIDE_ROOT");
  return target;
}

async function assertDirectoryIsSafe(demoRoot: string): Promise<void> {
  try {
    const stats = await lstat(demoRoot);
    if (!stats.isDirectory() || stats.isSymbolicLink()) throw new DemoResetError("DEMO_RESET_LINK_ESCAPE");
    await realpath(demoRoot);
  } catch (error) {
    if (error instanceof DemoResetError) throw error;
    throw new DemoResetError("DEMO_RESET_FAILED");
  }
}

async function assertDemoRootExists(demoRoot: string): Promise<void> {
  try {
    await lstat(demoRoot);
  } catch (error) {
    if (isMissing(error)) throw new DemoResetError("DEMO_RESET_MARKER_MISSING");
    throw new DemoResetError("DEMO_RESET_FAILED");
  }
}

async function assertNoLinks(target: string): Promise<void> {
  const stats = await lstat(target);
  if (stats.isSymbolicLink()) throw new DemoResetError("DEMO_RESET_LINK_ESCAPE");
  if (!stats.isDirectory()) return;
  for (const entry of await readdir(target, { withFileTypes: true })) {
    const child = path.join(target, entry.name);
    if (entry.isSymbolicLink()) throw new DemoResetError("DEMO_RESET_LINK_ESCAPE");
    if (entry.isDirectory()) await assertNoLinks(child);
  }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${canonicalJson(value)}\n`, "utf8");
}

async function exists(candidate: string): Promise<boolean> {
  try {
    await lstat(candidate);
    return true;
  } catch (error) {
    if (isMissing(error)) return false;
    throw new DemoResetError("DEMO_RESET_FAILED");
  }
}

function containsTraversal(value: string): boolean {
  return value.split(/[\\/]+/).includes("..");
}

function isMissing(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT";
}
