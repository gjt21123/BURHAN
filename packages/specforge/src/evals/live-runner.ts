import { buildRepositoryFactPack } from "../repository/build-fact-pack.js";
import { compileContractDraft } from "../compiler/openai-contract-compiler.js";
import { ContractCompilationFailure } from "../compiler/compiler-errors.js";

if (!process.env.OPENAI_API_KEY) {
  console.log("SPECForge LIVE EVALUATION\n\nStatus:                    SKIPPED\nCategory:                  API_KEY_MISSING\nLive cases executed:       0\nRetry attempted:           NO\nFixture evaluation status: UNAFFECTED");
} else {
  try {
    const facts = await buildRepositoryFactPack(process.cwd());
    const result = await compileContractDraft("Document the Idempotency-Key header without changing runtime behavior.", facts);
    console.log(`SPECForge LIVE EVALUATION\n\nStatus:                    COMPLETE\nModel response received:   YES\nModel:                     ${result.metadata.model}\nResponse ID:               ${result.metadata.responseId}\nLive cases executed:       1\nRetry attempted:           NO\nFixture evaluation status: UNAFFECTED`);
  } catch (error) {
    const failure = error instanceof ContractCompilationFailure ? error : new ContractCompilationFailure("MODEL_TRANSIENT_FAILURE", false, false, null);
    console.log(`SPECForge LIVE EVALUATION\n\nStatus:                    NOT_COMPLETED\nCategory:                  ${failure.category}\nAPI key propagation:       PASS\nProvider reached:          ${failure.requestReachedProvider ? "YES" : "NO"}\nModel response received:   NO\nLive cases executed:       0\nRetry attempted:           NO\nFixture evaluation status: UNAFFECTED`);
    process.exitCode = 2;
  }
}
