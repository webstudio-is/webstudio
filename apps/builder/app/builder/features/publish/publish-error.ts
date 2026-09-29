import { TRPCClientError } from "@trpc/client";
import {
  createAssetFolderHierarchy,
  formatAssetName,
  type AssetFolders,
  type Assets,
} from "@webstudio-is/sdk";
import { formatAssetFolderPath } from "~/builder/shared/asset-manager/asset-folder-utils";

export const publishValidationTimeoutMessage =
  "Publish validation timed out. Publishing was not started. Please try again.";

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
