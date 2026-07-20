export type JsonSchema = Record<string, unknown>;
export type StrictSchemaIssueCode =
  | "OBJECT_ADDITIONAL_PROPERTIES_MISSING"
  | "OBJECT_ADDITIONAL_PROPERTIES_NOT_FALSE"
  | "REQUIRED_MISSING"
  | "REQUIRED_PROPERTY_MISSING"
  | "REQUIRED_UNKNOWN_PROPERTY"
  | "REQUIRED_DUPLICATE_PROPERTY"
  | "REQUIRED_ORDER_INVALID"
  | "UNRESOLVED_LOCAL_REF"
  | "EXTERNAL_REF_UNSUPPORTED"
  | "OPEN_ENDED_OBJECT_MAP"
  | "UNSUPPORTED_SCHEMA_KEYWORD"
  | "ROOT_NOT_OBJECT";

export type StrictSchemaIssue = { code: StrictSchemaIssueCode; pointer: string };
export type StrictSchemaPreflight = {
  valid: boolean;
  issues: StrictSchemaIssue[];
  stats: { objectNodes: number; closedObjectNodes: number; openEndedObjectMaps: number; unresolvedReferences: number; unsupportedKeywords: number };
};

const unsupportedKeywords = new Set(["allOf", "not", "if", "then", "else", "dependentRequired", "dependentSchemas", "minContains", "maxContains", "contains"]);

export function strictifyOutputSchema(source: JsonSchema): JsonSchema {
  return deepFreeze(strictifyNode(clone(source)) as JsonSchema);
}

export function strictSchemaPreflight(schema: JsonSchema): StrictSchemaPreflight {
  const issues: StrictSchemaIssue[] = [];
  const stats = { objectNodes: 0, closedObjectNodes: 0, openEndedObjectMaps: 0, unresolvedReferences: 0, unsupportedKeywords: 0 };
  if (!isObjectSchema(schema)) add(issues, "ROOT_NOT_OBJECT", "");
  inspect(schema, "", schema, issues, stats);
  return { valid: issues.length === 0, issues, stats };
}

function strictifyNode(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strictifyNode);
  if (!isRecord(value)) return value;
  const result: JsonSchema = {};
  const sourceRequired = new Set(Array.isArray(value.required) ? value.required.filter((entry): entry is string => typeof entry === "string") : []);
  for (const key of Object.keys(value).sort()) {
    const child = value[key];
    if (key === "minContains" && child === 0) continue;
    if (key === "required" && isRecord(value.properties)) continue;
    if (key === "properties" && isRecord(child)) {
      const properties: JsonSchema = {};
      for (const propertyName of Object.keys(child).sort()) {
        const propertySchema = strictifyNode(child[propertyName]);
        properties[propertyName] = sourceRequired.has(propertyName) ? propertySchema : nullable(propertySchema);
      }
      result.properties = properties;
      result.required = Object.keys(properties);
      continue;
    }
    if ((key === "$defs" || key === "definitions") && isRecord(child)) {
      result[key] = Object.fromEntries(Object.keys(child).sort().map((name) => [name, strictifyNode(child[name])]));
      continue;
    }
    if (key === "items" || key === "additionalProperties") {
      result[key] = isRecord(child) || Array.isArray(child) ? strictifyNode(child) : child;
      continue;
    }
    if (key === "anyOf" || key === "oneOf") {
      result[key] = Array.isArray(child) ? child.map(strictifyNode) : child;
      continue;
    }
    result[key] = clone(child);
  }
  if (isObjectSchema(result)) result.additionalProperties = false;
  return result;
}

function inspect(node: unknown, pointer: string, root: JsonSchema, issues: StrictSchemaIssue[], stats: StrictSchemaPreflight["stats"]): void {
  if (Array.isArray(node)) { node.forEach((entry, index) => inspect(entry, `${pointer}/${index}`, root, issues, stats)); return; }
  if (!isRecord(node)) return;
  for (const key of Object.keys(node)) if (unsupportedKeywords.has(key)) { add(issues, "UNSUPPORTED_SCHEMA_KEYWORD", pointer); stats.unsupportedKeywords += 1; }
  const ref = node.$ref;
  if (typeof ref === "string") inspectReference(ref, pointer, root, issues, stats);
  if (isObjectSchema(node)) inspectObject(node, pointer, issues, stats);
  if (isRecord(node.properties)) for (const [name, child] of Object.entries(node.properties)) inspect(child, `${pointer}/properties/${escapePointer(name)}`, root, issues, stats);
  for (const key of ["$defs", "definitions"] as const) if (isRecord(node[key])) for (const [name, child] of Object.entries(node[key] as JsonSchema)) inspect(child, `${pointer}/${key}/${escapePointer(name)}`, root, issues, stats);
  if (isRecord(node.items) || Array.isArray(node.items)) inspect(node.items, `${pointer}/items`, root, issues, stats);
  for (const key of ["anyOf", "oneOf"] as const) if (Array.isArray(node[key])) node[key].forEach((child, index) => inspect(child, `${pointer}/${key}/${index}`, root, issues, stats));
  if (isRecord(node.additionalProperties)) { add(issues, "OPEN_ENDED_OBJECT_MAP", pointer); stats.openEndedObjectMaps += 1; }
}

function inspectObject(node: JsonSchema, pointer: string, issues: StrictSchemaIssue[], stats: StrictSchemaPreflight["stats"]): void {
  stats.objectNodes += 1;
  if (!("additionalProperties" in node)) add(issues, "OBJECT_ADDITIONAL_PROPERTIES_MISSING", pointer);
  else if (node.additionalProperties !== false) add(issues, "OBJECT_ADDITIONAL_PROPERTIES_NOT_FALSE", pointer);
  else stats.closedObjectNodes += 1;
  const properties = isRecord(node.properties) ? node.properties : {};
  if (!Array.isArray(node.required)) { add(issues, "REQUIRED_MISSING", pointer); return; }
  const seen = new Set<string>();
  for (const name of node.required) {
    if (typeof name !== "string" || !(name in properties)) add(issues, "REQUIRED_UNKNOWN_PROPERTY", pointer);
    else if (seen.has(name)) add(issues, "REQUIRED_DUPLICATE_PROPERTY", pointer);
    else seen.add(name);
  }
  for (const name of Object.keys(properties)) if (!seen.has(name)) add(issues, "REQUIRED_PROPERTY_MISSING", pointer);
  const propertyOrder = Object.keys(properties);
  if (node.required.length !== propertyOrder.length || node.required.some((name, index) => name !== propertyOrder[index])) add(issues, "REQUIRED_ORDER_INVALID", pointer);
}

function inspectReference(ref: string, pointer: string, root: JsonSchema, issues: StrictSchemaIssue[], stats: StrictSchemaPreflight["stats"]): void {
  if (!ref.startsWith("#/")) { add(issues, "EXTERNAL_REF_UNSUPPORTED", pointer); stats.unresolvedReferences += 1; return; }
  const resolved = resolvePointer(root, ref.slice(1));
  if (!resolved || !(ref.startsWith("#/$defs/") || ref.startsWith("#/definitions/"))) { add(issues, "UNRESOLVED_LOCAL_REF", pointer); stats.unresolvedReferences += 1; }
}

function resolvePointer(root: JsonSchema, pointer: string): unknown {
  return pointer.split("/").slice(1).reduce<unknown>((current, part) => isRecord(current) ? current[part.replace(/~1/g, "/").replace(/~0/g, "~")] : undefined, root);
}

function nullable(schema: unknown): unknown {
  if (!isRecord(schema) || acceptsNull(schema)) return schema;
  if (typeof schema.type === "string") return { ...schema, type: [schema.type, "null"] };
  return { anyOf: [schema, { type: "null" }] };
}

function acceptsNull(schema: JsonSchema): boolean {
  return schema.type === "null" || (Array.isArray(schema.type) && schema.type.includes("null")) || ["anyOf", "oneOf"].some((key) => Array.isArray(schema[key]) && (schema[key] as unknown[]).some((branch) => isRecord(branch) && acceptsNull(branch)));
}

function isObjectSchema(value: unknown): value is JsonSchema {
  return isRecord(value) && (value.type === "object" || (Array.isArray(value.type) && value.type.includes("object")) || isRecord(value.properties));
}

function isRecord(value: unknown): value is JsonSchema { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function deepFreeze<T>(value: T): T { if (value && typeof value === "object") { Object.freeze(value); for (const entry of Object.values(value as Record<string, unknown>)) deepFreeze(entry); } return value; }
function add(issues: StrictSchemaIssue[], code: StrictSchemaIssueCode, pointer: string): void { issues.push({ code, pointer: pointer || "/" }); }
function escapePointer(value: string): string { return value.replace(/~/g, "~0").replace(/\//g, "~1"); }
