import { TRPCClientError } from "@trpc/client";
import {
  createAssetFolderHierarchy,
  formatAssetName,
  type AssetFolders,
  type Assets,
} from "@webstudio-is/sdk";
import { formatAssetFolderPath } from "~/builder/shared/asset-manager/asset-folder-utils";

export const prePublishTimeoutMessage =
  "Pre-publish checks timed out. Publishing was not started. Please try again.";

export const getPrePublishErrorMessage = (
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
    return prePublishTimeoutMessage;
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
        `Publish checks couldn’t read “${formatAssetName(asset)}” in ${location}.`,
        "Try again. If it continues, contact Webstudio support and include this document ID:",
        `Document ID: ${documentId}.`,
      ].join(" ");
    }
    return `Publish checks couldn’t read a linked file in Content Assets. Try again. If it continues, contact Webstudio support and include this document ID: ${documentId}.`;
  }
  return message ?? "Content database validation failed";
};
