import { access, lstat, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { assertContainedPath } from "./path-guards.js";
import { getWorkspacesRoot } from "./run-directory.js";

export async function createIndependentClone(repositoryRoot: string, runId: string, baselineCommit: string): Promise<string> {
  const workspacesRoot = getWorkspacesRoot(repositoryRoot);
  const workspacePath = assertContainedPath(workspacesRoot, path.join(workspacesRoot, runId));
  await execute("git", ["clone", "--no-hardlinks", repositoryRoot, workspacePath], repositoryRoot);
  await execute("git", ["-C", workspacePath, "checkout", "--detach", baselineCommit], repositoryRoot);
  return workspacePath;
}

export async function removeIndependentClone(repositoryRoot: string, runId: string): Promise<void> {
  const workspacesRoot = getWorkspacesRoot(repositoryRoot);
  const workspacePath = assertContainedPath(workspacesRoot, path.join(workspacesRoot, runId));
  const stats = await lstat(workspacePath);
  if (stats.isSymbolicLink()) throw new Error("Workspace clone must not be a symlink or junction.");
  await access(path.join(workspacePath, ".git"));
  await rm(workspacePath, { recursive: true, force: false });
}

async function execute(executable: string, args: string[], cwd: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, args, { cwd, shell: false, windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.once("error", reject);
    child.once("close", (code) => code === 0 ? resolve() : reject(new Error(`${executable} failed: ${stderr}`)));
  });
}
