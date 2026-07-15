import { spawn } from "node:child_process";
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
};

export function resolveTrustedExecutable(executableId: ValidatorCommand["executableId"]): string {
  if (executableId === "node") return process.execPath;
  const suffix = process.platform === "win32" ? ".cmd" : "";
  return path.join(path.dirname(process.execPath), `${executableId}${suffix}`);
}

export async function runWindowsLocalCommand(command: ValidatorCommand, cwd: string, runTempPath: string): Promise<CommandExecution> {
  const executable = resolveTrustedExecutable(command.executableId);
  const sanitizedEnvironment = {
    PATH: path.dirname(process.execPath),
    NODE_ENV: "test",
    CI: "true",
    NO_COLOR: "1",
    TEMP: runTempPath,
    TMP: runTempPath,
  };
  const startedAt = new Date().toISOString();
  return new Promise((resolve) => {
    const child = spawn(executable, command.args, { cwd, shell: false, windowsHide: true, env: sanitizedEnvironment, stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let outputSize = 0;
    let outputCapped = false;
    let timedOut = false;
    const capture = (chunks: Buffer[], chunk: Buffer) => {
      const remaining = command.maxOutputBytes - outputSize;
      if (remaining > 0) chunks.push(chunk.subarray(0, remaining));
      outputSize += chunk.length;
      if (outputSize > command.maxOutputBytes) {
        outputCapped = true;
        terminateTree(child.pid);
      }
    };
    const timeout = setTimeout(() => { timedOut = true; terminateTree(child.pid); }, command.timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => capture(stdout, chunk));
    child.stderr.on("data", (chunk: Buffer) => capture(stderr, chunk));
    child.once("error", (error) => finish(null, error.name, Buffer.from(error.message)));
    child.once("close", (code, signal) => finish(code, signal, Buffer.alloc(0)));
    function finish(exitCode: number | null, signal: string | null, error: Buffer) {
      clearTimeout(timeout);
      resolve({ executable, args: command.args, exitCode, signal, timedOut, outputCapped, startedAt, completedAt: new Date().toISOString(), stdout: Buffer.concat(stdout), stderr: Buffer.concat([...stderr, error]), executionAssurance: "local_trusted" });
    }
  });
}

function terminateTree(pid: number | undefined): void {
  if (!pid) return;
  if (process.platform === "win32") {
    spawn("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { shell: false, windowsHide: true });
  } else {
    process.kill(pid, "SIGKILL");
  }
}
