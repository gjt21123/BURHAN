import path from "node:path";

export function assertContainedPath(parentPath: string, candidatePath: string): string {
  const parent = path.resolve(parentPath);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(parent, candidate);

  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Path escapes or equals protected root: ${candidate}`);
  }

  return candidate;
}

export function assertSafeRunId(runId: string): string {
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/i.test(runId) || runId.includes("..")) {
    throw new Error(`Unsafe run ID: ${runId}`);
  }

  return runId;
}
