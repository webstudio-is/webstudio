import { json } from "@remix-run/server-runtime";
import {
  AssetRepositoryConflictError,
  AssetRepositoryNotFoundError,
  AssetRevisionConflictError,
  PostgresAssetRepository,
} from "@webstudio-is/asset-uploader/index.server";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import { assetFolderIssue } from "@webstudio-is/sdk";
import { ZodError } from "zod";
import { createAssetClient } from "~/shared/asset-client";
import { createContext } from "~/shared/context.server";
import { parseError } from "~/shared/error/error-parse";
import { privateNoStoreResponseHeaders } from "./cache-control.server";

export class AssetRestRequestError extends Error {}
export class AssetRestRangeError extends Error {}

export const getAssetRestProjectId = (request: Request) => {
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (projectId === null || projectId === "") {
    throw new AssetRestRequestError("Project id is required");
  }
  return projectId;
};

export const createAssetRestRepository = async (request: Request) => {
  const projectId = getAssetRestProjectId(request);
  return new PostgresAssetRepository({
    projectId,
    context: await createContext(request),
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
