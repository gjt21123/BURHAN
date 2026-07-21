import { ensureDemoRoot, findRepositoryRoot, resetDemo } from "@burhan/codex-runner/demo-reset";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const repositoryRoot = await findRepositoryRoot(process.cwd());
    await ensureDemoRoot(repositoryRoot);
    const result = await resetDemo({ repositoryRoot });
    return NextResponse.json({ status: "RESET_COMPLETE", state: result.state });
  } catch (error) {
    const category = error instanceof Error && error.message.startsWith("DEMO_RESET_") ? error.message : "DEMO_RESET_FAILED";
    return NextResponse.json({ status: "RESET_FAILED", category }, { status: 500 });
  }
}
