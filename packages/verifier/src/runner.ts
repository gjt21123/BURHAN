import { spawn, type ChildProcess } from "node:child_process";
import { realpathSync, statSync } from "node:fs";
import { stat } from "node:fs/promises";
import { devNull } from "node:os";
import path from "node:path";

export type ExecutionAssurance = "local_trusted" | "isolated" | "remote_attested";
export type ValidatorCommand = { executableId: "node" | "npm" | "npx"; args: string[]; timeoutMs: number; maxOutputBytes: number };
export type CommandExecution = {
  executable: string;
  args: string[];
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  outputCapped: boolean;
  startedAt: string;
  completedAt: string;
  stdout: Buffer;
  stderr: Buffer;
  executionAssurance: ExecutionAssurance;
  aborted?: boolean;
  cleanupSucceeded?: boolean;
  failureCode?: string | null;
  backend?: "posix_process_group" | "windows_supervised_tree";
};
export type ExecutionOptions = { signal?: AbortSignal };

// The supervisor remains alive after the command exits. On Windows this preserves
// the tree root until taskkill /T completes while the command tree is live.
// This is fixed verifier code, never string interpolation of candidate input.
const SUPERVISOR = String.raw`
const { spawn } = require('node:child_process');
let started = false, reported = false, target;
setInterval(() => {}, 1000);
function report(result) {
  if (reported) return;
  reported = true;
  if (process.connected) process.send({ kind: 'result', ...result });
}
process.on('message', launch => {
  if (started || !launch || launch.kind !== 'launch') return;
  started = true;
  try {
    target = spawn(launch.executable, launch.args, {
      cwd: launch.cwd, env: process.env, shell: false, windowsHide: true,
      stdio: ['ignore', 'inherit', 'inherit']
    });
    target.once('error', () => report({ code: null, signal: null, error: 'COMMAND_SPAWN_FAILED' }));
    target.once('exit', (code, signal) => report({ code, signal, error: null }));
  } catch { report({ code: null, signal: null, error: 'COMMAND_SPAWN_FAILED' }); }
});
process.on('disconnect', () => {
  // Best effort after parent death. Normal completion is killed by the parent.
  if (target) { try { target.kill('SIGKILL'); } catch {} }
  process.exit(2);
});
process.send({ kind: 'ready' });
`;

/** Resolve only the current Node installation, never an executable in the candidate PATH. */
export function resolveTrustedExecutable(id: ValidatorCommand["executableId"]): string {
  if (id === "node") return process.execPath;
  if (id !== "npm" && id !== "npx") throw new Error("EXECUTABLE_NOT_ALLOWED");
  const basename = `${id}-cli.js`;
  const bins = [...new Set([path.dirname(process.execPath), path.dirname(realpathSync(process.execPath))])];
  for (const bin of bins) {
    const candidates = [
      path.join(bin, "node_modules", "npm", "bin", basename),
      path.join(bin, "..", "lib", "node_modules", "npm", "bin", basename),
      path.join(bin, id)
    ];
    for (const candidate of candidates) {
      try {
        const resolved = realpathSync(candidate);
        if (path.basename(resolved) === basename && statSync(resolved).isFile()) return resolved;
      } catch { /* Try only the remaining installation-local locations. */ }
    }
  }
  throw new Error("PACKAGE_MANAGER_ENTRYPOINT_UNAVAILABLE");
}

export function createLocalExecutionEnvironment(runTempPath: string): NodeJS.ProcessEnv {
  if (!path.isAbsolute(runTempPath)) throw new Error("ABSOLUTE_TEMP_REQUIRED");
  const env: NodeJS.ProcessEnv = {
    PATH: path.dirname(process.execPath), NODE_ENV: "test", CI: "true", NO_COLOR: "1",
    HOME: runTempPath, USERPROFILE: runTempPath,
    TEMP: runTempPath, TMP: runTempPath, TMPDIR: runTempPath,
    NPM_CONFIG_USERCONFIG: devNull, NPM_CONFIG_CACHE: path.join(runTempPath, "npm-cache"),
    NPM_CONFIG_OFFLINE: "true", NPM_CONFIG_AUDIT: "false", NPM_CONFIG_FUND: "false",
    NPM_CONFIG_UPDATE_NOTIFIER: "false", NPM_CONFIG_IGNORE_SCRIPTS: "true"
  };
  if (process.platform === "win32") {
    const systemRoot = process.env.SystemRoot ?? process.env.SYSTEMROOT;
    if (!systemRoot || !path.isAbsolute(systemRoot)) throw new Error("WINDOWS_SYSTEM_ROOT_REQUIRED");
    env.SystemRoot = systemRoot;
    env.WINDIR = systemRoot;
  }
  return env;
}

/** Infrastructure interruption is blocked, never an ordinary test failure or a pass. */
export function classifyCommandExecution(result: CommandExecution): "pass" | "fail" | "blocked" {
  if (result.timedOut || result.outputCapped || result.aborted || result.failureCode ||
      result.cleanupSucceeded === false || result.exitCode === null || result.signal) return "blocked";
  return result.exitCode === 0 ? "pass" : "fail";
}

function validateCommand(command: ValidatorCommand): void {
  if (!command || !["node", "npm", "npx"].includes(command.executableId)) throw new Error("EXECUTABLE_NOT_ALLOWED");
  if (!Array.isArray(command.args) || command.args.length > 256 ||
      command.args.some(arg => typeof arg !== "string" || arg.includes("\0")) ||
      command.args.reduce((sum, arg) => sum + Buffer.byteLength(arg), 0) > 64 * 1024) throw new Error("INVALID_COMMAND_ARGUMENTS");
  if (!Number.isSafeInteger(command.timeoutMs) || command.timeoutMs < 1 || command.timeoutMs > 300_000 ||
      !Number.isSafeInteger(command.maxOutputBytes) || command.maxOutputBytes < 1 || command.maxOutputBytes > 16 * 1024 * 1024) {
    throw new Error("INVALID_COMMAND_LIMITS");
  }
}

/** Bounded subprocess execution on a trusted local host; NOT a malicious-code sandbox. */
export async function runLocalCommand(command: ValidatorCommand, cwd: string, runTempPath: string, options: ExecutionOptions = {}): Promise<CommandExecution> {
  validateCommand(command);
  if (![cwd, runTempPath].every(value => typeof value === "string" && path.isAbsolute(value) && !value.includes("\0"))) throw new Error("ABSOLUTE_DIRECTORIES_REQUIRED");
  if (!(await stat(cwd)).isDirectory() || !(await stat(runTempPath)).isDirectory()) throw new Error("EXECUTION_DIRECTORY_REQUIRED");
  const environment = createLocalExecutionEnvironment(runTempPath);
  const entry = resolveTrustedExecutable(command.executableId);
  // npm.cmd/npx.cmd need a shell on Windows. Invoke their trusted JS entrypoints
  // through Node instead, keeping the original argument boundaries intact.
  const args = command.executableId === "node" ? [...command.args] : [entry, ...command.args];
  const executable = process.execPath;
  const windows = process.platform === "win32";
  const taskkill = windows ? path.join(environment.SystemRoot!, "System32", "taskkill.exe") : null;
  if (taskkill && !(await stat(taskkill)).isFile()) throw new Error("TREE_TERMINATOR_UNAVAILABLE");
  const startedAt = new Date().toISOString();
  const backend = windows ? "windows_supervised_tree" : "posix_process_group";
  const empty = (): CommandExecution => ({ executable, args, exitCode: null, signal: null, timedOut: false,
    outputCapped: false, startedAt, completedAt: new Date().toISOString(), stdout: Buffer.alloc(0), stderr: Buffer.alloc(0),
    executionAssurance: "local_trusted", aborted: true, cleanupSucceeded: true, failureCode: "COMMAND_ABORTED", backend });
  if (options.signal?.aborted) return empty();

  return new Promise((resolve) => {
    const stdout: Buffer[] = [], stderr: Buffer[] = [];
    let size = 0, timedOut = false, outputCapped = false, aborted = false, settled = false;
    let failureCode: string | null = null;
    let result: { code: number | null; signal: string | null } | null = null;
    let closed = false, stopping = false, cleanupDone = false, cleanupSucceeded = false;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let child: ChildProcess;
    const abort = () => { aborted = true; stop("COMMAND_ABORTED"); };
    function finish() {
      if (settled || !closed || !cleanupDone) return;
      settled = true;
      clearTimeout(deadline); clearTimeout(watchdog);
      options.signal?.removeEventListener("abort", abort);
      const complete = !failureCode && !timedOut && !outputCapped && !aborted && cleanupSucceeded && result !== null && !result.signal;
      resolve({ executable, args, exitCode: complete ? result!.code : null, signal: result?.signal ?? null,
        timedOut, outputCapped, aborted, cleanupSucceeded, failureCode,
        startedAt, completedAt: new Date().toISOString(), stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr),
        executionAssurance: "local_trusted", backend });
    }
    function stop(code: string | null) {
      if (settled) return;
      if (code && !failureCode) failureCode = code;
      if (stopping) return;
      stopping = true;
      clearTimeout(deadline);
      watchdog = setTimeout(() => {
        failureCode ??= "PROCESS_CLEANUP_FAILED";
        cleanupSucceeded = false; cleanupDone = true; closed = true;
        child.stdout?.destroy(); child.stderr?.destroy();
        if (child.connected) child.disconnect();
        child.unref();
        finish();
      }, 5000);
      void terminateOwnedTree(child, taskkill, environment).then(ok => {
        cleanupSucceeded = ok; cleanupDone = true;
        if (!ok) failureCode ??= "PROCESS_CLEANUP_FAILED";
        finish();
      }).catch(() => {
        cleanupDone = true; cleanupSucceeded = false;
        failureCode ??= "PROCESS_CLEANUP_FAILED"; finish();
      });
    }
    function capture(chunks: Buffer[], chunk: Buffer) {
      if (settled) return;
      const remaining = command.maxOutputBytes - size;
      if (remaining > 0) chunks.push(Buffer.from(chunk.subarray(0, remaining)));
      size += chunk.byteLength;
      if (size > command.maxOutputBytes) { outputCapped = true; stop("COMMAND_OUTPUT_LIMIT"); }
    }
    try {
      child = spawn(executable, ["--input-type=commonjs", "--eval", SUPERVISOR], {
        cwd, shell: false, windowsHide: true, detached: !windows, env: environment,
        stdio: ["ignore", "pipe", "pipe", "ipc"]
      });
    } catch {
      resolve({ ...empty(), aborted: false, cleanupSucceeded: true, failureCode: "SUPERVISOR_SPAWN_FAILED" });
      return;
    }
    child.stdout!.on("data", (chunk: Buffer) => capture(stdout, chunk));
    child.stderr!.on("data", (chunk: Buffer) => capture(stderr, chunk));
    child.on("message", (message: unknown) => {
      if (stopping || !message || typeof message !== "object") return;
      const value = message as Record<string, unknown>;
      if (value.kind === "ready") {
        child.send({ kind: "launch", executable, args, cwd }, error => { if (error) stop("SUPERVISOR_PROTOCOL_FAILED"); });
      } else if (value.kind === "result") {
        if ((value.code === null || (Number.isInteger(value.code) && Number(value.code) >= 0 && Number(value.code) <= 255)) &&
            (value.signal === null || typeof value.signal === "string")) {
          result = { code: value.code as number | null, signal: value.signal as string | null };
          stop(value.error === null && result.code !== null && !result.signal ? null : "COMMAND_EXECUTION_INTERRUPTED");
        } else stop("SUPERVISOR_PROTOCOL_FAILED");
      } else stop("SUPERVISOR_PROTOCOL_FAILED");
    });
    child.once("error", () => { stop("SUPERVISOR_SPAWN_FAILED"); });
    child.once("exit", () => { if (!stopping) stop("SUPERVISOR_EXITED_EARLY"); });
    child.once("close", () => { closed = true; if (!stopping) stop("SUPERVISOR_EXITED_EARLY"); finish(); });
    deadline = setTimeout(() => { timedOut = true; stop("COMMAND_TIMEOUT"); }, command.timeoutMs);
    options.signal?.addEventListener("abort", abort, { once: true });
    // Close the race between the initial check and event listener registration.
    if (options.signal?.aborted) abort();
  });
}

async function terminateOwnedTree(child: ChildProcess, taskkill: string | null, env: NodeJS.ProcessEnv): Promise<boolean> {
  if (!child.pid) return true;
  if (!taskkill) {
    try { process.kill(-child.pid, "SIGKILL"); return true; }
    catch (error) { return (error as NodeJS.ErrnoException).code === "ESRCH"; }
  }
  // The supervisor is intentionally alive here, so its PID still identifies our
  // command tree. Avoid PATH lookup and never interpolate into a command shell.
  if (child.exitCode !== null || child.signalCode !== null) return false;
  return new Promise(resolve => {
    const killer = spawn(taskkill, ["/PID", String(child.pid), "/T", "/F"], { shell: false, windowsHide: true, env, stdio: "ignore" });
    let done = false;
    const timer = setTimeout(() => { killer.kill(); settle(false); }, 4000);
    const settle = (ok: boolean) => { if (done) return; done = true; clearTimeout(timer); resolve(ok); };
    killer.once("error", () => settle(false));
    killer.once("close", code => settle(code === 0));
  });
}

/** @deprecated Compatibility name; now delegates to the bounded portable backend. */
export const runWindowsLocalCommand = runLocalCommand;
