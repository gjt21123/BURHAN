import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256, type ValidatorPackManifest } from "@burhan/core";

export async function sealValidatorPack(packPath: string, manifest: ValidatorPackManifest): Promise<string> {
  await mkdir(packPath, { recursive: true });
  const manifestBody = `${canonicalJson(manifest)}\n`;
  await writeFile(path.join(packPath, "manifest.json"), manifestBody, "utf8");
  const digest = sha256(await collectPackBytes(packPath));
  await writeFile(path.join(packPath, "manifest.sha256"), `${digest}\n`, "utf8");
  return digest;
}

export async function verifySealedValidatorPack(packPath: string): Promise<ValidatorPackManifest> {
  const expectedHash = (await readFile(path.join(packPath, "manifest.sha256"), "utf8")).trim();
  const actualHash = sha256(await collectPackBytes(packPath));
  if (expectedHash !== actualHash) throw new Error("Validator pack mutation detected after sealing.");
  return JSON.parse(await readFile(path.join(packPath, "manifest.json"), "utf8")) as ValidatorPackManifest;
}

export async function copyValidatorFile(sourcePath: string, packPath: string, relativePath: string): Promise<void> {
  const destination = path.join(packPath, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(sourcePath, destination);
}

async function collectPackBytes(packPath: string): Promise<Buffer> {
  const names = await listFiles(packPath);
  const chunks: Buffer[] = [];
  for (const name of names.filter((file) => file !== "manifest.sha256")) {
    chunks.push(Buffer.from(name));
    chunks.push(await readFile(path.join(packPath, name)));
  }
  return Buffer.concat(chunks);
}

async function listFiles(rootPath: string, currentPath = rootPath): Promise<string[]> {
  const results: string[] = [];
  for (const entry of await readdir(currentPath, { withFileTypes: true })) {
    const entryPath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) results.push(...await listFiles(rootPath, entryPath));
    if (entry.isFile()) results.push(path.relative(rootPath, entryPath).replaceAll("\\", "/"));
  }
  return results.sort();
}
