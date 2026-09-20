import { NextResponse } from "next/server";
import { buildRepositoryFactPack, compileContractDraft, lintContractDraft, ContractCompilationFailure } from "@burhan/specforge";
import { findRepositoryRoot } from "@burhan/codex-runner/demo-reset";
import { apiError, checkLocalRequest, createExclusiveGate, parseTask, readLimitedJson } from "../../../../lib/local-api";

export const runtime = "nodejs";
const compileExclusively = createExclusiveGate();

export async function POST(request: Request) {
  const rejected = checkLocalRequest(request);
  if (rejected) return rejected;
  const payload = await readLimitedJson(request);
  if (!payload.ok) return payload.response;
  const task = parseTask(payload.value);
  if (task === null) return apiError("INVALID_TASK", 400);
  // Provider-backed work must be a conscious local opt-in, never a demo side effect.
  if (process.env.BURHAN_ENABLE_LIVE_COMPILER !== "1") return apiError("LIVE_COMPILER_DISABLED", 503);
  return compileExclusively(async () => {
    try {
      const repositoryRoot = await findRepositoryRoot(process.cwd());
      const facts = await buildRepositoryFactPack(repositoryRoot);
      const compilation = await compileContractDraft(task, facts);
      const lint = lintContractDraft(compilation.draft, task, facts);
      return NextResponse.json({ draft: compilation.draft, metadata: compilation.metadata, lint, factPackHash: facts.packageManifest.manifestHash }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      const code = sanitizeCompilationError(error);
      return apiError(code, code === "API_KEY_MISSING" ? 503 : 500);
    }
  });
}

function sanitizeCompilationError(error: unknown): string {
  if (error instanceof ContractCompilationFailure) return error.category;
  if (!(error instanceof Error)) return "COMPILATION_FAILED";
  return ["API_KEY_MISSING", "MODEL_REFUSAL", "MODEL_OUTPUT_NOT_PARSED", "MODEL_REQUEST_TIMEOUT", "MODEL_RATE_LIMITED", "MODEL_TRANSIENT_FAILURE"].includes(error.message)
    ? error.message : "COMPILATION_FAILED";
}
