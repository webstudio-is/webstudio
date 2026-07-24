import {
  Kind,
  validate,
  visit,
  type DocumentNode,
  type SelectionSetNode,
  type ValueNode,
} from "graphql";
import type { BuilderAssetFieldCatalog } from "@webstudio-is/sdk";
import { appendAssetFieldPath } from "./canonical";
import { decodeAssetGraphqlFieldName } from "./graphql-fields";
import { analyzeAssetGraphqlDocument } from "./graphql-query";
import { createAssetGraphqlSchemaFromCatalog } from "./graphql";

export class AssetResourceQueryValidationError extends Error {
  readonly code: "INVALID_QUERY" | "QUERY_COMPLEXITY_EXCEEDED";
  readonly details?: Record<string, number>;

  constructor({
    code,
    message,
    details,
  }: {
    code: AssetResourceQueryValidationError["code"];
    message: string;
    details?: Record<string, number>;
  }) {
    super(message);
    this.name = "AssetResourceQueryValidationError";
    this.code = code;
    this.details = details;
  }
}

export type ValidatedAssetResourceQuery = {
  tree: DocumentNode;
  variableNames: string[];
  queryMode: "static" | "parameterized";
  astNodes: number;
  astDepth: number;
  datasetScans: number;
};

export const validateAssetResourceQuery = (
  query: string
): ValidatedAssetResourceQuery => {
  try {
    const analysis = analyzeAssetGraphqlDocument(query);
    const operations = analysis.document.definitions.filter(
      (definition) => definition.kind === Kind.OPERATION_DEFINITION
    );
    if (
      operations.length !== 1 ||
      operations[0].operation !== "query" ||
      operations[0].selectionSet.selections.length !== 1
    ) {
      throw new Error("Asset GraphQL must contain exactly one query operation");
    }
    const root = operations[0].selectionSet.selections[0];
    if (
      root.kind !== Kind.FIELD ||
      (root.name.value !== "asset" && root.name.value !== "assets")
    ) {
      throw new Error(
        "Asset GraphQL must select one asset or assets root field"
      );
    }
    let unsupportedSyntax: string | undefined;
    visit(analysis.document, {
      FragmentDefinition: () => {
        unsupportedSyntax = "fragments";
      },
      FragmentSpread: () => {
        unsupportedSyntax = "fragments";
      },
      InlineFragment: () => {
        unsupportedSyntax = "fragments";
      },
      Directive: () => {
        unsupportedSyntax = "directives";
      },
    });
    if (unsupportedSyntax !== undefined) {
      throw new Error(
        `Asset GraphQL ${unsupportedSyntax} are not supported by published query plans`
      );
    }
    const variableNames = analysis.variableNames;
    return {
      tree: analysis.document,
      variableNames,
      queryMode: variableNames.length === 0 ? "static" : "parameterized",
      astNodes: analysis.astNodes,
      astDepth: analysis.astDepth,
      datasetScans: analysis.datasetScans,
    };
  } catch (error) {
    if (error instanceof AssetResourceQueryValidationError) {
      throw error;
    }
    const message =
      error instanceof Error ? error.message : "Asset GraphQL query is invalid";
    const complexity =
      message.includes("syntax-tree limits") ||
      message.includes("too many data scans") ||
      message.includes("too many variables");
    throw new AssetResourceQueryValidationError({
      code: complexity ? "QUERY_COMPLEXITY_EXCEEDED" : "INVALID_QUERY",
      message,
    });
  }
};

export const validateAssetResourceQueryAgainstCatalog = ({
  query,
  catalog,
}: {
  query: string;
  catalog: BuilderAssetFieldCatalog;
}) => {
  const validated = validateAssetResourceQuery(query);
  const errors = validate(
    createAssetGraphqlSchemaFromCatalog(catalog),
    validated.tree
  );
  if (errors.length !== 0) {
    throw new AssetResourceQueryValidationError({
      code: "INVALID_QUERY",
      message: errors.map(({ message }) => message).join("\n"),
    });
  }
  return validated;
};

const metadataOperators = new Set([
  "exists",
  "eq",
  "ne",
  "in",
  "contains",
  "startsWith",
  "endsWith",
  "gt",
  "gte",
  "lt",
  "lte",
  "isEmpty",
]);

const sourceFieldName = (name: string, path: readonly string[]) =>
  path[0] === "properties"
    ? decodeAssetGraphqlFieldName(name)
    : name === "id"
      ? "_id"
      : name === "type"
        ? "_type"
        : name;

const formatFieldPath = (path: readonly string[]) => {
  const [first, ...rest] = path;
  if (first === undefined) {
    return;
  }
  return rest.reduce(appendAssetFieldPath, first);
};

const forEachListItem = (
  value: ValueNode,
  callback: (item: ValueNode) => void
) => {
  if (value.kind === Kind.LIST) {
    value.values.forEach(callback);
  } else {
    callback(value);
  }
};

const walkFilter = ({
  value,
  path,
  onField,
  onVariableEquality,
}: {
  value: ValueNode;
  path: readonly string[];
  onField: (path: readonly string[]) => void;
  onVariableEquality?: (name: string, path: readonly string[]) => void;
}) => {
  if (value.kind !== Kind.OBJECT) {
    return;
  }
  for (const field of value.fields) {
    const name = field.name.value;
    if (name === "AND" || name === "OR" || name === "NOT") {
      forEachListItem(field.value, (item) =>
        walkFilter({ value: item, path, onField, onVariableEquality })
      );
      continue;
    }
    if (metadataOperators.has(name)) {
      if (
        name === "eq" &&
        field.value.kind === Kind.VARIABLE &&
        path.length > 0
      ) {
        onVariableEquality?.(field.value.name.value, path);
      }
      continue;
    }
    const childPath = [...path, sourceFieldName(name, path)];
    onField(childPath);
    walkFilter({
      value: field.value,
      path: childPath,
      onField,
      onVariableEquality,
    });
  }
};

const getRootFields = (tree: DocumentNode) =>
  tree.definitions.flatMap((definition) =>
    definition.kind === Kind.OPERATION_DEFINITION
      ? definition.selectionSet.selections.filter(
          (selection) => selection.kind === Kind.FIELD
        )
      : []
  );

const walkSelections = ({
  selectionSet,
  path,
  onField,
}: {
  selectionSet: SelectionSetNode;
  path: readonly string[];
  onField: (path: readonly string[]) => void;
}) => {
  for (const selection of selectionSet.selections) {
    if (selection.kind !== Kind.FIELD) {
      continue;
    }
    const name = selection.name.value;
    if (
      path.length === 0 &&
      (name === "asset" ||
        name === "assets" ||
        name === "items" ||
        name === "totalCount" ||
        name === "hasMore")
    ) {
      if (selection.selectionSet !== undefined) {
        walkSelections({ selectionSet: selection.selectionSet, path, onField });
      }
      continue;
    }
    if (name === "content" || path[0] === "content") {
      continue;
    }
    const childPath = [...path, sourceFieldName(name, path)];
    onField(childPath);
    if (selection.selectionSet !== undefined) {
      walkSelections({
        selectionSet: selection.selectionSet,
        path: childPath,
        onField,
      });
    }
  }
};

/**
 * Returns metadata fields directly compared for equality with GraphQL
 * variables. Ambiguous variables are omitted instead of guessing an SSG route
 * identity.
 */
export const getAssetResourceVariableFieldPaths = (query: string) => {
  const tree = validateAssetResourceQuery(query).tree;
  const paths = new Map<string, string[] | undefined>();
  const add = (name: string, path: readonly string[]) => {
    const value = [...path];
    const previous = paths.get(name);
    if (previous === undefined && paths.has(name) === false) {
      paths.set(name, value);
    } else if (JSON.stringify(previous) !== JSON.stringify(value)) {
      paths.set(name, undefined);
    }
  };
  for (const root of getRootFields(tree)) {
    if (root.name.value === "asset") {
      for (const argument of root.arguments ?? []) {
        if (
          (argument.name.value === "id" || argument.name.value === "path") &&
          argument.value.kind === Kind.VARIABLE
        ) {
          add(argument.value.name.value, [
            argument.name.value === "id" ? "_id" : "path",
          ]);
        }
      }
      continue;
    }
    const where = root.arguments?.find(
      (argument) => argument.name.value === "where"
    )?.value;
    if (where !== undefined) {
      walkFilter({
        value: where,
        path: [],
        onField: () => {},
        onVariableEquality: add,
      });
    }
  }
  return new Map(
    [...paths]
      .filter((entry): entry is [string, string[]] => entry[1] !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
  );
};

export const getAssetResourceReferencedFieldPathsFromTree = (
  tree: DocumentNode
) => {
  const paths = new Set<string>();
  const add = (path: readonly string[]) => {
    const formatted = formatFieldPath(path);
    if (formatted !== undefined) {
      paths.add(formatted);
    }
  };
  for (const root of getRootFields(tree)) {
    const where = root.arguments?.find(
      (argument) => argument.name.value === "where"
    )?.value;
    if (where !== undefined) {
      walkFilter({ value: where, path: [], onField: add });
    }
    if (root.selectionSet !== undefined) {
      walkSelections({
        selectionSet: root.selectionSet,
        path: [],
        onField: add,
      });
    }
  }
  return [...paths].sort();
};

export const getAssetResourceReferencedFieldPaths = (query: string) =>
  getAssetResourceReferencedFieldPathsFromTree(
    validateAssetResourceQuery(query).tree
  );
