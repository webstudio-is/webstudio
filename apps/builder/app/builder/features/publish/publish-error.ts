import { TRPCClientError } from "@trpc/client";
import {
  createAssetFolderHierarchy,
  formatAssetName,
  type AssetFolders,
  type Assets,
} from "@webstudio-is/sdk";
import { formatAssetFolderPath } from "~/builder/shared/asset-manager/asset-folder-utils";

export const publishValidationTimeoutMessage =
  "Publish validation timed out. Try again to view the diagnostics.";

const responseDiagnosticHeaders = [
  "content-type",
  "x-vercel-id",
  "x-request-id",
  "cf-ray",
] as const;

const getResponseEnvelopeShape = (value: unknown) => {
  if (typeof value !== "object" || value === null) {
    return "other";
  }
  if ("result" in value) {
    return "result";
  }
  if ("error" in value) {
    return "error";
  }
  return "other";
};

/** Return only response metadata and envelope shape, never response values. */
export const getPublishResponseTransformDiagnostics = (error: unknown) => {
  if (
    !(error instanceof TRPCClientError) ||
    error.message !== "Unable to transform response from server"
  ) {
    return;
  }

  const response = error.meta?.response;
  const responseJSON = error.meta?.responseJSON;
  const headers: Record<string, string> = {};
  if (response instanceof Response) {
    for (const name of responseDiagnosticHeaders) {
      const value = response.headers.get(name);
      if (value !== null) {
        // Header values are diagnostic identifiers or media types. Bound
        // their size so a malformed upstream cannot flood the console.
        headers[name] = value.slice(0, 128);
      }
    }
  }

  const envelopes = Array.isArray(responseJSON)
    ? responseJSON.slice(0, 20).map(getResponseEnvelopeShape)
    : responseJSON === undefined
      ? []
      : [getResponseEnvelopeShape(responseJSON)];

  return {
    ...(response instanceof Response ? { status: response.status } : {}),
    headers,
    responseJson: {
      present: responseJSON !== undefined,
      ...(Array.isArray(responseJSON)
        ? { batchSize: responseJSON.length }
        : {}),
      envelopes,
    },
  };
};

export const getPublishValidationErrorMessage = (
  error: unknown,
  {
    assets,
    assetFolders,
  }: {
    assets?: Assets;
    assetFolders?: AssetFolders;
  } = {}
) => {
  const response =
    error instanceof TRPCClientError && error.meta?.response instanceof Response
      ? error.meta.response
      : undefined;
  if (
    response !== undefined &&
    (response.status === 504 ||
      response.headers.get("x-vercel-error") === "FUNCTION_INVOCATION_TIMEOUT")
  ) {
    return publishValidationTimeoutMessage;
  }
  const message = error instanceof Error ? error.message : undefined;
  const unloadedDocument = /^Document (.+) could not be loaded$/.exec(
    message ?? ""
  );
  if (unloadedDocument !== null) {
    const documentId = unloadedDocument[1];
    const asset = assets?.get(documentId);
    if (asset !== undefined) {
      const folderPath = formatAssetFolderPath(
        createAssetFolderHierarchy(assetFolders ?? new Map()),
        asset.folderId
      );
      const location =
        folderPath === "Root"
          ? "Content Assets root"
          : `Content Assets > ${folderPath
              .replace("Root / ", "")
              .replaceAll(" / ", " > ")}`;
      return [
        `Publish validation couldn’t read “${formatAssetName(asset)}” in ${location}.`,
        "Try again. If it continues, investigate this document with Webstudio MCP:",
        "https://wstd.us/mcp",
        `Document ID: ${documentId}.`,
      ].join(" ");
    }
    return `Publish validation couldn’t read a linked file in Content Assets. Try again. If it continues, investigate this document with Webstudio MCP: https://wstd.us/mcp. Document ID: ${documentId}.`;
  }
  return message ?? "Publish validation failed";
};
