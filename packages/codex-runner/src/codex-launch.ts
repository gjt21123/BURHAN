import { spawn } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const expectedVersion = "0.144.0";

export type CodexLaunch = { executable: string; prefixArgs: string[]; wrapperPath: string; version: string };

export async function resolveCodexLaunch(): Promise<CodexLaunch> {
  const packageJson = require.resolve("@openai/codex/package.json");
  const packageRoot = realpathSync(path.dirname(packageJson));
  const wrapperPath = realpathSync(path.join(packageRoot, "bin", "codex.js"));
  if (!existsSync(wrapperPath) || !wrapperPath.startsWith(packageRoot)) throw new Error("CODEX_WRAPPER_NOT_FOUND");
  const version = (await runLocalCodex(["--version"])).trim().replace(/^codex-cli\s+/, "");
  if (version !== expectedVersion) throw new Error("CODEX_VERSION_MISMATCH");
  return { executable: process.execPath, prefixArgs: [wrapperPath], wrapperPath, version };
}

export function sanitizedCodexEnvironment(): NodeJS.ProcessEnv {
  const keys = ["PATH", "PATHEXT", "USERPROFILE", "HOME", "APPDATA", "LOCALAPPDATA", "TEMP", "TMP", "SystemRoot", "ComSpec", "CODEX_HOME"];
  return Object.fromEntries(keys.flatMap((key) => process.env[key] === undefined ? [] : [[key, process.env[key]]]));
}

export async function runLocalCodex(args: string[], stdin?: string): Promise<string> {
  const packageJson = require.resolve("@openai/codex/package.json");
  const wrapperPath = path.join(path.dirname(packageJson), "bin", "codex.js");
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [wrapperPath, ...args], { shell: false, windowsHide: true, env: sanitizedCodexEnvironment(), stdio: ["pipe", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stdin.end(stdin);
    child.once("error", () => reject(new Error("CODEX_WRAPPER_UNAVAILABLE")));
    child.once("close", (code) => code === 0 ? resolve(Buffer.concat(chunks).toString("utf8")) : reject(new Error("CODEX_WRAPPER_UNAVAILABLE")));
  });
}
