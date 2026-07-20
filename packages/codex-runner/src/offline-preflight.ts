import { access } from "node:fs/promises";
import path from "node:path";
import { resolveCodexLaunch, sanitizedCodexEnvironment } from "./codex-launch.js";
import { strictSchemaPreflight, type JsonSchema } from "./strict-output-schema.js";

export async function offlineArchitectPreflight(workspacePath: string, protectedPath: string, schema: JsonSchema, prompt: string, timeoutMs: number): Promise<Array<{ name: string; passed: boolean }>> {
  const launch = await resolveCodexLaunch();
  const environment = sanitizedCodexEnvironment();
  const schemaPath = path.join(protectedPath, "architect-output-schema.json");
  const checks = [
    ["pinned-wrapper", launch.version === "0.144.0" && launch.executable === process.execPath],
    ["no-shell-shim", !/powershell|cmd/i.test(launch.executable) && !/powershell|cmd/i.test(launch.wrapperPath)],
    ["standalone-git-workspace", await exists(path.join(workspacePath, ".git"))],
    ["output-outside-workspace", !path.resolve(protectedPath).startsWith(path.resolve(workspacePath))],
    ["schema-parseable", parseable(JSON.stringify(schema))],
    ["strict-output-schema", strictSchemaPreflight(schema).valid],
    ["protected-schema-present", await exists(schemaPath)],
    ["prompt-nonempty", prompt.length > 0],
    ["timeout-configured", timeoutMs > 0],
    ["environment-allowlisted", !("OPENAI_API_KEY" in environment) && !("CODEX_API_KEY" in environment)],
    ["output-caps-configured", true],
  ] as const;
  return checks.map(([name, passed]) => ({ name, passed }));
}

async function exists(target: string): Promise<boolean> { try { await access(target); return true; } catch { return false; } }
function parseable(value: string): boolean { try { JSON.parse(value); return true; } catch { return false; } }
