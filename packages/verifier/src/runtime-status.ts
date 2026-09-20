export type RuntimeCheckStatus = "pass" | "fail" | "blocked";
export type RuntimeCheckVerdict = "verified" | "rejected" | "incomplete";

/** Missing or interrupted execution never becomes success or a functional rejection. */
export function reduceRuntimeStatuses(statuses: readonly unknown[]): RuntimeCheckVerdict {
  if (!Array.isArray(statuses) || statuses.length === 0) return "incomplete";
  let rejected = false;
  // Iteration observes sparse-array holes as undefined instead of silently skipping them.
  for (const status of statuses) {
    if (status !== "pass" && status !== "fail") return "incomplete";
    if (status === "fail") rejected = true;
  }
  return rejected ? "rejected" : "verified";
}
