import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type WorkerResult = { ok: boolean; category?: string; finalOutput?: string; finalOutputHash?: string; lifecycle: { eventTypes: string[]; threadId: string | null; threadStarted: boolean; turnStarted: boolean; turnCompleted: boolean; turnFailed: boolean; jsonLinesReceived: number; jsonParseFailures: number; processExitCode: number | null; signal: string | null; timedOut: boolean; errors: Array<{ type: string; code: string | null; errorType: string | null; message: string }> } };

export async function runCodexWorker(request: object): Promise<WorkerResult> {
  const worker = fileURLToPath(new URL("./worker.ts", import.meta.url));
  const tsx = path.resolve(path.dirname(worker), "../../../node_modules/tsx/dist/cli.mjs");
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [tsx, worker], { shell: false, windowsHide: true, stdio: ["pipe", "pipe", "ignore"] });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString("utf8"); });
    child.stdin.end(`${JSON.stringify(request)}\n`);
    child.once("error", () => resolve({ ok: false, category: "CODEX_WORKER_CRASHED", lifecycle: emptyLifecycle() }));
    child.once("close", () => { try { resolve(JSON.parse(output.trim()) as WorkerResult); } catch { resolve({ ok: false, category: "CODEX_WORKER_CRASHED", lifecycle: emptyLifecycle() }); } });
  });
}

function emptyLifecycle(): WorkerResult["lifecycle"] { return { eventTypes: [], threadId: null, threadStarted: false, turnStarted: false, turnCompleted: false, turnFailed: false, jsonLinesReceived: 0, jsonParseFailures: 0, processExitCode: null, signal: null, timedOut: false, errors: [] }; }
