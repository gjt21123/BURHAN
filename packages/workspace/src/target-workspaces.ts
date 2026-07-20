import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { canonicalJson, sha256 } from "@burhan/core";
import { createBaselineManifest, type BaselineManifest } from "./baseline-manifest.js";

export type TargetWorkspaceRole = "architect" | "executor" | "verification";
export type TargetWorkspace = { path: string; baselineCommit: string; baselineManifest: BaselineManifest; inventory: string[] };
export type CandidatePatch = { bytes: Buffer; patchHash: string; changedFiles: string[]; untrackedFiles: string[]; forbiddenChanges: string[]; afterManifest: BaselineManifest };

const targetEntries = ["src", "tests", "docs", "package.json", "tsconfig.json"];
const forbidden = [/^tests\//, /^db\/migrations\//, /^(?:package|package-lock)\.json$/, /^\.burhan\//, /(?:^|\/)evidence(?:\/|$)/, /(?:^|\/)receipt(?:\/|$)/];

export async function createTargetWorkspace(repositoryRoot: string, runId: string, role: TargetWorkspaceRole): Promise<TargetWorkspace> {
  if (!/^[a-z0-9-]{1,80}$/i.test(runId)) throw new Error("Target workspace run ID is invalid.");
  const root = path.join(process.env.LOCALAPPDATA ?? path.join(repositoryRoot, ".burhan", "local-app-data"), "BURHAN", "workspaces", runId, role);
  await rm(root, { recursive: true, force: true });
  await mkdir(root, { recursive: true });
  const source = path.join(repositoryRoot, "examples", "payment-service");
  for (const entry of targetEntries) await cp(path.join(source, entry), path.join(root, entry), { recursive: true });
  await git(root, ["init", "--initial-branch=main"]);
  await git(root, ["add", "-A"]);
  await git(root, ["-c", "user.name=BURHAN", "-c", "user.email=burhan@local.invalid", "commit", "--quiet", "-m", "target baseline"], { GIT_AUTHOR_DATE: "2000-01-01T00:00:00Z", GIT_COMMITTER_DATE: "2000-01-01T00:00:00Z" });
  const baselineCommit = (await git(root, ["rev-parse", "HEAD"])).trim();
  const baselineManifest = await createBaselineManifest(root);
  const inventory = baselineManifest.files.map((file) => file.path);
  if (!protectedArtifactsAbsent(inventory)) throw new Error("Target workspace inventory contains protected artifacts.");
  return { path: root, baselineCommit, baselineManifest, inventory };
}

export function protectedArtifactsAbsent(inventory: readonly string[]): boolean {
  return inventory.every((file) => !/(?:^|\/)(?:packages\/|validator|qualification|evidence|receipt|signing|\.burhan)(?:\/|$)/i.test(file) && !file.startsWith(".git/"));
}

export async function captureCandidatePatch(workspace: TargetWorkspace): Promise<CandidatePatch> {
  const porcelain = await git(workspace.path, ["status", "--porcelain"]);
  const untrackedFiles = porcelain.split(/\r?\n/).filter((line) => line.startsWith("?? ")).map((line) => line.slice(3));
  await git(workspace.path, ["add", "-A"]);
  const bytes = await gitBuffer(workspace.path, ["diff", "--cached", "--binary", workspace.baselineCommit]);
  const stagedFiles = (await git(workspace.path, ["diff", "--cached", "--name-only", workspace.baselineCommit])).split(/\r?\n/).filter(Boolean);
  const afterManifest = await createBaselineManifest(workspace.path);
  const changedFiles = [...new Set([...changed(workspace.baselineManifest, afterManifest), ...stagedFiles])].sort();
  return { bytes, patchHash: sha256(bytes), changedFiles, untrackedFiles, forbiddenChanges: changedFiles.filter((file) => forbidden.some((rule) => rule.test(file))), afterManifest };
}

export async function applyCandidatePatch(workspace: TargetWorkspace, candidate: CandidatePatch): Promise<void> {
  if (candidate.bytes.byteLength === 0) {
    if (canonicalJson(workspace.baselineManifest) !== canonicalJson(candidate.afterManifest)) throw new Error("Empty candidate patch has a changed manifest.");
    return;
  }
  const patchPath = path.join(workspace.path, ".git", "burhan-candidate.patch");
  await writeFile(patchPath, candidate.bytes);
  await git(workspace.path, ["apply", "--binary", patchPath]);
  await rm(patchPath, { force: true });
  const manifest = await createBaselineManifest(workspace.path);
  if (canonicalJson(manifest) !== canonicalJson(candidate.afterManifest)) throw new Error("Applied candidate manifest does not match captured patch.");
}

function changed(before: BaselineManifest, after: BaselineManifest): string[] {
  const left = new Map(before.files.map((file) => [file.path, file.sha256]));
  const right = new Map(after.files.map((file) => [file.path, file.sha256]));
  return [...new Set([...left.keys(), ...right.keys()])].filter((file) => left.get(file) !== right.get(file)).sort();
}

async function git(cwd: string, args: string[], extraEnvironment: Record<string, string> = {}): Promise<string> {
  return (await gitBuffer(cwd, args, extraEnvironment)).toString("utf8");
}

async function gitBuffer(cwd: string, args: string[], extraEnvironment: Record<string, string> = {}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["-c", "core.autocrlf=false", ...args], { cwd, shell: false, windowsHide: true, env: { ...process.env, ...extraEnvironment } });
    const chunks: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.once("error", () => reject(new Error("Git workspace operation failed.")));
    child.once("close", (code) => code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error("Git workspace operation failed.")));
  });
}
