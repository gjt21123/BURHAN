import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "@burhan/core";

export type BaselineFile = { path: string; sha256: string };
export type BaselineManifest = { files: BaselineFile[] };

export async function createBaselineManifest(rootPath: string): Promise<BaselineManifest> {
  const files: BaselineFile[] = [];
  await visit(rootPath, rootPath, files);
  return { files: files.sort((left, right) => left.path.localeCompare(right.path)) };
}

async function visit(rootPath: string, currentPath: string, files: BaselineFile[]): Promise<void> {
  for (const entry of await readdir(currentPath, { withFileTypes: true })) {
    if ([".git", ".next", "node_modules", ".burhan"].includes(entry.name)) continue;
    const entryPath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      await visit(rootPath, entryPath, files);
    } else if (entry.isFile()) {
      files.push({ path: path.relative(rootPath, entryPath).replaceAll("\\", "/"), sha256: sha256(await readFile(entryPath)) });
    }
  }
}
