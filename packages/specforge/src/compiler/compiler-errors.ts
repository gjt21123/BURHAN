export type LiveEvaluationCategory =
  | "API_KEY_MISSING"
  | "API_AUTHENTICATION_FAILED"
  | "API_QUOTA_UNAVAILABLE"
  | "API_RATE_LIMITED_TRANSIENT"
  | "MODEL_ACCESS_UNAVAILABLE"
  | "MODEL_REQUEST_TIMEOUT"
  | "MODEL_TRANSIENT_FAILURE";

type ProviderErrorLike = { status?: unknown; code?: unknown; type?: unknown; request_id?: unknown; name?: unknown };

export class ContractCompilationFailure extends Error {
  constructor(
    public readonly category: LiveEvaluationCategory,
    public readonly retryable: boolean,
    public readonly requestReachedProvider: boolean,
    public readonly providerRequestId: string | null,
  ) {
    super(category);
  }
}

export function classifyCompilationError(error: unknown): ContractCompilationFailure {
  const candidate = (error ?? {}) as ProviderErrorLike;
  const status = typeof candidate.status === "number" ? candidate.status : null;
  const code = typeof candidate.code === "string" ? candidate.code : null;
  const type = typeof candidate.type === "string" ? candidate.type : null;
  const providerRequestId = typeof candidate.request_id === "string" ? candidate.request_id : null;
  const reached = status !== null || providerRequestId !== null;
  if (code === "insufficient_quota" || type === "insufficient_quota") return new ContractCompilationFailure("API_QUOTA_UNAVAILABLE", false, true, providerRequestId);
  if (status === 401) return new ContractCompilationFailure("API_AUTHENTICATION_FAILED", false, true, providerRequestId);
  if (status === 403 || code === "model_not_found") return new ContractCompilationFailure("MODEL_ACCESS_UNAVAILABLE", false, true, providerRequestId);
  if (status === 429) return new ContractCompilationFailure("API_RATE_LIMITED_TRANSIENT", true, true, providerRequestId);
  if (candidate.name === "APIConnectionTimeoutError" || candidate.name === "APIUserAbortError") return new ContractCompilationFailure("MODEL_REQUEST_TIMEOUT", false, reached, providerRequestId);
  return new ContractCompilationFailure("MODEL_TRANSIENT_FAILURE", true, reached, providerRequestId);
}
