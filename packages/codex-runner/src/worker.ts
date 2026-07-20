import { createInterface } from "node:readline";
import { spawn } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "@burhan/core";
import { resolveCodexLaunch, sanitizedCodexEnvironment } from "./codex-launch.js";
import { sanitizePublicMessage } from "./events.js";
import { classifyLifecycleFailure, type RetainedProviderError } from "./failure-classification.js";

type WorkerRequest = { runId: string; role: "validator_architect" | "executor"; workspacePath: string; protectedPath: string; schemaPath: string; outputMode?: "provider_schema" | "validated_json"; prompt: string; timeoutMs: number; stdoutCapBytes?: number; stderrCapBytes?: number };
type Lifecycle = { eventTypes: string[]; threadId: string | null; threadStarted: boolean; turnStarted: boolean; turnCompleted: boolean; turnFailed: boolean; jsonLinesReceived: number; jsonParseFailures: number; processExitCode: number | null; signal: string | null; timedOut: boolean; stderrFirstLine: string | null; errors: RetainedProviderError[] };

const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on("line", async (line) => { try { console.log(JSON.stringify(await execute(JSON.parse(line) as WorkerRequest))); } catch { console.log(JSON.stringify({ ok: false, category: "CODEX_WORKER_CRASHED", lifecycle: emptyLifecycle() })); } });

async function execute(request: WorkerRequest): Promise<object> {
  const outputPath = path.join(request.protectedPath, request.role === "validator_architect" ? "architect-final.json" : "executor-final.json");
  await mkdir(request.protectedPath, { recursive: true });
  const launch = await resolveCodexLaunch();
  const lifecycle = emptyLifecycle();
  const sandbox = request.role === "validator_architect" ? "read-only" : "workspace-write";
  const outputSchemaArgs = request.outputMode === "validated_json" ? [] : ["--output-schema", request.schemaPath];
  const args = [...launch.prefixArgs, "--ask-for-approval", "never", "--cd", request.workspacePath, "--sandbox", sandbox, "exec", "--json", "--ignore-user-config", "--ignore-rules", ...outputSchemaArgs, "--output-last-message", outputPath, "-c", "web_search=\"disabled\"", ...(request.role === "executor" ? ["-c", "sandbox_workspace_write.network_access=false"] : []), "-"];
  const result = await runProcess(launch.executable, args, request.prompt, lifecycle, request.timeoutMs, request.stdoutCapBytes ?? 256_000, request.stderrCapBytes ?? 64_000);
  lifecycle.processExitCode = result.exitCode; lifecycle.signal = result.signal; lifecycle.timedOut = result.timedOut; lifecycle.stderrFirstLine = result.stderrFirstLine;
  const category = classify(lifecycle);
  if (category) { await persistLifecycle(request.protectedPath, lifecycle); return { ok: false, category, lifecycle }; }
  try {
    const outputStats = await stat(outputPath);
    if (outputStats.size === 0 || outputStats.size > 256_000) return { ok: false, category: "CODEX_OUTPUT_MISSING", lifecycle };
    const bytes = await readFile(outputPath);
    await persistLifecycle(request.protectedPath, lifecycle); return { ok: true, lifecycle, finalOutput: bytes.toString("utf8"), finalOutputHash: sha256(bytes) };
  } catch { await persistLifecycle(request.protectedPath, lifecycle); return { ok: false, category: "CODEX_OUTPUT_MISSING", lifecycle }; }
}

function runProcess(executable: string, args: string[], prompt: string, lifecycle: Lifecycle, timeoutMs: number, stdoutCap: number, stderrCap: number): Promise<{ exitCode: number | null; signal: string | null; timedOut: boolean; stderrFirstLine: string | null }> {
  return new Promise((resolve) => {
    let child;
    try { child = spawn(executable, args, { shell: false, windowsHide: true, env: sanitizedCodexEnvironment(), stdio: ["pipe", "pipe", "pipe"] }); } catch { resolve({ exitCode: null, signal: "spawn", timedOut: false, stderrFirstLine: null }); return; }
    let stdoutSize = 0; let stderrSize = 0; let timedOut = false; let buffer = ""; let stderrFirstLine: string | null = null;
    const stop = () => { if (process.platform === "win32" && child.pid) spawn("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { shell: false, windowsHide: true }); };
    const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => { stdoutSize += chunk.length; if (stdoutSize > stdoutCap) { stop(); return; } buffer += chunk.toString("utf8"); let index; while ((index = buffer.indexOf("\n")) >= 0) { consumeLine(buffer.slice(0, index), lifecycle); buffer = buffer.slice(index + 1); } });
    child.stderr.on("data", (chunk: Buffer) => { stderrSize += chunk.length; if (!stderrFirstLine) stderrFirstLine = firstSanitizedLine(chunk.toString("utf8")); if (stderrSize > stderrCap) stop(); });
    child.stdin.end(prompt);
    child.once("error", () => { clearTimeout(timer); resolve({ exitCode: null, signal: "spawn", timedOut, stderrFirstLine }); });
    child.once("close", (code, signal) => { clearTimeout(timer); if (buffer) consumeLine(buffer, lifecycle); resolve({ exitCode: code, signal, timedOut, stderrFirstLine }); });
  });
}

function consumeLine(line: string, lifecycle: Lifecycle): void {
  if (!line.trim()) return;
  lifecycle.jsonLinesReceived += 1;
  let event: Record<string, unknown>;
  try { event = JSON.parse(line) as Record<string, unknown>; } catch { lifecycle.jsonParseFailures += 1; return; }
  const type = typeof event.type === "string" ? event.type : "unknown";
  lifecycle.eventTypes.push(type);
  if (type === "thread.started") { lifecycle.threadStarted = true; lifecycle.threadId = readThreadId(event); }
  if (type === "turn.started") lifecycle.turnStarted = true;
  if (type === "turn.completed") lifecycle.turnCompleted = true;
  if (type === "turn.failed" || type === "error") { lifecycle.turnFailed ||= type === "turn.failed"; lifecycle.errors.push(readProviderError(event)); }
}

function classify(lifecycle: Lifecycle): string | null {
  return classifyLifecycleFailure(lifecycle);
}

async function persistLifecycle(protectedPath: string, lifecycle: Lifecycle): Promise<void> {
  const summary = {
    eventTypes: lifecycle.eventTypes,
    threadId: lifecycle.threadId,
    threadStarted: lifecycle.threadStarted,
    turnStarted: lifecycle.turnStarted,
    turnCompleted: lifecycle.turnCompleted,
    turnFailed: lifecycle.turnFailed,
    exitCode: lifecycle.processExitCode,
    timedOut: lifecycle.timedOut,
    stderrFirstLine: lifecycle.stderrFirstLine,
    errors: lifecycle.errors
  };
  await writeFile(path.join(protectedPath, "lifecycle-summary.json"), `${JSON.stringify(summary)}\n`, "utf8");
}
function firstSanitizedLine(value: string): string | null { const line = value.split(/\r?\n/).find((entry) => entry.trim()); return line ? sanitizePublicMessage(line).slice(0, 500) : null; }
function emptyLifecycle(): Lifecycle { return { eventTypes: [], threadId: null, threadStarted: false, turnStarted: false, turnCompleted: false, turnFailed: false, jsonLinesReceived: 0, jsonParseFailures: 0, processExitCode: null, signal: null, timedOut: false, stderrFirstLine: null, errors: [] }; }
function readString(value: Record<string, unknown>, key: string): string | null { return typeof value[key] === "string" ? value[key] : null; }
function readRecord(value: Record<string, unknown>, key: string): Record<string, unknown> | null { const candidate = value[key]; return candidate && typeof candidate === "object" && !Array.isArray(candidate) ? candidate as Record<string, unknown> : null; }
function readProviderError(event: Record<string, unknown>): RetainedProviderError {
  const providerError = readRecord(event, "error") ?? event;
  return {
    code: sanitizeDiagnostic(readString(providerError, "code") ?? readString(event, "code")),
    errorType: sanitizeDiagnostic(readString(providerError, "type") ?? readString(event, "error_type")),
    message: sanitizeDiagnostic(readString(providerError, "message") ?? readString(event, "message")) ?? "[REDACTED]"
  };
}
function sanitizeDiagnostic(value: string | null): string | null {
  if (!value) return null;
  const sanitized = sanitizePublicMessage(value).slice(0, 500);
  return /\b(?:prompt|reasoning)\b/i.test(sanitized) ? "[REDACTED]" : sanitized || null;
}
function readThreadId(event: Record<string, unknown>): string | null { return readString(event, "thread_id") ?? (event.thread && typeof event.thread === "object" ? readString(event.thread as Record<string, unknown>, "id") : null); }
