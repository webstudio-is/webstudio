import * as path from "node:path";
import type { Asset } from "@webstudio-is/sdk";
import { isTextFileAsset } from "@webstudio-is/sdk";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import {
  authorizeProject,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";
import type { Client } from "@webstudio-is/postgrest/index.server";
import type { AssetClient } from "./client";
import { uploadFileData } from "./upload";
import { getUniqueFilename } from "./utils/get-unique-filename";
import { sanitizeS3Key } from "./utils/sanitize-s3-key";
import { formatAsset } from "./utils/format-asset";

export class AssetRevisionConflictError extends Error {}

const getRevisionFilename = ({
  name,
  filename,
}: {
  name: string;
  filename: string | null;
}) => {
  const extension = path.extname(name);
  const storedBasename = path.basename(name, extension);
  const suffixAt = storedBasename.lastIndexOf("_");
  const basename =
    filename ??
    (suffixAt === -1 ? storedBasename : storedBasename.slice(0, suffixAt));
  return sanitizeS3Key(`${basename}${extension}`);
};

export const swapAssetFileWithClient = async (
  {
    projectId,
    assetId,
    expectedName,
    replacementName,
  }: {
    projectId: string;
    assetId: string;
    expectedName: string;
    replacementName: string;
  },
  client: Client
) => {
  const result = await client.rpc("swap_asset_file", {
    project_id: projectId,
    asset_id: assetId,
    expected_name: expectedName,
    replacement_name: replacementName,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.data === "conflict") {
    throw new AssetRevisionConflictError(
      "This file changed since it was opened. Reload it before saving again."
    );
  }
  if (result.data === "not_found") {
    throw new Error("Asset not found");
  }
  if (result.data === "invalid_revision") {
    throw new Error("Asset revision is not available");
  }
  if (result.data !== "updated") {
    throw new Error("Unable to update asset content");
  }
};

const loadAsset = async ({
  assetId,
  projectId,
  client,
}: {
  assetId: string;
  projectId: string;
  client: Client;
}) => {
  const result = await client
    .from("Asset")
    .select(
      "id, projectId, name, filename, description, folderId, file:File!inner(*)"
    )
    .eq("id", assetId)
    .eq("projectId", projectId)
    .single();
  if (result.error) {
    throw result.error;
  }
  if (result.data === null || result.data.file === null) {
    throw new Error("Asset not found");
  }
  return result.data;
};

export const updateAssetContent = async (
  {
    assetId,
    projectId,
    expectedName,
    data,
  }: {
    assetId: Asset["id"];
    projectId: string;
    expectedName: string;
    data: ReadableStream<Uint8Array>;
  },
  assetClient: AssetClient,
  context: AppContext
): Promise<Asset> => {
  const canEdit = await authorizeProject.hasProjectPermit(
    { projectId, permit: "edit" },
    context
  );
  if (canEdit === false) {
    throw new AuthorizationError(
      "You don't have access to edit this project assets"
    );
  }

  const currentAsset = await loadAsset({
    assetId,
    projectId,
    client: context.postgrest.client,
  });
  if (currentAsset.name !== expectedName) {
    throw new AssetRevisionConflictError(
      "This file changed since it was opened. Reload it before saving again."
    );
  }
  if (isTextFileAsset({ format: currentAsset.file.format }) === false) {
    throw new Error("This asset is not an editable text file");
  }

  const revisionName = getUniqueFilename(
    getRevisionFilename({
      name: currentAsset.name,
      filename: currentAsset.filename,
    })
  );
  const insertedFile = await context.postgrest.client.from("File").insert({
    name: revisionName,
    status: "UPLOADING",
    format: "file",
    size: 0,
    uploaderProjectId: projectId,
  });
  if (insertedFile.error) {
    throw insertedFile.error;
  }

  const file = await uploadFileData(
    revisionName,
    data,
    assetClient,
    context,
    undefined,
    async (name, uploadContext) => {
      const deletedFile = await uploadContext.postgrest.client
        .from("File")
        .delete()
        .eq("name", name);
      if (deletedFile.error) {
        throw deletedFile.error;
      }
    }
  );
  const formatRevision = () =>
    formatAsset({
      assetId: currentAsset.id,
      projectId: currentAsset.projectId,
      filename: currentAsset.filename,
      description: currentAsset.description,
      folderId: currentAsset.folderId,
      file,
    });

  try {
    await swapAssetFileWithClient(
      {
        projectId,
        assetId,
        expectedName,
        replacementName: revisionName,
      },
      context.postgrest.client
    );
  } catch (error) {
    try {
      const current = await loadAsset({
        assetId,
        projectId,
        client: context.postgrest.client,
      });
      if (current.name === revisionName) {
        return formatRevision();
      }
      const discardedRevision = await context.postgrest.client
        .from("File")
        .update({ isDeleted: true })
        .eq("name", revisionName);
      if (discardedRevision.error) {
        throw discardedRevision.error;
      }
    } catch (cleanupError) {
      console.error("Unable to discard an asset revision", cleanupError);
    }
    throw error;
  }

  return formatRevision();
};

export const __testing__ = { getRevisionFilename };
