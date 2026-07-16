import { NextResponse } from "next/server";
import { buildRepositoryFactPack, compileContractDraft, lintContractDraft } from "@burhan/specforge";
import { ContractCompilationFailure } from "@burhan/specforge";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json() as { task?: unknown };
  if (typeof payload.task !== "string" || payload.task.trim().length === 0) {
    return NextResponse.json({ error: "TASK_REQUIRED" }, { status: 400 });
  }
  try {
    const repositoryRoot = process.cwd();
    const facts = await buildRepositoryFactPack(repositoryRoot);
    const compilation = await compileContractDraft(payload.task, facts);
    const lint = lintContractDraft(compilation.draft, payload.task, facts);
    return NextResponse.json({ draft: compilation.draft, metadata: compilation.metadata, lint, factPackHash: facts.packageManifest.manifestHash });
  } catch (error) {
    const code = sanitizeCompilationError(error);
    const status = code === "API_KEY_MISSING" ? 503 : 500;
    return NextResponse.json({ error: code }, { status });
  }
}

function sanitizeCompilationError(error: unknown): string {
  if (error instanceof ContractCompilationFailure) return error.category;
  if (!(error instanceof Error)) return "COMPILATION_FAILED";
  return ["API_KEY_MISSING", "MODEL_REFUSAL", "MODEL_OUTPUT_NOT_PARSED", "MODEL_REQUEST_TIMEOUT", "MODEL_RATE_LIMITED", "MODEL_TRANSIENT_FAILURE"].includes(error.message)
    ? error.message
    : "COMPILATION_FAILED";
}
