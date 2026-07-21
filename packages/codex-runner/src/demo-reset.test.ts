import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { demoRootForRepository, ensureDemoRoot, generatedDemoArtifactExists, originalDemoState, readDemoState, resetDemo, writeGeneratedDemoArtifact } from "./demo-reset.js";

async function createRepository(): Promise<string> {
  const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), "burhan-demo-reset-"));
  await writeFile(path.join(repositoryRoot, "package.json"), JSON.stringify({ name: "burhan" }));
  await mkdir(path.join(repositoryRoot, "fixtures"));
  await writeFile(path.join(repositoryRoot, "fixtures", "sealed.json"), "sealed");
  await mkdir(path.join(repositoryRoot, ".git"));
  await writeFile(path.join(repositoryRoot, ".git", "config"), "[core]");
  await ensureDemoRoot(repositoryRoot, "2026-07-21T00:00:00.000Z");
  return repositoryRoot;
}

async function expectCode(action: () => Promise<unknown>, code: string): Promise<void> {
  await expect(action()).rejects.toMatchObject({ code });
}

describe("safe demo reset", () => {
  it("removes only generated artifacts and restores the rejected demo state", async () => {
    const repositoryRoot = await createRepository();
    await writeGeneratedDemoArtifact(repositoryRoot, "receipts/attempt-1.receipt.json", { receipt: 1 });
    await writeGeneratedDemoArtifact(repositoryRoot, "receipts/attempt-2.receipt.json", { receipt: 2 });
    await writeGeneratedDemoArtifact(repositoryRoot, "evidence/repair.json", { evidence: true });
    await writeGeneratedDemoArtifact(repositoryRoot, "approval.json", { approved: true });
    await writeGeneratedDemoArtifact(repositoryRoot, "repair-attempt.json", { consumed: true });
    await writeGeneratedDemoArtifact(repositoryRoot, "counterexample-display.json", { dismissed: true });

    await expect(resetDemo({ repositoryRoot })).resolves.toEqual({ state: originalDemoState });
    await expect(readDemoState(repositoryRoot)).resolves.toEqual(originalDemoState);
    await expect(generatedDemoArtifactExists(repositoryRoot, "receipts/attempt-1.receipt.json")).resolves.toBe(false);
    await expect(generatedDemoArtifactExists(repositoryRoot, "evidence/repair.json")).resolves.toBe(false);
    await expect(generatedDemoArtifactExists(repositoryRoot, "approval.json")).resolves.toBe(false);
    await expect(readFile(path.join(repositoryRoot, "fixtures", "sealed.json"), "utf8")).resolves.toBe("sealed");
    await expect(readFile(path.join(repositoryRoot, ".git", "config"), "utf8")).resolves.toBe("[core]");
  });

  it("is idempotent and permits receipts to regenerate after reset", async () => {
    const repositoryRoot = await createRepository();
    await writeGeneratedDemoArtifact(repositoryRoot, "receipts/attempt-1.receipt.json", { receipt: 1 });
    await resetDemo({ repositoryRoot });
    await expect(resetDemo({ repositoryRoot })).resolves.toEqual({ state: originalDemoState });
    await writeGeneratedDemoArtifact(repositoryRoot, "receipts/attempt-1.receipt.json", { regenerated: true });
    await expect(generatedDemoArtifactExists(repositoryRoot, "receipts/attempt-1.receipt.json")).resolves.toBe(true);
  });

  it("rejects missing or mismatched markers", async () => {
    const missingMarkerRepository = await mkdtemp(path.join(os.tmpdir(), "burhan-demo-reset-missing-"));
    await mkdir(demoRootForRepository(missingMarkerRepository));
    await expectCode(() => resetDemo({ repositoryRoot: missingMarkerRepository }), "DEMO_RESET_MARKER_MISSING");

    const repositoryRoot = await createRepository();
    await writeFile(path.join(demoRootForRepository(repositoryRoot), "demo-marker.json"), JSON.stringify({ schemaVersion: "1", demoId: "wrong", repositoryRootHash: "invalid", createdAt: "2026-07-21T00:00:00.000Z" }));
    await expectCode(() => resetDemo({ repositoryRoot }), "DEMO_RESET_MARKER_MISMATCH");
  });

  it("rejects traversal, repository roots, and paths outside the dedicated root", async () => {
    const repositoryRoot = await createRepository();
    await expectCode(() => resetDemo({ repositoryRoot, demoRoot: `${repositoryRoot}${path.sep}.burhan-demo${path.sep}..${path.sep}outside` }), "DEMO_RESET_PATH_TRAVERSAL");
    await expectCode(() => resetDemo({ repositoryRoot, demoRoot: repositoryRoot }), "DEMO_RESET_REPOSITORY_ROOT_FORBIDDEN");
    await expectCode(() => resetDemo({ repositoryRoot, demoRoot: path.parse(repositoryRoot).root }), "DEMO_RESET_REPOSITORY_ROOT_FORBIDDEN");
    await expectCode(() => resetDemo({ repositoryRoot, demoRoot: path.join(path.dirname(repositoryRoot), "outside") }), "DEMO_RESET_PATH_OUTSIDE_ROOT");
  });

  it("rejects a symlink or junction within generated artifacts when supported", async () => {
    const repositoryRoot = await createRepository();
    const outside = await mkdtemp(path.join(os.tmpdir(), "burhan-demo-reset-outside-"));
    const receiptLink = path.join(demoRootForRepository(repositoryRoot), "receipts");
    try {
      await symlink(outside, receiptLink, process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EPERM" || code === "EACCES") return;
      throw error;
    }
    await expectCode(() => resetDemo({ repositoryRoot }), "DEMO_RESET_LINK_ESCAPE");
  });
});
