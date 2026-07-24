import { GraphQLError, Kind, parse, visit, type DocumentNode } from "graphql";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import {
  normalizeJsonValue,
  serializeJsonDeterministically,
} from "@webstudio-is/project-store/json";

export type AssetGraphqlDocumentAnalysis = {
  document: DocumentNode;
  astNodes: number;
  astDepth: number;
  datasetScans: number;
  variableNames: string[];
};

export const analyzeAssetGraphqlDocument = (
  source: string
): AssetGraphqlDocumentAnalysis => {
  const queryBytes = new TextEncoder().encode(source).byteLength;
  if (source.trim().length === 0) {
    throw new GraphQLError("Asset GraphQL query cannot be empty");
  }
  if (queryBytes > assetResourceLimits.queryBytes) {
    throw new GraphQLError("Asset GraphQL query exceeds the UTF-8 byte limit");
  }

  let document: DocumentNode;
  try {
    document = parse(source);
  } catch (error) {
    throw error instanceof GraphQLError
      ? error
      : new GraphQLError("Asset GraphQL query contains invalid syntax");
  }

  let nodes = 0;
  let depth = 0;
  let currentDepth = 0;
  let variableDefinitions = 0;
  const variableNames = new Set<string>();
  visit(document, {
    enter: (node) => {
      nodes += 1;
      currentDepth += 1;
      depth = Math.max(depth, currentDepth);
      if (node.kind === "VariableDefinition") {
        variableDefinitions += 1;
        variableNames.add(node.variable.name.value);
      }
    },
    leave: () => {
      currentDepth -= 1;
    },
  });
  if (
    nodes > assetResourceLimits.queryAstNodes ||
    depth > assetResourceLimits.queryAstDepth ||
    variableDefinitions > assetResourceLimits.variableCount
  ) {
    throw new GraphQLError(
      "Asset GraphQL query exceeds the syntax-tree limits"
    );
  }
  let datasetScans = 0;
  for (const definition of document.definitions) {
    if (definition.kind !== Kind.OPERATION_DEFINITION) {
      continue;
    }
    const scans = definition.selectionSet.selections.filter(
      (selection) =>
        selection.kind === Kind.FIELD &&
        (selection.name.value === "asset" || selection.name.value === "assets")
    ).length;
    datasetScans = Math.max(datasetScans, scans);
  }
  if (datasetScans > assetResourceLimits.queryDatasetScans) {
    throw new GraphQLError("Asset GraphQL query performs too many data scans");
  }
  return {
    document,
    astNodes: nodes,
    astDepth: depth,
    datasetScans,
    variableNames: [...variableNames].sort(),
  };
};

export const parseAssetGraphqlDocument = (source: string): DocumentNode =>
  analyzeAssetGraphqlDocument(source).document;

export const validateAssetGraphqlVariables = (
  variables: Readonly<Record<string, unknown>> | undefined
) => {
  if (variables === undefined) {
    return;
  }
  if (Object.keys(variables).length > assetResourceLimits.variableCount) {
    throw new GraphQLError("Asset GraphQL query has too many variables");
  }
  let serialized: string;
  try {
    serialized = serializeJsonDeterministically(normalizeJsonValue(variables));
  } catch {
    throw new GraphQLError("Asset GraphQL variables must be JSON serializable");
  }
  if (
    new TextEncoder().encode(serialized).byteLength >
    assetResourceLimits.variableBytes
  ) {
    throw new GraphQLError(
      "Asset GraphQL variables exceed the JSON byte limit"
    );
  }
};
