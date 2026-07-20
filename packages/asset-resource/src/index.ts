import { evaluate, type ExprNode } from "groq-js/1";
import {
  assetResourceLimits,
  assetResourceQueryRequest,
  assetResourceQuerySuccess,
  type AssetFileDocument,
  type AssetResourceQueryInput,
  type AssetResourceQueryRequest,
  type ResourceRequest,
} from "@webstudio-is/sdk";
import { assetsQueryResourceUrl } from "@webstudio-is/sdk/runtime";
import { validateAssetResourceQuery } from "./query-validation";
import {
  hydrateAssetResourceResult,
  type AssetResourceContentReader,
} from "./hydration";

export * from "./markdown";
export * from "./canonical";
export * from "./field-catalog";
export * from "./resource-index";
export * from "./candidate-selection";
export * from "./index-storage";
export * from "./query-validation";
export * from "./hydration";
export * from "./published-runtime";

export const createAssetResourceRequest = (
  request: AssetResourceQueryInput
): ResourceRequest => ({
  name: "assets-query",
  control: "system",
  method: "post",
  url: assetsQueryResourceUrl,
  searchParams: [],
  headers: [{ name: "content-type", value: "application/json" }],
  body: assetResourceQueryRequest.parse(request),
});

const evaluateAssetResourceQuery = async ({
  tree,
  documents,
  parameters = {},
}: {
  tree: ExprNode;
  documents: readonly AssetFileDocument[];
  parameters?: Record<string, unknown>;
}) => {
  const value = await evaluate(tree, {
    dataset: documents,
    params: parameters,
  });
  return await value.get();
};

export class AssetResourceQueryExecutionError extends Error {
  readonly code:
    | "MISSING_PARAMETER"
    | "RESULT_LIMIT_EXCEEDED"
    | "RESULT_SIZE_EXCEEDED";
  readonly details?: Record<string, number | string>;

  constructor({
    code,
    message,
    details,
  }: {
    code: AssetResourceQueryExecutionError["code"];
    message: string;
    details?: AssetResourceQueryExecutionError["details"];
  }) {
    super(message);
    this.name = "AssetResourceQueryExecutionError";
    this.code = code;
    this.details = details;
  }
}

const getResultCount = (result: unknown) => {
  if (Array.isArray(result)) {
    return result.length;
  }
  return result === null || result === undefined ? 0 : 1;
};

export const executeAssetResourceQuery = async ({
  request,
  documents,
  queryHash,
  indexRevision,
  assetRevision,
}: {
  request: AssetResourceQueryRequest;
  documents: readonly AssetFileDocument[];
  queryHash: string;
  indexRevision: string;
  assetRevision: string;
}) => {
  const validated = validateAssetResourceQuery(request.query);
  for (const parameterName of validated.parameterNames) {
    if (Object.hasOwn(request.parameters, parameterName) === false) {
      throw new AssetResourceQueryExecutionError({
        code: "MISSING_PARAMETER",
        message: `Asset resource parameter $${parameterName} is required`,
        details: { parameter: parameterName },
      });
    }
  }
  if (documents.length > assetResourceLimits.candidateDocuments) {
    throw new AssetResourceQueryExecutionError({
      code: "RESULT_LIMIT_EXCEEDED",
      message: "Asset resource candidate document limit was exceeded",
      details: {
        candidateCount: documents.length,
        candidateLimit: assetResourceLimits.candidateDocuments,
      },
    });
  }

  const rawResult = await evaluateAssetResourceQuery({
    tree: validated.tree,
    documents,
    parameters: request.parameters,
  });
  const result = rawResult ?? null;
  const resultCount = getResultCount(result);
  if (resultCount > request.resultLimit) {
    throw new AssetResourceQueryExecutionError({
      code: "RESULT_LIMIT_EXCEEDED",
      message: "Asset resource query returned too many results",
      details: { resultCount, resultLimit: request.resultLimit },
    });
  }
  const resultBytes = new TextEncoder().encode(JSON.stringify(result)).length;
  if (resultBytes > assetResourceLimits.resultBytes) {
    throw new AssetResourceQueryExecutionError({
      code: "RESULT_SIZE_EXCEEDED",
      message: "Asset resource query result exceeds the byte limit",
      details: {
        resultBytes,
        resultByteLimit: assetResourceLimits.resultBytes,
      },
    });
  }

  return assetResourceQuerySuccess.parse({
    ok: true,
    result,
    content: {},
    meta: {
      queryHash,
      indexRevision,
      assetRevision,
      resultCount,
      hydratedFileCount: 0,
      hydratedBytes: 0,
    },
  });
};

export const executeAndHydrateAssetResourceQuery = async ({
  read,
  ...input
}: Parameters<typeof executeAssetResourceQuery>[0] & {
  read?: AssetResourceContentReader;
}) => {
  const response = await executeAssetResourceQuery(input);
  if (input.request.content.mode === "none") {
    return response;
  }
  if (read === undefined) {
    throw new Error("Asset content reader is required for hydration");
  }
  const hydration = await hydrateAssetResourceResult({
    result: response.result,
    documents: input.documents,
    options: input.request.content,
    read,
  });
  return {
    ...response,
    content: hydration.content,
    meta: {
      ...response.meta,
      hydratedFileCount: hydration.hydratedFileCount,
      hydratedBytes: hydration.hydratedBytes,
    },
  };
};
