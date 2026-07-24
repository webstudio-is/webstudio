import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLError,
  GraphQLFloat,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  execute,
  specifiedRules,
  validate,
  valueFromASTUntyped,
  type ExecutionResult,
  type GraphQLInputType,
  type GraphQLOutputType,
} from "graphql";
import type {
  AssetFileDocument,
  BuilderAssetFieldCatalog,
} from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import type { AssetResourceContentReader } from "./hydration";
import {
  createAssetContentHydrator,
  type AssetContentHydrator,
} from "./content-hydrator";
import {
  parseAssetGraphqlDocument,
  validateAssetGraphqlVariables,
} from "./graphql-query";
import { parseAssetResourceContentOptions } from "./content-options";
import {
  assetStandardNodes,
  inferAssetPropertiesNode,
  inferAssetPropertiesNodeFromCatalog,
  matchesAssetDocument,
  sortAssetDocuments,
  type AssetInferredNode,
  type AssetScalarKind,
} from "./asset-query-model";
export {
  encodeAssetGraphqlFieldName,
  decodeAssetGraphqlFieldName,
} from "./graphql-fields";

const jsonScalar = new GraphQLScalarType({
  name: "JSON",
  description: "A JSON value.",
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral: (node, variables) => valueFromASTUntyped(node, variables),
});

const scalarOutputType = (kind: AssetScalarKind) =>
  kind === "string"
    ? GraphQLString
    : kind === "number"
      ? GraphQLFloat
      : GraphQLBoolean;

const scalarFilterNames = {
  string: "AssetStringFilter",
  number: "AssetNumberFilter",
  boolean: "AssetBooleanFilter",
} as const;

const createScalarFilterTypes = () => {
  const string = new GraphQLInputObjectType({
    name: scalarFilterNames.string,
    fields: {
      exists: { type: GraphQLBoolean },
      eq: { type: GraphQLString },
      ne: { type: GraphQLString },
      in: { type: new GraphQLList(new GraphQLNonNull(GraphQLString)) },
      contains: { type: GraphQLString },
      startsWith: { type: GraphQLString },
      endsWith: { type: GraphQLString },
    },
  });
  const number = new GraphQLInputObjectType({
    name: scalarFilterNames.number,
    fields: {
      exists: { type: GraphQLBoolean },
      eq: { type: GraphQLFloat },
      ne: { type: GraphQLFloat },
      in: { type: new GraphQLList(new GraphQLNonNull(GraphQLFloat)) },
      gt: { type: GraphQLFloat },
      gte: { type: GraphQLFloat },
      lt: { type: GraphQLFloat },
      lte: { type: GraphQLFloat },
    },
  });
  const boolean = new GraphQLInputObjectType({
    name: scalarFilterNames.boolean,
    fields: {
      exists: { type: GraphQLBoolean },
      eq: { type: GraphQLBoolean },
      ne: { type: GraphQLBoolean },
    },
  });
  return { string, number, boolean };
};

type SchemaNodeTypes = {
  output: GraphQLOutputType;
  input: GraphQLInputType;
};

const createDynamicTypes = (
  root: AssetInferredNode,
  scalarFilters: ReturnType<typeof createScalarFilterTypes>
) => {
  const cache = new Map<AssetInferredNode, SchemaNodeTypes>();
  const jsonFilter = new GraphQLInputObjectType({
    name: "AssetJsonFilter",
    fields: {
      exists: { type: GraphQLBoolean },
      eq: { type: jsonScalar },
      ne: { type: jsonScalar },
    },
  });
  const listFilters = new Map<
    AssetScalarKind | "json",
    GraphQLInputObjectType
  >();
  const getListFilter = (node: AssetInferredNode) => {
    const kind = node.kind === "scalar" ? node.scalar : "json";
    const existing = listFilters.get(kind);
    if (existing !== undefined) {
      return existing;
    }
    const itemType =
      node.kind === "scalar" ? scalarOutputType(node.scalar) : jsonScalar;
    const name = `${kind[0].toUpperCase()}${kind.slice(1)}`;
    const filter = new GraphQLInputObjectType({
      name: `Asset${name}ListFilter`,
      fields: {
        exists: { type: GraphQLBoolean },
        contains: { type: itemType },
        isEmpty: { type: GraphQLBoolean },
      },
    });
    listFilters.set(kind, filter);
    return filter;
  };
  const create = (
    node: AssetInferredNode,
    path: readonly string[]
  ): SchemaNodeTypes => {
    const cached = cache.get(node);
    if (cached !== undefined) {
      return cached;
    }
    if (node.kind === "scalar") {
      const types = {
        output: scalarOutputType(node.scalar),
        input: scalarFilters[node.scalar],
      };
      cache.set(node, types);
      return types;
    }
    if (node.kind === "json") {
      const types = { output: jsonScalar, input: jsonFilter };
      cache.set(node, types);
      return types;
    }
    if (node.kind === "list") {
      const item = create(node.item, path);
      const types = {
        output: new GraphQLList(item.output),
        input: getListFilter(node.item),
      };
      cache.set(node, types);
      return types;
    }
    const suffix = path.length === 0 ? "" : `_${encodeOrderPath(path)}`;
    const output = new GraphQLObjectType({
      name: `AssetProperties${suffix}`,
      fields: () => ({
        ...Object.fromEntries(
          [...node.fields].map(([name, field]) => [
            name,
            {
              type: create(field.node, [...path, name]).output,
              description:
                name === field.sourceName
                  ? undefined
                  : `Original field: ${field.sourceName}`,
              resolve: (value: Readonly<Record<string, unknown>>) =>
                value[field.sourceName],
            },
          ])
        ),
        _raw: {
          type: new GraphQLNonNull(jsonScalar),
          description:
            "Complete JSON object, including keys that are not valid GraphQL field names.",
          resolve: (value) => value,
        },
      }),
    });
    const input = new GraphQLInputObjectType({
      name: `AssetPropertiesFilter${suffix}`,
      fields: () => ({
        exists: { type: GraphQLBoolean },
        ...Object.fromEntries(
          [...node.fields].map(([name, field]) => [
            name,
            {
              type: create(field.node, [...path, name]).input,
              description:
                name === field.sourceName
                  ? undefined
                  : `Original field: ${field.sourceName}`,
            },
          ])
        ),
        _raw: { type: jsonFilter },
      }),
    });
    const types = { output, input };
    cache.set(node, types);
    return types;
  };
  return create(root, []);
};

type OrderPath = { name: string; path: readonly string[] };

const encodeOrderPath = (path: readonly string[]) =>
  path.length === 1 && path[0].startsWith("N_") === false
    ? path[0]
    : `N_${path.map((segment) => `${segment.length}_${segment}`).join("_")}`;

const collectOrderPaths = (
  node: AssetInferredNode,
  fieldPath: readonly string[],
  sourcePath: readonly string[],
  result: OrderPath[]
) => {
  if (node.kind === "scalar") {
    result.push({
      name: `PROPERTIES_${encodeOrderPath(fieldPath)}`,
      path: ["properties", ...sourcePath],
    });
    return;
  }
  if (node.kind === "object") {
    for (const [name, field] of node.fields) {
      collectOrderPaths(
        field.node,
        [...fieldPath, name],
        [...sourcePath, field.sourceName],
        result
      );
    }
  }
};

const createAssetGraphqlSchemaFromModel = ({
  documents,
  propertiesNode,
}: {
  documents: readonly AssetFileDocument[];
  propertiesNode: Extract<AssetInferredNode, { kind: "object" }>;
}) => {
  const scalarFilters = createScalarFilterTypes();
  const propertiesTypes = createDynamicTypes(propertiesNode, scalarFilters);
  let assetFilter: GraphQLInputObjectType;
  assetFilter = new GraphQLInputObjectType({
    name: "AssetFilter",
    fields: () => ({
      id: { type: scalarFilters.string },
      name: { type: scalarFilters.string },
      path: { type: scalarFilters.string },
      key: { type: scalarFilters.string },
      folderId: { type: scalarFilters.string },
      extension: { type: scalarFilters.string },
      mimeType: { type: scalarFilters.string },
      size: { type: scalarFilters.number },
      revision: { type: scalarFilters.string },
      excerpt: { type: scalarFilters.string },
      properties: { type: propertiesTypes.input },
      AND: { type: new GraphQLList(new GraphQLNonNull(assetFilter)) },
      OR: { type: new GraphQLList(new GraphQLNonNull(assetFilter)) },
      NOT: { type: assetFilter },
    }),
  });

  const orderPaths: OrderPath[] = Object.keys(assetStandardNodes).map(
    (name) => ({
      name: name.toUpperCase(),
      path: [name],
    })
  );
  collectOrderPaths(propertiesNode, [], [], orderPaths);
  const orderField = new GraphQLEnumType({
    name: "AssetOrderField",
    values: Object.fromEntries(
      orderPaths.map(({ name, path }) => [
        name,
        { value: path, description: path.join(".") },
      ])
    ),
  });
  const orderDirection = new GraphQLEnumType({
    name: "AssetOrderDirection",
    values: { ASC: { value: 1 }, DESC: { value: -1 } },
  });
  const assetOrder = new GraphQLInputObjectType({
    name: "AssetOrder",
    fields: {
      field: { type: new GraphQLNonNull(orderField) },
      direction: {
        type: new GraphQLNonNull(orderDirection),
        defaultValue: 1,
      },
    },
  });
  const contentMode = new GraphQLEnumType({
    name: "AssetContentMode",
    values: {
      FULL: { value: "full" },
      RANGE: { value: "range" },
      MARKDOWN_BODY: { value: "markdown-body" },
    },
  });
  const assetContentRange = new GraphQLObjectType({
    name: "AssetContentRange",
    fields: {
      offset: { type: new GraphQLNonNull(GraphQLInt) },
      length: { type: new GraphQLNonNull(GraphQLInt) },
      total: { type: new GraphQLNonNull(GraphQLInt) },
    },
  });
  const assetContent = new GraphQLObjectType({
    name: "AssetContent",
    fields: {
      encoding: { type: new GraphQLNonNull(GraphQLString) },
      text: { type: new GraphQLNonNull(GraphQLString) },
      range: { type: assetContentRange },
    },
  });
  const assetFile = new GraphQLObjectType({
    name: "AssetFile",
    fields: {
      id: {
        type: new GraphQLNonNull(GraphQLID),
        resolve: (document) => document._id,
      },
      type: {
        type: new GraphQLNonNull(GraphQLString),
        resolve: (document) => document._type,
      },
      name: { type: new GraphQLNonNull(GraphQLString) },
      path: { type: new GraphQLNonNull(GraphQLString) },
      key: { type: new GraphQLNonNull(GraphQLString) },
      folderId: { type: GraphQLString },
      extension: { type: new GraphQLNonNull(GraphQLString) },
      mimeType: { type: new GraphQLNonNull(GraphQLString) },
      size: { type: new GraphQLNonNull(GraphQLFloat) },
      revision: { type: new GraphQLNonNull(GraphQLString) },
      excerpt: { type: GraphQLString },
      properties: { type: new GraphQLNonNull(propertiesTypes.output) },
      metadataError: { type: jsonScalar },
      content: {
        type: assetContent,
        args: {
          mode: { type: contentMode, defaultValue: "full" },
          offset: { type: GraphQLInt },
          length: { type: GraphQLInt },
          maxBytes: { type: GraphQLInt },
        },
        resolve: (
          document: AssetFileDocument,
          arguments_: {
            mode: "full" | "range" | "markdown-body";
            offset?: number;
            length?: number;
            maxBytes?: number;
          },
          context: GraphqlExecutionContext | undefined
        ) => {
          if (
            (arguments_.mode === "range" &&
              arguments_.maxBytes !== undefined) ||
            (arguments_.mode !== "range" &&
              (arguments_.offset !== undefined ||
                arguments_.length !== undefined))
          ) {
            throw new GraphQLError("Asset content arguments are invalid");
          }
          const parsed = parseAssetResourceContentOptions(
            arguments_.mode === "range"
              ? {
                  mode: arguments_.mode,
                  offset: arguments_.offset,
                  length: arguments_.length,
                }
              : { mode: arguments_.mode, maxBytes: arguments_.maxBytes }
          );
          if (parsed === undefined || parsed.mode === "none") {
            throw new GraphQLError("Asset content arguments are invalid");
          }
          if (context === undefined) {
            throw new GraphQLError("Asset content reader is unavailable");
          }
          return context.hydrateContent(document, parsed);
        },
      },
    },
  });
  const assetConnection = new GraphQLObjectType({
    name: "AssetConnection",
    fields: {
      items: {
        type: new GraphQLNonNull(
          new GraphQLList(new GraphQLNonNull(assetFile))
        ),
      },
      totalCount: { type: new GraphQLNonNull(GraphQLInt) },
      hasMore: { type: new GraphQLNonNull(GraphQLBoolean) },
    },
  });
  const query = new GraphQLObjectType({
    name: "Query",
    fields: {
      assets: {
        type: new GraphQLNonNull(assetConnection),
        args: {
          where: { type: assetFilter },
          orderBy: { type: new GraphQLList(new GraphQLNonNull(assetOrder)) },
          first: {
            type: GraphQLInt,
            defaultValue: assetResourceLimits.defaultResultCount,
          },
          skip: { type: GraphQLInt, defaultValue: 0 },
        },
        resolve: (
          _source,
          arguments_: Readonly<Record<string, unknown>>,
          context: GraphqlExecutionContext
        ) => {
          countDatasetScan(context);
          const first = arguments_.first as number;
          const skip = arguments_.skip as number;
          if (
            Number.isSafeInteger(first) === false ||
            first < 0 ||
            first > assetResourceLimits.resultCount ||
            Number.isSafeInteger(skip) === false ||
            skip < 0 ||
            skip > assetResourceLimits.candidateDocuments
          ) {
            throw new GraphQLError(
              "Asset pagination is outside the supported limits"
            );
          }
          const matching = documents.filter((document) =>
            matchesAssetDocument(document, propertiesNode, arguments_.where)
          );
          const orders = (arguments_.orderBy ?? []) as ReadonlyArray<{
            field: readonly string[];
            direction: 1 | -1;
          }>;
          const sorted = sortAssetDocuments(matching, orders);
          return {
            items: sorted.slice(skip, skip + first),
            totalCount: matching.length,
            hasMore: skip + first < matching.length,
          };
        },
      },
      asset: {
        type: assetFile,
        args: { id: { type: GraphQLID }, path: { type: GraphQLString } },
        resolve: (
          _source,
          arguments_: { id?: string; path?: string },
          context: GraphqlExecutionContext
        ) => {
          countDatasetScan(context);
          if (
            (arguments_.id === undefined) ===
            (arguments_.path === undefined)
          ) {
            throw new GraphQLError("Provide exactly one of asset id or path");
          }
          const matches = documents.filter((document) =>
            arguments_.id === undefined
              ? document.path === arguments_.path
              : document._id === arguments_.id
          );
          if (matches.length > 1) {
            throw new GraphQLError("Asset identity is ambiguous");
          }
          return matches[0];
        },
      },
    },
  });
  return new GraphQLSchema({ query, types: [jsonScalar] });
};

export const createAssetGraphqlSchema = (
  documents: readonly AssetFileDocument[]
) => {
  if (documents.length > assetResourceLimits.candidateDocuments) {
    throw new Error("Asset GraphQL document limit was exceeded");
  }
  return createAssetGraphqlSchemaFromModel({
    documents,
    propertiesNode: inferAssetPropertiesNode(documents),
  });
};

/** Creates the Builder's schema-aware editor model without loading file rows. */
export const createAssetGraphqlSchemaFromCatalog = (
  catalog: BuilderAssetFieldCatalog
) =>
  createAssetGraphqlSchemaFromModel({
    documents: [],
    propertiesNode: inferAssetPropertiesNodeFromCatalog(catalog),
  });

type GraphqlExecutionContext = {
  datasetScans: number;
  hydrateContent: AssetContentHydrator;
};

const countDatasetScan = (context: GraphqlExecutionContext | undefined) => {
  if (context === undefined) {
    return;
  }
  context.datasetScans += 1;
  if (context.datasetScans > assetResourceLimits.queryDatasetScans) {
    throw new GraphQLError("Asset GraphQL query performs too many data scans");
  }
};

const errorResult = (message: string): ExecutionResult => ({
  data: null,
  errors: [new GraphQLError(message)],
});

export type AssetGraphqlExecutionInput = {
  query: string;
  variables?: Readonly<Record<string, unknown>>;
  operationName?: string;
  read?: AssetResourceContentReader;
};

const executeWithSchema = async ({
  schema,
  query,
  variables,
  operationName,
  read,
}: AssetGraphqlExecutionInput & {
  schema: GraphQLSchema;
}): Promise<ExecutionResult> => {
  try {
    validateAssetGraphqlVariables(variables);
  } catch (error) {
    return errorResult(
      error instanceof Error
        ? error.message
        : "Asset GraphQL variables are invalid"
    );
  }
  let document;
  try {
    document = parseAssetGraphqlDocument(query);
  } catch (error) {
    return {
      data: null,
      errors: [
        error instanceof GraphQLError
          ? error
          : new GraphQLError("Asset GraphQL query contains invalid syntax"),
      ],
    };
  }
  const validationErrors = validate(schema, document, specifiedRules);
  if (validationErrors.length > 0) {
    return { data: null, errors: validationErrors };
  }
  const result = await execute({
    schema,
    document,
    variableValues: variables,
    operationName,
    contextValue: {
      datasetScans: 0,
      hydrateContent: createAssetContentHydrator(read),
    } satisfies GraphqlExecutionContext,
  });
  const resultBytes = new TextEncoder().encode(
    JSON.stringify(result.data)
  ).byteLength;
  if (resultBytes > assetResourceLimits.resultBytes) {
    return errorResult("Asset GraphQL result exceeds the byte limit");
  }
  return result;
};

export const createAssetGraphqlExecutor = (
  documents: readonly AssetFileDocument[]
) => {
  if (documents.length > assetResourceLimits.candidateDocuments) {
    throw new Error("Asset GraphQL document limit was exceeded");
  }
  const schema = createAssetGraphqlSchema(documents);
  return {
    schema,
    execute: async (input: AssetGraphqlExecutionInput) =>
      await executeWithSchema({ schema, ...input }),
  };
};

export const executeAssetGraphqlQuery = async ({
  documents,
  ...input
}: AssetGraphqlExecutionInput & {
  documents: readonly AssetFileDocument[];
}): Promise<ExecutionResult> => {
  if (documents.length > assetResourceLimits.candidateDocuments) {
    return errorResult("Asset GraphQL document limit was exceeded");
  }
  return await createAssetGraphqlExecutor(documents).execute(input);
};
