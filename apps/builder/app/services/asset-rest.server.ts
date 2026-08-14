import { json } from "@remix-run/server-runtime";
import {
  readBoundedRequestBytes,
  RequestByteLimitError,
} from "@webstudio-is/content-engine";
import { decodeUtf8 } from "@webstudio-is/content-engine/compiler";
import {
  AssetRepositoryConflictError,
  AssetRepositoryNotFoundError,
  AssetRevisionConflictError,
  AssetUploadCountLimitError,
  AssetUploadSizeLimitError,
  PostgresAssetRepository,
} from "@webstudio-is/asset-uploader/server";
import type { ProjectPermit } from "@webstudio-is/trpc-interface/index.server";
import { assetFolderIssue } from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import { parseBuilderUrl } from "@webstudio-is/protocol";
import { ZodError } from "zod";
import { createAssetClient } from "~/shared/asset-client";
import { parseError } from "~/shared/error/error-parse";
import { privateNoStoreResponseHeaders } from "./cache-control.server";
import {
  authorizeApiProject,
  getApiAuthorizationFailure,
} from "./api-auth.server";

export class AssetRestRequestError extends Error {}
export class AssetRestRangeError extends Error {}
export class AssetRestPayloadTooLargeError extends Error {}

export const requireAssetRestBody = (request: Request) => {
  if (request.body === null) {
    throw new AssetRestRequestError("Asset content is required");
  }
  return request.body;
};

const readAssetRestBody = async (request: Request) => {
  try {
    return await readBoundedRequestBytes(
      request,
      assetResourceLimits.restMutationRequestBytes
    );
  } catch (error) {
    if (error instanceof RequestByteLimitError) {
      throw new AssetRestPayloadTooLargeError(
        "Assets API request exceeds the byte limit",
        { cause: error }
      );
    }
    throw error;
  }
};

export const readAssetRestJson = async (request: Request) => {
  const bytes = await readAssetRestBody(request);
  try {
    return JSON.parse(decodeUtf8(bytes)) as unknown;
  } catch (error) {
    throw new AssetRestRequestError("Assets API request JSON is invalid", {
      cause: error,
    });
  }
};

export const readAssetRestFormData = async (request: Request) => {
  const bytes = await readAssetRestBody(request);
  try {
    return await new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: bytes,
    }).formData();
  } catch (error) {
    throw new AssetRestRequestError("Assets API form data is invalid", {
      cause: error,
    });
  }
};

const parseRequiredAssetString = ({
  value,
  maximumCharacters,
  name,
}: {
  value: string | undefined | null;
  maximumCharacters: number;
  name: string;
}) => {
  if (
    value === undefined ||
    value === null ||
    value.length === 0 ||
    value.length > maximumCharacters
  ) {
    throw new AssetRestRequestError(`Assets API ${name} is invalid`);
  }
  return value;
};

export const parseAssetRestIdentifier = (value: string | undefined | null) =>
  parseRequiredAssetString({
    value,
    maximumCharacters: assetResourceLimits.assetIdentifierCharacters,
    name: "identifier",
  });

export const parseAssetRestFilename = (value: string | undefined | null) =>
  parseRequiredAssetString({
    value,
    maximumCharacters: assetResourceLimits.assetFilenameCharacters,
    name: "filename",
  });

export const parseAssetRestDescription = (value: string | undefined | null) => {
  if (
    value !== undefined &&
    value !== null &&
    value.length > assetResourceLimits.assetDescriptionCharacters
  ) {
    throw new AssetRestRequestError("Assets API description is invalid");
  }
  return value ?? undefined;
};

export const parseAssetRestMetadataHeader = (
  value: string | undefined | null
) => {
  if (value === undefined || value === null) {
    return;
  }
  if (
    new TextEncoder().encode(value).byteLength >
    assetResourceLimits.restMutationRequestBytes
  ) {
    throw new AssetRestPayloadTooLargeError(
      "Assets API metadata header exceeds the byte limit"
    );
  }
  try {
    return JSON.parse(value) as unknown;
  } catch (error) {
    throw new AssetRestRequestError("Assets API metadata header is invalid", {
      cause: error,
    });
  }
};

export const getAssetRestProjectId = (request: Request) => {
  const projectId =
    parseBuilderUrl(request.url).projectId ??
    new URL(request.url).searchParams.get("projectId");
  return parseAssetRestIdentifier(projectId);
};

export const createAssetRestRepositoryForProject = async (
  request: Request,
  projectId: string,
  permit: ProjectPermit = "view"
) =>
  new PostgresAssetRepository({
    projectId,
    context: await authorizeApiProject(request, projectId, permit),
    assetStore: createAssetClient(),
  });

export const createAssetRestRepository = async (
  request: Request,
  permit: ProjectPermit = "view"
) =>
  createAssetRestRepositoryForProject(
    request,
    getAssetRestProjectId(request),
    permit
  );

const getAssetRestErrorStatus = (error: unknown) => {
  const authorizationFailure = getApiAuthorizationFailure(error);
  if (authorizationFailure !== undefined) {
    return authorizationFailure.status;
  }
  if (error instanceof AssetRepositoryNotFoundError) {
    return 404;
  }
  if (
    error instanceof AssetRepositoryConflictError ||
    error instanceof AssetRevisionConflictError ||
    error instanceof AssetUploadCountLimitError
  ) {
    return 409;
  }
  if (
    error instanceof ZodError &&
    error.issues.some(
      ({ message }) => message === assetFolderIssue.duplicateName
    )
  ) {
    return 409;
  }
  if (error instanceof AssetRestRangeError) {
    return 416;
  }
  if (
    error instanceof AssetRestPayloadTooLargeError ||
    error instanceof AssetUploadSizeLimitError
  ) {
    return 413;
  }
  if (error instanceof AssetRestRequestError || error instanceof ZodError) {
    return 400;
  }
  return 500;
};

export const assetRestErrorResponse = (error: unknown) => {
  if (error instanceof Response) {
    return error;
  }
  const status = getAssetRestErrorStatus(error);
  if (status === 500) {
    console.error(error);
  }
  return json(
    {
      errors:
        status === 500
          ? "Internal Assets API error"
          : parseError(error).message,
    },
    { status, headers: privateNoStoreResponseHeaders }
  );
};

export const assetRestMethodNotAllowed = (
  allowed: readonly { method: string }[]
) =>
  json(
    { errors: "Method not allowed" },
    {
      status: 405,
      headers: {
        ...privateNoStoreResponseHeaders,
        Allow: allowed.map(({ method }) => method.toUpperCase()).join(", "),
      },
    }
  );
