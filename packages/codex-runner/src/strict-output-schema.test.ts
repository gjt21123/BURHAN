import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createValidatorBlueprintOutputSchema, prepareValidatorBlueprintOutputSchema } from "./provider-output-schema.js";
import { strictifyOutputSchema, strictSchemaPreflight, type JsonSchema } from "./strict-output-schema.js";

const closed = (properties: JsonSchema = {}): JsonSchema => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const issueCodes = (schema: JsonSchema): string[] => strictSchemaPreflight(schema).issues.map((issue) => issue.code);

describe("strict output schema", () => {
  it("closes root, nested, and array item objects", () => {
    const schema = strictifyOutputSchema({ type: "object", properties: { nested: { type: "object", properties: { item: { type: "array", items: { type: "object", properties: { name: { type: "string" } } } } } } } });
    expect(strictSchemaPreflight(schema).valid).toBe(true);
  });

  it("closes every object branch in anyOf", () => {
    const schema = strictifyOutputSchema({ type: "object", properties: { choice: { anyOf: [{ type: "object", properties: { left: { type: "string" } } }, { type: "object", properties: { right: { type: "string" } } }] } } });
    expect(strictSchemaPreflight(schema).valid).toBe(true);
  });

  it("closes objects in both definition formats", () => {
    const schema = strictifyOutputSchema({ type: "object", properties: {}, $defs: { left: { type: "object", properties: { a: { type: "string" } } } }, definitions: { right: { type: "object", properties: { b: { type: "string" } } } } });
    expect(strictSchemaPreflight(schema).valid).toBe(true);
  });

  it("regenerates required properties in deterministic property order", () => {
    const schema = strictifyOutputSchema({ type: "object", properties: { zeta: { type: "string" }, alpha: { type: "number" } }, required: ["zeta"] });
    expect(schema.required).toEqual(["alpha", "zeta"]);
  });

  it("converts optional strings and nested objects to nullable required fields", () => {
    const schema = strictifyOutputSchema({ type: "object", properties: { text: { type: "string" }, nested: { type: "object", properties: { name: { type: "string" } } } }, required: [] });
    const properties = schema.properties as JsonSchema;
    expect((properties.text as JsonSchema).type).toEqual(["string", "null"]);
    expect((properties.nested as JsonSchema).type).toEqual(["object", "null"]);
    expect(strictSchemaPreflight(schema).valid).toBe(true);
  });

  it("rejects open-ended maps, unresolved refs, external refs, and unsupported keywords", () => {
    expect(issueCodes({ type: "object", properties: {}, required: [], additionalProperties: { type: "string" } })).toContain("OPEN_ENDED_OBJECT_MAP");
    expect(issueCodes({ ...closed(), properties: { x: { $ref: "#/$defs/missing" } }, required: ["x"] })).toContain("UNRESOLVED_LOCAL_REF");
    expect(issueCodes({ ...closed(), properties: { x: { $ref: "https://example.invalid/schema" } }, required: ["x"] })).toContain("EXTERNAL_REF_UNSUPPORTED");
    expect(issueCodes({ ...closed(), allOf: [] })).toContain("UNSUPPORTED_SCHEMA_KEYWORD");
  });

  it("detects duplicate and unknown required properties", () => {
    const duplicate = { type: "object", properties: { name: { type: "string" } }, required: ["name", "name"], additionalProperties: false };
    const unknown = { type: "object", properties: {}, required: ["missing"], additionalProperties: false };
    expect(issueCodes(duplicate)).toContain("REQUIRED_DUPLICATE_PROPERTY");
    expect(issueCodes(unknown)).toContain("REQUIRED_UNKNOWN_PROPERTY");
    const unordered = { type: "object", properties: { alpha: { type: "string" }, zeta: { type: "string" } }, required: ["zeta", "alpha"], additionalProperties: false };
    expect(issueCodes(unordered)).toContain("REQUIRED_ORDER_INVALID");
  });

  it("does not mutate sources and produces deterministic output", () => {
    const source = { type: "object", properties: { name: { type: "string" } } };
    const before = JSON.stringify(source);
    const first = JSON.stringify(strictifyOutputSchema(source));
    const second = JSON.stringify(strictifyOutputSchema(source));
    expect(JSON.stringify(source)).toBe(before);
    expect(first).toBe(second);
  });

  it("preflights and round-trips the actual ValidatorBlueprint provider schema", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "burhan-schema-"));
    try {
      const prepared = await prepareValidatorBlueprintOutputSchema(directory);
      expect(prepared.preflight.valid).toBe(true);
      expect(prepared.schemaPath).not.toBeNull();
      expect(JSON.parse(await readFile(prepared.schemaPath!, "utf8"))).toEqual(prepared.schema);
      expect(prepared.preflight.stats.objectNodes).toBe(prepared.preflight.stats.closedObjectNodes);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it("reproduces the original invalid schema as a preflight block without a provider call", () => {
    const invalid = { type: "object", properties: { nested: { type: "object", properties: {} } }, required: ["nested"], additionalProperties: false };
    expect(strictSchemaPreflight(invalid).valid).toBe(false);
    expect(issueCodes(invalid)).toContain("OBJECT_ADDITIONAL_PROPERTIES_MISSING");
  });

  it("accepts resolved local definition references", () => {
    const schema = { type: "object", properties: { value: { $ref: "#/$defs/value" } }, required: ["value"], additionalProperties: false, $defs: { value: closed({ name: { type: "string" } }) } };
    expect(strictSchemaPreflight(schema).valid).toBe(true);
  });

  it("removes only semantically inert minContains zero", () => {
    expect(strictSchemaPreflight(strictifyOutputSchema({ type: "object", properties: { values: { type: "array", items: { type: "string" }, minContains: 0 } } })).valid).toBe(true);
    expect(issueCodes(strictifyOutputSchema({ type: "object", properties: { values: { type: "array", items: { type: "string" }, minContains: 1 } } }))).toContain("UNSUPPORTED_SCHEMA_KEYWORD");
  });
});
