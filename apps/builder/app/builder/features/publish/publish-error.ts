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
        `Could not load “${formatAssetName(asset)}” in ${location}.`,
        "Restore or reupload the file, then run publish validation again.",
        `Document ID: ${documentId}.`,
      ].join(" ");
    }
    return `Could not load a linked content document from Content Assets. Open the Content Assets panel to inspect the linked file, then restore or reupload its source and run publish validation again. Document ID: ${documentId}.`;
  }
  return message ?? "Content database validation failed";
};
