import { ensureDemoRoot, findRepositoryRoot, resetDemo } from "@burhan/codex-runner/demo-reset";
import { NextResponse } from "next/server";
import { checkLocalRequest, createExclusiveGate } from "../../../../lib/local-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const resetExclusively = createExclusiveGate("DEMO_RESET_BUSY");

export async function POST(request: Request) {
  const rejected = checkLocalRequest(request, false);
  if (rejected) return rejected;
  return resetExclusively(async () => {
    try {
      const repositoryRoot = await findRepositoryRoot(process.cwd());
      await ensureDemoRoot(repositoryRoot);
      const result = await resetDemo({ repositoryRoot });
      return NextResponse.json({ status: "RESET_COMPLETE", state: result.state }, { headers: { "Cache-Control": "no-store" } });
    } catch {
      return NextResponse.json({ status: "RESET_FAILED", category: "DEMO_RESET_FAILED" }, { status: 500, headers: { "Cache-Control": "no-store" } });
    }
  });
}
