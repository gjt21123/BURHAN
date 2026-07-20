import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { canonicalJson } from "@burhan/core";
import { createValidatorBlueprintOutputSchema, prepareValidatorBlueprintOutputSchema } from "../provider-output-schema.js";
import { strictSchemaPreflight } from "../strict-output-schema.js";

const originalInvalidFixture = { type: "object", properties: { validator: { type: "object", properties: {} } }, required: ["validator"], additionalProperties: false };
const originalInvalidResult = strictSchemaPreflight(originalInvalidFixture);
const stage = await mkdtemp(path.join(os.tmpdir(), "burhan-codex-schema-"));
let passed = false;
let objectNodes = 0;
let closedObjectNodes = 0;
let unresolvedReferences = 0;
let unsupportedKeywords = 0;
let openEndedObjectMaps = 0;
let deterministic = false;
try {
  const prepared = await prepareValidatorBlueprintOutputSchema(stage);
  const reread = prepared.schemaPath ? JSON.parse(await readFile(prepared.schemaPath, "utf8")) : null;
  const actual = strictSchemaPreflight(prepared.schema);
  objectNodes = actual.stats.objectNodes;
  closedObjectNodes = actual.stats.closedObjectNodes;
  unresolvedReferences = actual.stats.unresolvedReferences;
  unsupportedKeywords = actual.stats.unsupportedKeywords;
  openEndedObjectMaps = actual.stats.openEndedObjectMaps;
  deterministic = prepared.deterministic && canonicalJson(createValidatorBlueprintOutputSchema()) === canonicalJson(prepared.schema);
  passed = originalInvalidResult.issues.some((issue) => issue.code === "OBJECT_ADDITIONAL_PROPERTIES_MISSING") && actual.valid && strictSchemaPreflight(reread).valid && deterministic && objectNodes === closedObjectNodes;
} finally { await rm(stage, { recursive: true, force: true }); }

console.log("BURHAN CODEX OUTPUT SCHEMA PREFLIGHT\n");
console.log(`Root object:                     ${passed ? "PASS" : "FAIL"}`);
console.log(`Object nodes inspected:          ${objectNodes}`);
console.log(`Closed object nodes:             ${closedObjectNodes}`);
console.log(`Required sets complete:          ${passed ? "PASS" : "FAIL"}`);
console.log(`Open-ended maps:                 ${openEndedObjectMaps}`);
console.log(`Unresolved references:           ${unresolvedReferences}`);
console.log(`Unsupported keywords:            ${unsupportedKeywords}`);
console.log(`Deterministic serialization:     ${deterministic ? "PASS" : "FAIL"}`);
console.log(`Original invalid fixture:        ${originalInvalidResult.valid ? "FAIL" : "CODEX_OUTPUT_SCHEMA_PREFLIGHT_FAILED"}`);
console.log("Provider attempts:               0");
console.log(`Result:                          ${passed ? "PASS" : "FAIL"}`);
process.exitCode = passed ? 0 : 1;
