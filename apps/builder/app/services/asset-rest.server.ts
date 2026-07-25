import { json } from "@remix-run/server-runtime";
import {
  readBoundedRequestBytes,
  RequestByteLimitError,
} from "@webstudio-is/asset-resource";
import {
  AssetRepositoryConflictError,
  AssetRepositoryNotFoundError,
  AssetRevisionConflictError,
  PostgresAssetRepository,
} from "@webstudio-is/asset-uploader/index.server";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import { assetFolderIssue } from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import { ZodError } from "zod";
import { createAssetClient } from "~/shared/asset-client";
import { parseError } from "~/shared/error/error-parse";
import { privateNoStoreResponseHeaders } from "./cache-control.server";
import { createAssetRestContext } from "./asset-rest-auth.server";

export class AssetRestRequestError extends Error {}
export class AssetRestRangeError extends Error {}
export class AssetRestPayloadTooLargeError extends Error {}

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
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
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

export const parseAssetRestIdentifier = (value: string | undefined | null) => {
  if (
    value === undefined ||
    value === null ||
    value.length === 0 ||
    value.length > assetResourceLimits.assetIdentifierCharacters
  ) {
    throw new AssetRestRequestError("Assets API identifier is invalid");
  }
  return value;
};

export const parseAssetRestFilename = (value: string | undefined | null) => {
  if (
    value === undefined ||
    value === null ||
    value.length === 0 ||
    value.length > assetResourceLimits.assetFilenameCharacters
  ) {
    throw new AssetRestRequestError("Assets API filename is invalid");
  }
  return value;
};

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
  const projectId = new URL(request.url).searchParams.get("projectId");
  return parseAssetRestIdentifier(projectId);
};

export const createAssetRestRepository = async (request: Request) => {
  const projectId = getAssetRestProjectId(request);
  return new PostgresAssetRepository({
    projectId,
    context: await createAssetRestContext(request),
    assetStore: createAssetClient(),
  });
};

const getAssetRestErrorStatus = (error: unknown) => {
  if (error instanceof AuthorizationError) {
    return 403;
  }
  if (error instanceof AssetRepositoryNotFoundError) {
    return 404;
  }
  if (
    error instanceof AssetRepositoryConflictError ||
    error instanceof AssetRevisionConflictError
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
  if (error instanceof AssetRestPayloadTooLargeError) {
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

export const assetRestMethodNotAllowed = (allowed: readonly string[]) =>
  json(
    { errors: "Method not allowed" },
    {
      status: 405,
      headers: {
        ...privateNoStoreResponseHeaders,
        Allow: allowed.join(", "),
      },
    }
  );
