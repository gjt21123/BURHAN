import { readFile, readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { sha256 } from "@burhan/core";
import type { RepositoryFactPack } from "../schemas/repository-fact-pack.js";
import { capabilityCatalog } from "./capability-catalog.js";

const excluded = new Set([".git", ".next", "node_modules", ".burhan", "dist", "coverage"]);
export async function buildRepositoryFactPack(root: string): Promise<RepositoryFactPack> {
  const manifestBytes = await readFile(path.join(root, "package.json"));
  const manifest = JSON.parse(manifestBytes.toString()) as { name?: string; scripts?: Record<string, string>; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  const files = await scan(root);
  return { schemaVersion: "1", repository: { name: manifest.name ?? path.basename(root), baselineCommit: (await git(root, ["rev-parse", "HEAD"])).trim(), primaryLanguage: "TypeScript", packageManager: "npm" }, execution: { assurance: "local_trusted", operatingSystem: "windows" }, files: { sourcePaths: files.filter((file) => file.includes("/src/")), testPaths: files.filter((file) => file.includes("/tests/")), documentationPaths: files.filter((file) => file.endsWith(".md")), migrationPaths: files.filter((file) => file.includes("/migrations/")) }, scripts: Object.entries(manifest.scripts ?? {}).map(([name, command]) => ({ name, command })), packageManifest: { runtimeDependencies: Object.keys(manifest.dependencies ?? {}).sort(), developmentDependencies: Object.keys(manifest.devDependencies ?? {}).sort(), manifestHash: sha256(manifestBytes), lockfileHash: await readFile(path.join(root, "package-lock.json")).then(sha256).catch(() => null) }, verifierCapabilities: capabilityCatalog(), limitations: ["local_trusted does not prove network containment or hostile-code isolation"] };
}
async function scan(root: string, current = root): Promise<string[]> { const found: string[] = []; for (const entry of await readdir(current, { withFileTypes: true })) { if (excluded.has(entry.name) || entry.name.startsWith(".env") || /(?:\.pem|\.key|credentials|secrets)/i.test(entry.name)) continue; const full = path.join(current, entry.name); if (entry.isDirectory()) found.push(...await scan(root, full)); else if (entry.isFile() && !/\.(?:png|jpg|jpeg|gif|zip|pdf)$/i.test(entry.name)) found.push(path.relative(root, full).replaceAll("\\", "/")); } return found.sort(); }
async function git(cwd: string, args: string[]): Promise<string> { return new Promise((resolve, reject) => { const child = spawn("git", args, { cwd, shell: false, windowsHide: true }); let stdout = ""; child.stdout.on("data", (chunk: Buffer) => { stdout += chunk; }); child.once("error", reject); child.once("close", (code) => code === 0 ? resolve(stdout) : reject(new Error("Git fact collection failed."))); }); }
