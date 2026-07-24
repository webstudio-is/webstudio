import {
  Kind,
  getNamedType,
  getOperationAST,
  isListType,
  isNonNullType,
  isObjectType,
  isEnumType,
  specifiedRules,
  validate,
  valueFromASTUntyped,
  visit,
  type FieldNode,
  type GraphQLObjectType,
  type GraphQLOutputType,
  type GraphQLSchema,
  type OperationDefinitionNode,
  type SelectionSetNode,
  type TypeNode,
  type ValueNode,
} from "graphql";
import type { AssetFileDocument } from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import { normalizeJsonValue } from "@webstudio-is/project-store/json";
import { createAssetGraphqlSchema } from "./graphql";
import { decodeAssetGraphqlFieldName } from "./graphql-fields";
import { parseAssetGraphqlDocument } from "./graphql-query";
import {
  type AssetDetailQueryPlanV1,
  type AssetListQueryPlanProjection,
  type AssetListQueryPlanV1,
  type AssetQueryPlanContentOptions,
  type AssetQueryPlanProjection,
  type AssetQueryPlanV1,
  type AssetQueryPlanValue,
  type AssetQueryPlanVariableType,
  validateAssetDetailQueryPlan,
  validateAssetListQueryPlan,
} from "./query-plan";
import { computeAssetResourceQueryHash } from "./query-hash";

const unsupported = (message: string): never => {
  throw new Error(`Asset GraphQL query cannot be compiled: ${message}`);
};

const compileValue = (value: ValueNode): AssetQueryPlanValue => {
  if (value.kind === Kind.VARIABLE) {
    return { kind: "variable", name: value.name.value };
  }
  if (value.kind === Kind.LIST) {
    return value.values.map(compileValue);
  }
  if (value.kind === Kind.OBJECT) {
    return Object.fromEntries(
      value.fields.map((field) => [field.name.value, compileValue(field.value)])
    );
  }
  return normalizeJsonValue(valueFromASTUntyped(value));
};

const supportedVariableTypes = new Set([
  "String",
  "ID",
  "Int",
  "Float",
  "Boolean",
  "JSON",
  "AssetContentMode",
  "AssetOrderDirection",
  "AssetOrderField",
]);

const compileVariableType = (
  type: TypeNode,
  required = false
): AssetQueryPlanVariableType => {
  if (type.kind === Kind.NON_NULL_TYPE) {
    return compileVariableType(type.type, true);
  }
  if (type.kind === Kind.LIST_TYPE) {
    return {
      kind: "list",
      item: compileVariableType(type.type),
      required,
    };
  }
  if (supportedVariableTypes.has(type.name.value) === false) {
    unsupported(`variable type ${type.name.value} is not supported`);
  }
  return {
    kind: "named",
    name: type.name.value as Extract<
      AssetQueryPlanVariableType,
      { kind: "named" }
    >["name"],
    required,
  };
};

const getFieldSourcePath = (parentType: GraphQLObjectType, name: string) => {
  if (parentType.name === "AssetFile") {
    return [name === "id" ? "_id" : name === "type" ? "_type" : name];
  }
  if (parentType.name.startsWith("AssetProperties")) {
    return name === "_raw" ? [] : [decodeAssetGraphqlFieldName(name)];
  }
  return [name];
};

const unwrapNullable = (type: GraphQLOutputType) =>
  isNonNullType(type) ? type.ofType : type;

const compileContentOptions = (
  field: FieldNode
): AssetQueryPlanContentOptions => {
  const arguments_ = new Map(
    (field.arguments ?? []).map((argument) => [
      argument.name.value,
      compileValue(argument.value),
    ])
  );
  const mode = arguments_.get("mode") ?? "FULL";
  return {
    mode,
    ...(arguments_.has("offset") ? { offset: arguments_.get("offset") } : {}),
    ...(arguments_.has("length") ? { length: arguments_.get("length") } : {}),
    ...(arguments_.has("maxBytes")
      ? { maxBytes: arguments_.get("maxBytes") }
      : {}),
  };
};

const compileFields = ({
  selectionSet,
  parentType,
}: {
  selectionSet: SelectionSetNode;
  parentType: GraphQLObjectType;
}): AssetQueryPlanProjection[] => {
  const projections: AssetQueryPlanProjection[] = [];
  const responseKeys = new Set<string>();
  for (const selection of selectionSet.selections) {
    const field =
      selection.kind === Kind.FIELD
        ? selection
        : unsupported("fragments are not supported by published query plans");
    if ((field.directives?.length ?? 0) > 0) {
      unsupported("directives are not supported by published query plans");
    }
    const name = field.name.value;
    const responseKey = field.alias?.value ?? name;
    if (responseKeys.has(responseKey)) {
      unsupported(`response key ${responseKey} is selected more than once`);
    }
    responseKeys.add(responseKey);
    const fieldDefinition = parentType.getFields()[name];
    if (fieldDefinition === undefined) {
      unsupported(`field ${parentType.name}.${name} is unavailable`);
    }
    const path = getFieldSourcePath(parentType, name);
    if (field.selectionSet === undefined) {
      projections.push({ kind: "value", responseKey, path });
      continue;
    }
    const nullableType = unwrapNullable(fieldDefinition.type);
    const list = isListType(nullableType);
    const itemType = list ? unwrapNullable(nullableType.ofType) : nullableType;
    const namedType = getNamedType(itemType);
    const childType = isObjectType(namedType)
      ? namedType
      : unsupported(`field ${parentType.name}.${name} cannot have subfields`);
    const fields = compileFields({
      selectionSet: field.selectionSet,
      parentType: childType,
    });
    if (parentType.name === "AssetFile" && name === "content") {
      projections.push({
        kind: "content",
        responseKey,
        options: compileContentOptions(field),
        fields,
      });
      continue;
    }
    projections.push({
      kind: list ? "list" : "object",
      responseKey,
      path,
      fields,
    });
  }
  return projections;
};

const getOperation = ({
  document,
  operationName,
}: {
  document: ReturnType<typeof parseAssetGraphqlDocument>;
  operationName?: string;
}): OperationDefinitionNode => {
  const operation = getOperationAST(document, operationName);
  if (operation === undefined || operation === null) {
    return unsupported(
      operationName === undefined
        ? "an operation name is required when the document has multiple operations"
        : `operation ${operationName} does not exist`
    );
  }
  if (operation.operation !== "query") {
    unsupported("only query operations are supported");
  }
  return operation;
};

const prepareCompilation = ({
  documents,
  query,
  operationName,
}: {
  documents: readonly AssetFileDocument[];
  query: string;
  operationName?: string;
}) => {
  const document = parseAssetGraphqlDocument(query);
  const schema = createAssetGraphqlSchema(documents);
  const validationErrors = validate(schema, document, specifiedRules);
  if (validationErrors.length > 0) {
    throw validationErrors[0];
  }
  visit(document, {
    FragmentDefinition: () =>
      unsupported("fragments are not supported by published query plans"),
  });
  return { schema, operation: getOperation({ document, operationName }) };
};

const compileVariables = (operation: OperationDefinitionNode) =>
  (operation.variableDefinitions ?? []).map((definition) => {
    const defaultValue =
      definition.defaultValue === undefined
        ? undefined
        : normalizeJsonValue(valueFromASTUntyped(definition.defaultValue));
    return {
      name: definition.variable.name.value,
      type: compileVariableType(definition.type),
      ...(defaultValue === undefined ? {} : { defaultValue }),
    };
  });

export const compileAssetDetailGraphqlQuery = async ({
  documents,
  query,
  assetRevision,
  operationName,
}: {
  documents: readonly AssetFileDocument[];
  query: string;
  assetRevision: string;
  operationName?: string;
}): Promise<AssetDetailQueryPlanV1> => {
  const { schema, operation } = prepareCompilation({
    documents,
    query,
    operationName,
  });
  if (operation.selectionSet.selections.length !== 1) {
    unsupported("a detail plan must select exactly one root field");
  }
  const rootSelection = operation.selectionSet.selections[0];
  const root =
    rootSelection.kind === Kind.FIELD
      ? rootSelection
      : unsupported("a detail plan must select the asset root field");
  if (root.name.value !== "asset") {
    unsupported("a detail plan must select the asset root field");
  }
  if ((root.directives?.length ?? 0) > 0) {
    unsupported("directives are not supported by published query plans");
  }
  const rootSelectionSet =
    root.selectionSet ?? unsupported("the asset root field must select fields");
  const lookupArguments = (root.arguments ?? []).filter(
    (argument) => argument.name.value === "id" || argument.name.value === "path"
  );
  if (lookupArguments.length !== 1) {
    unsupported("provide exactly one asset id or path");
  }
  const lookupArgument = lookupArguments[0];
  let lookupValue = compileValue(lookupArgument.value);
  if (
    lookupArgument.name.value === "id" &&
    lookupArgument.value.kind === Kind.INT
  ) {
    lookupValue = lookupArgument.value.value;
  }
  const assetType = schema.getType("AssetFile");
  if (isObjectType(assetType) === false) {
    throw new Error("Asset GraphQL schema does not contain AssetFile");
  }
  const plan: AssetDetailQueryPlanV1 = {
    format: "webstudio-asset-query-plan",
    version: 1,
    kind: "asset-detail",
    queryHash: await computeAssetResourceQueryHash(query),
    assetRevision,
    ...(operation.name === undefined
      ? {}
      : { operationName: operation.name.value }),
    rootResponseKey: root.alias?.value ?? root.name.value,
    lookup: {
      field: lookupArgument.name.value === "id" ? "_id" : "path",
      value: lookupValue,
    },
    variables: compileVariables(operation),
    fields: compileFields({
      selectionSet: rootSelectionSet,
      parentType: assetType,
    }),
  };
  validateAssetDetailQueryPlan(plan);
  return plan;
};

const compileConnectionFields = ({
  selectionSet,
  schema,
}: {
  selectionSet: SelectionSetNode;
  schema: GraphQLSchema;
}): AssetListQueryPlanProjection[] => {
  const assetType = schema.getType("AssetFile");
  if (isObjectType(assetType) === false) {
    throw new Error("Asset GraphQL schema does not contain AssetFile");
  }
  const fields: AssetListQueryPlanProjection[] = [];
  const responseKeys = new Set<string>();
  for (const selection of selectionSet.selections) {
    const field =
      selection.kind === Kind.FIELD
        ? selection
        : unsupported("fragments are not supported by published query plans");
    if ((field.directives?.length ?? 0) > 0) {
      unsupported("directives are not supported by published query plans");
    }
    const name = field.name.value;
    const responseKey = field.alias?.value ?? name;
    if (responseKeys.has(responseKey)) {
      unsupported(`response key ${responseKey} is selected more than once`);
    }
    responseKeys.add(responseKey);
    if (name === "items") {
      const itemSelection =
        field.selectionSet ?? unsupported("assets.items must select fields");
      fields.push({
        kind: "items",
        responseKey,
        fields: compileFields({
          selectionSet: itemSelection,
          parentType: assetType,
        }),
      });
      continue;
    }
    const connectionField =
      name === "totalCount" || name === "hasMore"
        ? name
        : unsupported(`connection field ${name} is not supported`);
    if (field.selectionSet !== undefined) {
      unsupported(`connection field ${name} is not supported`);
    }
    fields.push({ kind: "value", responseKey, field: connectionField });
  }
  return fields;
};

const compileOrderBy = ({
  value,
  schema,
}: {
  value: ValueNode | undefined;
  schema: GraphQLSchema;
}): AssetListQueryPlanV1["orderBy"] => {
  if (value === undefined || value.kind === Kind.NULL) {
    return [];
  }
  if (value.kind === Kind.VARIABLE) {
    return unsupported("orderBy variables are not supported");
  }
  const values = value.kind === Kind.LIST ? value.values : [value];
  const orderFieldType = schema.getType("AssetOrderField");
  if (isEnumType(orderFieldType) === false) {
    throw new Error("Asset GraphQL schema does not contain AssetOrderField");
  }
  return values.map((item) => {
    if (item.kind !== Kind.OBJECT) {
      return unsupported("orderBy entries must be object literals");
    }
    const fields = new Map(
      item.fields.map((field) => [field.name.value, field])
    );
    const field = fields.get("field")?.value;
    if (field?.kind !== Kind.ENUM) {
      return unsupported("orderBy.field must be an enum literal");
    }
    const path = orderFieldType.getValue(field.value)?.value;
    if (
      Array.isArray(path) === false ||
      path.length === 0 ||
      path.some((segment: unknown) => typeof segment !== "string")
    ) {
      return unsupported(`order field ${field.value} is unavailable`);
    }
    const direction = fields.get("direction")?.value;
    return {
      field: path as string[],
      direction: direction === undefined ? "ASC" : compileValue(direction),
    };
  });
};

export const compileAssetListGraphqlQuery = async ({
  documents,
  query,
  assetRevision,
  operationName,
}: {
  documents: readonly AssetFileDocument[];
  query: string;
  assetRevision: string;
  operationName?: string;
}): Promise<AssetListQueryPlanV1> => {
  const { schema, operation } = prepareCompilation({
    documents,
    query,
    operationName,
  });
  if (operation.selectionSet.selections.length !== 1) {
    unsupported("a list plan must select exactly one root field");
  }
  const rootSelection = operation.selectionSet.selections[0];
  const root =
    rootSelection.kind === Kind.FIELD
      ? rootSelection
      : unsupported("a list plan must select the assets root field");
  if (root.name.value !== "assets") {
    unsupported("a list plan must select the assets root field");
  }
  if ((root.directives?.length ?? 0) > 0) {
    unsupported("directives are not supported by published query plans");
  }
  const rootSelectionSet =
    root.selectionSet ??
    unsupported("the assets root field must select fields");
  const arguments_ = new Map(
    (root.arguments ?? []).map((argument) => [
      argument.name.value,
      argument.value,
    ])
  );
  const where = arguments_.get("where");
  if (where?.kind === Kind.VARIABLE) {
    unsupported("where variables are not supported; parameterize its fields");
  }
  const plan: AssetListQueryPlanV1 = {
    format: "webstudio-asset-query-plan",
    version: 1,
    kind: "asset-list",
    queryHash: await computeAssetResourceQueryHash(query),
    assetRevision,
    ...(operation.name === undefined
      ? {}
      : { operationName: operation.name.value }),
    rootResponseKey: root.alias?.value ?? root.name.value,
    variables: compileVariables(operation),
    ...(where === undefined || where.kind === Kind.NULL
      ? {}
      : { where: compileValue(where) }),
    orderBy: compileOrderBy({
      value: arguments_.get("orderBy"),
      schema,
    }),
    first:
      arguments_.get("first") === undefined
        ? assetResourceLimits.defaultResultCount
        : compileValue(arguments_.get("first") as ValueNode),
    skip:
      arguments_.get("skip") === undefined
        ? 0
        : compileValue(arguments_.get("skip") as ValueNode),
    fields: compileConnectionFields({
      selectionSet: rootSelectionSet,
      schema,
    }),
  };
  validateAssetListQueryPlan(plan);
  return plan;
};

export const compileAssetGraphqlQuery = async ({
  documents,
  query,
  assetRevision,
  operationName,
}: {
  documents: readonly AssetFileDocument[];
  query: string;
  assetRevision: string;
  operationName?: string;
}): Promise<AssetQueryPlanV1> => {
  const document = parseAssetGraphqlDocument(query);
  const operation = getOperation({ document, operationName });
  if (operation.selectionSet.selections.length !== 1) {
    return unsupported("a published plan must select exactly one root field");
  }
  const root = operation.selectionSet.selections[0];
  if (root.kind !== Kind.FIELD) {
    return unsupported("a published plan must select an asset root field");
  }
  const input = { documents, query, assetRevision, operationName };
  if (root.name.value === "asset") {
    return await compileAssetDetailGraphqlQuery(input);
  }
  if (root.name.value === "assets") {
    return await compileAssetListGraphqlQuery(input);
  }
  return unsupported(`root field ${root.name.value} is not supported`);
};
