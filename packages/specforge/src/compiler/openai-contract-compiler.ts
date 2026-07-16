import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { sha256, canonicalJson } from "@burhan/core";
import { contractDraftSchema, type ContractDraft } from "../schemas/contract-draft.js";
import type { RepositoryFactPack } from "../schemas/repository-fact-pack.js";
import { buildCompilerSystemPrompt, PROMPT_VERSION } from "./compiler-prompt.js";
import { classifyCompilationError, ContractCompilationFailure } from "./compiler-errors.js";

export type CompilationMetadata = { responseId: string; model: string; promptVersion: string; schemaVersion: string; taskHash: string; factPackHash: string; draftHash: string; latencyMs: number; timestamp: string };
export async function compileContractDraft(task: string, repositoryFactPack: RepositoryFactPack): Promise<{ draft: ContractDraft; metadata: CompilationMetadata }> {
  if (!process.env.OPENAI_API_KEY) throw new Error("API_KEY_MISSING");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30_000, maxRetries: 0 });
  const startedAt = Date.now();
  let response;
  for (let attempt = 0; ; attempt += 1) {
    try {
      response = await client.responses.parse({ model: "gpt-5.6", reasoning: { effort: "medium" }, input: [{ role: "system", content: buildCompilerSystemPrompt() }, { role: "user", content: JSON.stringify({ task, repositoryFactPack }) }], text: { format: zodTextFormat(contractDraftSchema, "burhan_contract_draft") } });
      break;
    } catch (error) {
      const failure = classifyCompilationError(error);
      if (!failure.retryable || attempt >= 1) throw failure;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  const refusal = response.output.flatMap((output) => output.type === "message" ? output.content : []).find((content) => content.type === "refusal");
  if (refusal) throw new Error("MODEL_REFUSAL");
  if (!response.output_parsed) throw new Error("MODEL_OUTPUT_NOT_PARSED");
  const draft = response.output_parsed;
  return { draft, metadata: { responseId: response.id, model: response.model, promptVersion: PROMPT_VERSION, schemaVersion: "1", taskHash: sha256(task), factPackHash: sha256(canonicalJson(repositoryFactPack)), draftHash: sha256(canonicalJson(draft)), latencyMs: Date.now() - startedAt, timestamp: new Date().toISOString() } };
}
