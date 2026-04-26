import { type Patch, applyPatches } from "immer";
import { type Asset, Assets } from "@webstudio-is/sdk";
import type { Client } from "@webstudio-is/postgrest/index.server";
import { formatAsset } from "./utils/format-asset";

export const loadAssetsByProjectWithClient = async (
  projectId: string,
  client: Client
): Promise<Asset[]> => {
  const assets = await client
    .from("Asset")
    // use inner to filter out assets without file
    // when file is not uploaded
    .select(
      `
        assetId:id,
        projectId,
        filename,
        description,
        file:File!inner (*)
      `
    )
    .eq("projectId", projectId)
    .eq("file.status", "UPLOADED")
    // always sort by primary key to get stable list
    // required to not break fixtures
    .order("id");

  const result: Asset[] = [];
  for (const {
    assetId,
    projectId,
    filename,
    description,
    file,
  } of assets.data ?? []) {
    if (file) {
      result.push(
        formatAsset({ assetId, projectId, filename, description, file })
      );
    }
  }

  return result;
};

export const deleteAssetsWithClient = async (
  props: {
    ids: Array<Asset["id"]>;
    projectId: string;
  },
  client: Client
): Promise<void> => {
  const assets = await client
    .from("Asset")
    .select(
      `
        id,
        projectId,
        name,
        file:File!inner (*)
      `
    )
    .in("id", props.ids)
    .eq("projectId", props.projectId);

  if ((assets.data ?? []).length === 0) {
    throw new Error("Assets not found");
  }

  await client
    .from("Project")
    .update({ previewImageAssetId: null })
    .eq("id", props.projectId)
    .in("previewImageAssetId", props.ids);

  await client
    .from("Asset")
    .delete()
    .in("id", props.ids)
    .eq("projectId", props.projectId);

  const unusedFileNames = new Set(assets.data?.map((asset) => asset.name));
  const assetsByStillUsedFileName = await client
    .from("Asset")
    .select("name")
    .in("name", Array.from(unusedFileNames));
  for (const asset of assetsByStillUsedFileName.data ?? []) {
    unusedFileNames.delete(asset.name);
  }

  if (unusedFileNames.size > 0) {
    await client
      .from("File")
      .update({ isDeleted: true })
      .in("name", Array.from(unusedFileNames));
  }
};

/**
 * patchAssetsWithClient can only delete, add, or update asset metadata.
 */
export const patchAssetsWithClient = async (
  { projectId, client }: { projectId: string; client: Client },
  patches: Array<Patch>
): Promise<void> => {
  const assetsList = await loadAssetsByProjectWithClient(projectId, client);
  const assets = new Map<Asset["id"], Asset>();
  for (const asset of assetsList) {
    assets.set(asset.id, asset);
  }
  const patchedAssets = applyPatches(assets, patches);
  // validate assets without recreating objects
  // we expect referencial equality to find updated assets
  Assets.parse(patchedAssets);

  const deletedAssetIds: Asset["id"][] = [];
  for (const assetId of assets.keys()) {
    if (patchedAssets.has(assetId) === false) {
      deletedAssetIds.push(assetId);
    }
  }
  if (deletedAssetIds.length !== 0) {
    await deleteAssetsWithClient({ projectId, ids: deletedAssetIds }, client);
  }

  for (const asset of assets.values()) {
    const patchedAsset = patchedAssets.get(asset.id);
    if (asset !== patchedAsset && patchedAsset) {
      const { filename, description } = patchedAsset;
      await client
        .from("Asset")
        .update({ filename, description })
        .eq("id", asset.id)
        .eq("projectId", asset.projectId);
    }
  }

  const addedAssets: Asset[] = [];
  for (const [assetId, asset] of patchedAssets) {
    if (assets.has(assetId) === false) {
      addedAssets.push(asset);
    }
  }
  if (addedAssets.length !== 0) {
    const files = await client
      .from("File")
      .select()
      .in(
        "name",
        addedAssets.map((asset) => asset.name)
      );

    const fileNames = new Set(files.data?.map((file) => file.name));

    // restore file when undo is triggered
    await client
      .from("File")
      .update({ isDeleted: false })
      .in("name", Array.from(fileNames));

    await client.from("Asset").insert(
      addedAssets
        // making sure corresponding file exist before creating an asset that references it
        .filter((asset) => fileNames.has(asset.name))
        .map((asset) => ({
          id: asset.id,
          projectId,
          name: asset.name,
        }))
    );
  }
};
