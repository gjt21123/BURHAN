import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson } from "@burhan/core";
import { zodToJsonSchema } from "zod-to-json-schema";
import { validatorBlueprintSchema } from "./schemas.js";
import { strictifyOutputSchema, strictSchemaPreflight, type JsonSchema, type StrictSchemaPreflight } from "./strict-output-schema.js";

export const validatorBlueprintSchemaConverter = "zod-to-json-schema@3.24.6";
export const validatorBlueprintProviderSchemaVersion = "1";

export function createValidatorBlueprintOutputSchema(): JsonSchema {
  const generated = zodToJsonSchema(validatorBlueprintSchema, { target: "jsonSchema7", $refStrategy: "none" }) as JsonSchema;
  return strictifyOutputSchema(replaceParameterRecord(generated));
}

export async function prepareValidatorBlueprintOutputSchema(protectedPath: string): Promise<{ schema: JsonSchema; schemaPath: string | null; preflight: StrictSchemaPreflight; deterministic: boolean }> {
  const schema = createValidatorBlueprintOutputSchema();
  const preflight = strictSchemaPreflight(schema);
  if (!preflight.valid) return { schema, schemaPath: null, preflight, deterministic: false };
  const serialized = canonicalJson(schema);
  const deterministic = serialized === canonicalJson(createValidatorBlueprintOutputSchema());
  const schemaPath = path.join(protectedPath, "architect-output-schema.json");
  const temporaryPath = `${schemaPath}.tmp`;
  await writeFile(temporaryPath, serialized, "utf8");
  await rename(temporaryPath, schemaPath);
  const reread = JSON.parse(await readFile(schemaPath, "utf8")) as JsonSchema;
  const rereadPreflight = strictSchemaPreflight(reread);
  if (!rereadPreflight.valid || canonicalJson(reread) !== serialized) return { schema, schemaPath: null, preflight: rereadPreflight, deterministic: false };
  return { schema, schemaPath, preflight: rereadPreflight, deterministic };
}

export function normalizeProviderValidatorBlueprint(value: unknown): unknown {
  if (!isRecord(value) || !Array.isArray(value.validators)) return value;
  const normalized = JSON.parse(JSON.stringify(value)) as JsonSchema;
  const validators = normalized.validators as unknown[];
  normalized.validators = validators.map((validator) => {
    if (!isRecord(validator) || !isRecord(validator.parameters)) return validator;
    const parameters = Object.fromEntries(Object.entries(validator.parameters).filter(([, parameter]) => parameter !== null));
    return { ...validator, parameters };
  });
  return normalized;
}

function replaceParameterRecord(schema: JsonSchema): JsonSchema {
  const cloned = JSON.parse(JSON.stringify(schema)) as JsonSchema;
  visit(cloned);
  return cloned;
}

function visit(node: unknown): void {
  if (Array.isArray(node)) { node.forEach(visit); return; }
  if (!isRecord(node)) return;
  if (isRecord(node.properties) && isRecord(node.properties.parameters) && isOpenMap(node.properties.parameters)) node.properties.parameters = fixedParametersSchema();
  for (const key of ["properties", "$defs", "definitions"] as const) if (isRecord(node[key])) Object.values(node[key] as JsonSchema).forEach(visit);
  if (isRecord(node.items) || Array.isArray(node.items)) visit(node.items);
  for (const key of ["anyOf", "oneOf"] as const) if (Array.isArray(node[key])) node[key].forEach(visit);
}

function fixedParametersSchema(): JsonSchema {
  return {
    type: "object",
    properties: {
      amount: { type: ["number", "null"] },
      documentationPath: { type: ["string", "null"] },
      expectedCharges: { type: ["integer", "null"] },
      key: { type: ["string", "null"] },
      keyCount: { type: ["integer", "null"] },
      keys: { anyOf: [{ type: "array", items: { type: "string" } }, { type: "null" }] },
      requestCount: { type: ["integer", "null"] },
      requiredTerms: { anyOf: [{ type: "array", items: { type: "string" } }, { type: "null" }] }
    },
    required: ["amount", "documentationPath", "expectedCharges", "key", "keyCount", "keys", "requestCount", "requiredTerms"],
    additionalProperties: false
  };
}

function isOpenMap(value: JsonSchema): boolean { return value.type === "object" && isRecord(value.additionalProperties); }
function isRecord(value: unknown): value is JsonSchema { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
