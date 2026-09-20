# Examples

Examples are bounded repositories/tasks used to exercise BURHAN's verification model.

## payment-service

`payment-service` is the primary reference task.

The intended outcome is retry-safe payment idempotency:

- 20 concurrent requests with the same idempotency key create exactly one charge;
- distinct keys remain independent;
- API documentation names the `Idempotency-Key` header;
- migrations, tests, and dependency manifests remain protected.

The repository also includes intentionally invalid candidate patches under `../evals/cases/`. Those cases are essential: a verifier that accepts the correct case but cannot reject known-invalid cases has not demonstrated discrimination.

Examples must remain synthetic and must not contain production credentials or customer data.
