export type RepairResumeLifecycle = { threadStarted: boolean; threadId: string | null; turnCompleted: boolean; turnFailed: boolean; timedOut: boolean };
export function classifyRepairResume(lifecycle: RepairResumeLifecycle, expectedThreadId: string, availability: "AVAILABLE" | "UNAVAILABLE" | "USAGE_UNAVAILABLE"): "READY" | "REPAIR_THREAD_MISMATCH" | "REPAIR_INCOMPLETE" {
  if (availability !== "AVAILABLE" || lifecycle.timedOut || lifecycle.turnFailed || !lifecycle.threadStarted || !lifecycle.turnCompleted) return "REPAIR_INCOMPLETE";
  return lifecycle.threadId === expectedThreadId ? "READY" : "REPAIR_THREAD_MISMATCH";
}
export function repairResumeArguments(threadId: string, prompt: string, outputPath: string): string[] { return ["exec", "resume", "--json", "--output-last-message", outputPath, threadId, prompt]; }
