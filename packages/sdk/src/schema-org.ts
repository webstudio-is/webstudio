import {
  schemaOrgPropertyRows,
  schemaOrgTypeRows,
} from "./__generated__/schema-org-data";
import {
  validateJsonLd,
  type JsonLdStructuralDiagnostic,
  type JsonLdValidationResult,
  type JsonLdValue,
} from "./json-ld";
import { appendJsonPath, getJsonLdTypes, isJsonObject } from "./json-ld-utils";

export type SchemaOrgDiagnostic = {
  severity: "warning";
  code:
    | "unknown-schema-org-type"
    | "deprecated-schema-org-type"
    | "unknown-schema-org-property"
    | "deprecated-schema-org-property"
    | "unsupported-schema-org-property"
    | "incompatible-schema-org-value";
  path: string;
  message: string;
};

export type JsonLdSchemaOrgValidationResult =
  | {
      success: true;
      value: JsonLdValue;
      diagnostics: Array<JsonLdStructuralDiagnostic | SchemaOrgDiagnostic>;
    }
  | JsonLdValidationResult;

type VocabularyState = {
  vocabulary: "schema-org" | "other" | undefined;
  terms: Map<string, string | null>;
};

const typeByName = new Map(
  schemaOrgTypeRows.map(([name, parentTypes, supersededBy]) => [
    name,
    { parentTypes, supersededBy },
  ])
);

const propertyByName = new Map(
  schemaOrgPropertyRows.map(([name, domains, ranges, supersededBy]) => [
    name,
    { domains, ranges, supersededBy },
  ])
);

const schemaOrgContextPattern = /^https?:\/\/(?:www\.)?schema\.org\/?$/i;
const schemaOrgTermPattern = /^https?:\/\/(?:www\.)?schema\.org\/([^/#]+)$/i;

const getMappedIri = (definition: unknown) => {
  if (typeof definition === "string") {
    return definition;
  }
  if (isJsonObject(definition) && typeof definition["@id"] === "string") {
    return definition["@id"];
  }
  return definition === null ? null : undefined;
};

const applyContext = (
  inherited: VocabularyState,
  context: unknown
): VocabularyState => {
  if (context === undefined) {
    return inherited;
  }
  if (context === null) {
    return { vocabulary: undefined, terms: new Map() };
  }
  if (Array.isArray(context)) {
    return context.reduce(applyContext, inherited);
  }
  const next: VocabularyState = {
    vocabulary: inherited.vocabulary,
    terms: new Map(inherited.terms),
  };
  if (typeof context === "string") {
    next.vocabulary = schemaOrgContextPattern.test(context)
      ? "schema-org"
      : "other";
    return next;
  }
  if (isJsonObject(context) === false) {
    return next;
  }
  if (context["@vocab"] === null) {
    next.vocabulary = undefined;
  } else if (typeof context["@vocab"] === "string") {
    next.vocabulary = schemaOrgContextPattern.test(context["@vocab"])
      ? "schema-org"
      : "other";
  }
  for (const [term, definition] of Object.entries(context)) {
    if (term.startsWith("@")) {
      continue;
    }
    const iri = getMappedIri(definition);
    if (iri !== undefined) {
      next.terms.set(term, iri);
    }
  }
  return next;
};

const expandTerm = (value: string, state: VocabularyState) => {
  if (value.startsWith("@")) {
    return;
  }
  const directSchemaOrgMatch = value.match(schemaOrgTermPattern);
  if (directSchemaOrgMatch !== null) {
    return directSchemaOrgMatch[1];
  }
  const mapped = state.terms.get(value);
  if (mapped !== undefined) {
    if (mapped === null) {
      return;
    }
    return mapped.match(schemaOrgTermPattern)?.[1];
  }
  const colon = value.indexOf(":");
  if (colon > 0) {
    const prefix = state.terms.get(value.slice(0, colon));
    if (typeof prefix === "string") {
      return `${prefix}${value.slice(colon + 1)}`.match(
        schemaOrgTermPattern
      )?.[1];
    }
    return;
  }
  return state.vocabulary === "schema-org" ? value : undefined;
};

const isTypeOrSubtypeOf = (
  type: string,
  expected: string,
  visited = new Set<string>()
): boolean => {
  if (type === expected) {
    return true;
  }
  if (visited.has(type)) {
    return false;
  }
  visited.add(type);
  return (
    typeByName
      .get(type)
      ?.parentTypes.some((parent) =>
        isTypeOrSubtypeOf(parent, expected, visited)
      ) ?? false
  );
};

const primitiveRangeMatches = (range: string, value: unknown) => {
  if (range === "Boolean") {
    return typeof value === "boolean";
  }
  if (range === "Integer") {
    return typeof value === "number" && Number.isInteger(value);
  }
  if (["Float", "Number"].includes(range)) {
    return typeof value === "number";
  }
  if (
    [
      "CssSelectorType",
      "Date",
      "DateTime",
      "PronounceableText",
      "Text",
      "Time",
      "URL",
      "XPathType",
    ].includes(range)
  ) {
    return typeof value === "string";
  }
};

const hasIncompatiblePrimitiveRange = (
  ranges: readonly string[],
  value: unknown
) => {
  const results = ranges.map((range) => primitiveRangeMatches(range, value));
  return (
    results.length > 0 &&
    results.every((result) => result !== undefined) &&
    results.every((result) => result === false)
  );
};

const validateNode = (
  value: unknown,
  path: string,
  inheritedState: VocabularyState,
  diagnostics: SchemaOrgDiagnostic[]
) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateNode(
        item,
        appendJsonPath(path, index),
        inheritedState,
        diagnostics
      )
    );
    return;
  }
  if (isJsonObject(value) === false) {
    return;
  }
  const state = applyContext(inheritedState, value["@context"]);
  const types = getJsonLdTypes(value["@type"])
    .map((type) => expandTerm(type, state))
    .filter((type): type is string => type !== undefined);

  for (const type of types) {
    const definition = typeByName.get(type);
    if (definition === undefined) {
      diagnostics.push({
        severity: "warning",
        code: "unknown-schema-org-type",
        path: appendJsonPath(path, "@type"),
        message: `${JSON.stringify(type)} is not a known Schema.org type.`,
      });
    } else if (definition.supersededBy !== "") {
      diagnostics.push({
        severity: "warning",
        code: "deprecated-schema-org-type",
        path: appendJsonPath(path, "@type"),
        message: `${type} is superseded by ${definition.supersededBy}.`,
      });
    }
  }

  for (const [property, propertyValue] of Object.entries(value)) {
    const propertyPath = appendJsonPath(path, property);
    if (property.startsWith("@")) {
      if (
        ["@graph", "@included", "@list", "@nest", "@set", "@reverse"].includes(
          property
        )
      ) {
        validateNode(propertyValue, propertyPath, state, diagnostics);
      }
      continue;
    }
    const schemaOrgProperty = expandTerm(property, state);
    if (schemaOrgProperty !== undefined) {
      const definition = propertyByName.get(schemaOrgProperty);
      if (definition === undefined) {
        diagnostics.push({
          severity: "warning",
          code: "unknown-schema-org-property",
          path: propertyPath,
          message: `${JSON.stringify(schemaOrgProperty)} is not a known Schema.org property.`,
        });
      } else {
        if (definition.supersededBy !== "") {
          diagnostics.push({
            severity: "warning",
            code: "deprecated-schema-org-property",
            path: propertyPath,
            message: `${schemaOrgProperty} is superseded by ${definition.supersededBy}.`,
          });
        }
        if (
          types.length > 0 &&
          definition.domains.length > 0 &&
          types.every((type) =>
            definition.domains.every(
              (domain) => isTypeOrSubtypeOf(type, domain) === false
            )
          )
        ) {
          diagnostics.push({
            severity: "warning",
            code: "unsupported-schema-org-property",
            path: propertyPath,
            message: `${schemaOrgProperty} is not declared for ${types.join(", ")}.`,
          });
        }
        const values = Array.isArray(propertyValue)
          ? propertyValue
          : [propertyValue];
        if (
          values.some((item) =>
            hasIncompatiblePrimitiveRange(definition.ranges, item)
          )
        ) {
          diagnostics.push({
            severity: "warning",
            code: "incompatible-schema-org-value",
            path: propertyPath,
            message: `${schemaOrgProperty} expects ${definition.ranges.join(" or ")}.`,
          });
        }
      }
    }
    if (isJsonObject(propertyValue) || Array.isArray(propertyValue)) {
      validateNode(propertyValue, propertyPath, state, diagnostics);
    }
  }
};

export const validateJsonLdWithSchemaOrg = (
  input: unknown
): JsonLdSchemaOrgValidationResult => {
  const result = validateJsonLd(input);
  if (result.success === false) {
    return result;
  }
  const diagnostics: SchemaOrgDiagnostic[] = [];
  validateNode(
    result.value,
    "$",
    { vocabulary: undefined, terms: new Map() },
    diagnostics
  );
  return {
    success: true,
    value: result.value,
    diagnostics: [...result.diagnostics, ...diagnostics],
  };
};
