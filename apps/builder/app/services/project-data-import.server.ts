import { Buffer } from "node:buffer";
import {
  AuthorizationError,
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import {
  loadDevBuildByProjectId,
  serializeData,
} from "@webstudio-is/project-build/index.server";
import { migratePages } from "@webstudio-is/project-migrations/pages";
import { serializeStyles } from "@webstudio-is/project-build/styles.server";
import { serializeStyleSourceSelections } from "@webstudio-is/project-build/style-source-selections.server";
import {
  isAssetFileDataString,
  syncDataVersion,
  type AssetFileData,
  type SyncedProjectData,
} from "@webstudio-is/api-contract";
import { createAssetClient } from "~/shared/asset-client";
import {
  getHomePage,
  type Asset,
  type Breakpoint,
  type DataSource,
  type Instance,
  type Prop,
  type Resource,
  type StyleSource,
} from "@webstudio-is/sdk";

const toMap = <Key extends string, Value>(entries: [Key, Value][]) =>
  new Map<Key, Value>(entries);

const assertSyncDataVersion = (
  data: Pick<SyncedProjectData, "syncDataVersion">
) => {
  if (data.syncDataVersion !== syncDataVersion) {
    throw new Error(
      `Synced project data format is incompatible. Expected version ${syncDataVersion}, received ${data.syncDataVersion ?? "missing"}. Sync with a compatible API/CLI version and retry, or explicitly ignore the version check if you know the source and target data formats are compatible.`
    );
  }
};

const createBuildImportUpdate = ({
  data,
  lastTransactionId,
  updatedAt,
  version,
}: {
  data: SyncedProjectData;
  lastTransactionId: string;
  updatedAt: string;
  version: number;
}) => ({
  version,
  lastTransactionId,
  updatedAt,
  pages: JSON.stringify(data.build.pages),
  breakpoints: serializeData<Breakpoint>(toMap(data.build.breakpoints)),
  styles: serializeStyles(toMap(data.build.styles)),
  styleSources: serializeData<StyleSource>(toMap(data.build.styleSources)),
  styleSourceSelections: serializeStyleSourceSelections(
    toMap(data.build.styleSourceSelections)
  ),
  props: serializeData<Prop>(toMap(data.build.props)),
  dataSources: serializeData<DataSource>(toMap(data.build.dataSources)),
  resources: serializeData<Resource>(toMap(data.build.resources)),
  instances: serializeData<Instance>(toMap(data.build.instances)),
});

const getImportedPreviewImageAssetId = (data: SyncedProjectData) => {
  const socialImageAssetId = getHomePage(migratePages(data.build.pages)).meta
    .socialImageAssetId;
  if (socialImageAssetId === undefined) {
    return null;
  }
  const importedAssetIds = new Set(data.assets.map((asset) => asset.id));
  return importedAssetIds.has(socialImageAssetId) ? socialImageAssetId : null;
};

const createImportedFileRows = ({
  assets,
  projectId,
}: {
  assets: Asset[];
  projectId: string;
}) =>
  assets.map((asset) => ({
    name: asset.name,
    status: "UPLOADED" as const,
    format: asset.format,
    size: asset.size,
    meta: JSON.stringify(asset.meta),
    createdAt: asset.createdAt,
    uploaderProjectId: projectId,
    isDeleted: false,
  }));

async function* toByteStream(data: Uint8Array) {
  yield data;
}

const getAssetInfoFallback = (asset: Asset) => {
  if (asset.type !== "image") {
    return;
  }
  return {
    width: asset.meta.width,
    height: asset.meta.height,
    format: asset.format,
  };
};

const assertImportedAssetNames = (assets: Asset[]) => {
  const assetIds = new Set<string>();
  const assetNames = new Set<string>();

  for (const asset of assets) {
    if (asset.id === "") {
      throw new Error("Imported asset id is invalid.");
    }
    if (assetIds.has(asset.id)) {
      throw new Error(`Imported asset id is duplicated: ${asset.id}`);
    }
    if (
      asset.name === "" ||
      asset.name === "." ||
      asset.name === ".." ||
      asset.name.includes("/") ||
      asset.name.includes("\\")
    ) {
      throw new Error(`Imported asset name is invalid: ${asset.name}`);
    }
    if (assetNames.has(asset.name)) {
      throw new Error(`Imported asset name is duplicated: ${asset.name}`);
    }
    assetIds.add(asset.id);
    assetNames.add(asset.name);
  }
};

const assertAssetFilesMatchAssets = ({
  assetFiles,
  assets,
}: {
  assetFiles: AssetFileData[] | undefined;
  assets: Asset[];
}) => {
  assertImportedAssetNames(assets);

  if (assetFiles === undefined) {
    if (assets.length > 0) {
      throw new Error("Imported asset files are required.");
    }
    return;
  }

  const assetNames = new Set(assets.map((asset) => asset.name));
  const assetFileNames = new Set<string>();

  for (const assetFile of assetFiles) {
    if (isAssetFileDataString(assetFile.data) === false) {
      throw new Error(`Imported asset file data is invalid: ${assetFile.name}`);
    }
    if (assetFileNames.has(assetFile.name)) {
      throw new Error(`Imported asset file is duplicated: ${assetFile.name}`);
    }
    assetFileNames.add(assetFile.name);
  }

  for (const assetFileName of assetFileNames) {
    if (assetNames.has(assetFileName) === false) {
      throw new Error(
        `Imported asset file does not exist in data assets: ${assetFileName}`
      );
    }
  }

  for (const assetName of assetNames) {
    if (assetFileNames.has(assetName) === false) {
      throw new Error(`Imported asset file is missing: ${assetName}`);
    }
  }
};

const uploadImportedAssetFiles = async ({
  assetClient,
  assetFiles,
  assets,
}: {
  assetClient: ReturnType<typeof createAssetClient>;
  assetFiles: AssetFileData[];
  assets: Asset[];
}) => {
  const assetsByName = new Map(assets.map((asset) => [asset.name, asset]));

  for (const assetFile of assetFiles) {
    const asset = assetsByName.get(assetFile.name)!;
    await assetClient.uploadFile(
      asset.name,
      asset.type,
      toByteStream(Buffer.from(assetFile.data, "base64")),
      getAssetInfoFallback(asset)
    );
  }
};

const loadExistingImportedAssetFileNames = async ({
  assets,
  ctx,
}: {
  assets: Asset[];
  ctx: AppContext;
}) => {
  if (assets.length === 0) {
    return new Set<string>();
  }

  const files = await ctx.postgrest.client
    .from("File")
    .select("name")
    .in(
      "name",
      assets.map((asset) => asset.name)
    );

  if (files.error) {
    throw files.error;
  }

  return new Set((files.data ?? []).map((file) => file.name));
};

const ensureImportedAssetFiles = async ({
  assets,
  ctx,
  existingFileNames,
  projectId,
}: {
  assets: Asset[];
  ctx: AppContext;
  existingFileNames: Set<string>;
  projectId: string;
}) => {
  const assetsByFileName = new Map(assets.map((asset) => [asset.name, asset]));
  if (assetsByFileName.size === 0) {
    return;
  }

  for (const fileName of existingFileNames) {
    assetsByFileName.delete(fileName);
  }

  const restoreFiles = await ctx.postgrest.client
    .from("File")
    .update({ isDeleted: false })
    .in(
      "name",
      assets.map((asset) => asset.name)
    );
  if (restoreFiles.error) {
    throw restoreFiles.error;
  }

  if (assetsByFileName.size === 0) {
    return;
  }

  const insertedFiles = await ctx.postgrest.client.from("File").insert(
    createImportedFileRows({
      assets: Array.from(assetsByFileName.values()),
      projectId,
    })
  );
  if (insertedFiles.error) {
    throw insertedFiles.error;
  }
};

const replaceProjectAssetRows = async ({
  assets,
  ctx,
  projectId,
}: {
  assets: Asset[];
  ctx: AppContext;
  projectId: string;
}) => {
  const resetPreviewImage = await ctx.postgrest.client
    .from("Project")
    .update({ previewImageAssetId: null })
    .eq("id", projectId);
  if (resetPreviewImage.error) {
    throw resetPreviewImage.error;
  }

  const deletedAssets = await ctx.postgrest.client
    .from("Asset")
    .delete()
    .eq("projectId", projectId);
  if (deletedAssets.error) {
    throw deletedAssets.error;
  }

  if (assets.length === 0) {
    return;
  }

  const insertedAssets = await ctx.postgrest.client
    .from("Asset")
    .insert(createImportedAssetRows({ assets, projectId }));
  if (insertedAssets.error) {
    throw insertedAssets.error;
  }
};

const createImportedAssetRows = ({
  assets,
  projectId,
}: {
  assets: Asset[];
  projectId: string;
}) =>
  assets.map((asset) => ({
    id: asset.id,
    projectId,
    name: asset.name,
    filename: asset.filename ?? null,
    description: asset.description ?? null,
  }));

const updateProjectPreviewImage = async ({
  assetId,
  ctx,
  projectId,
}: {
  assetId: string | null;
  ctx: AppContext;
  projectId: string;
}) => {
  const updatedProject = await ctx.postgrest.client
    .from("Project")
    .update({ previewImageAssetId: assetId })
    .eq("id", projectId);
  if (updatedProject.error) {
    throw updatedProject.error;
  }
};

export const importSyncedProjectData = async (
  {
    assetFiles,
    ctx,
    data,
    ignoreVersionCheck = false,
    projectId,
  }: {
    assetFiles?: AssetFileData[];
    ctx: AppContext;
    data: SyncedProjectData;
    ignoreVersionCheck?: boolean;
    projectId: string;
  },
  dependencies = {
    createAssetClient,
    hasProjectPermit: authorizeProject.hasProjectPermit,
    loadDevBuildByProjectId,
    uploadImportedAssetFiles,
  }
) => {
  if (ignoreVersionCheck === false) {
    assertSyncDataVersion(data);
  }

  const canBuild = await dependencies.hasProjectPermit(
    { projectId, permit: "build" },
    ctx
  );
  if (canBuild === false) {
    throw new AuthorizationError(
      "You don't have permission to build this project."
    );
  }

  const build = await dependencies.loadDevBuildByProjectId(ctx, projectId);
  const nextVersion = build.version + 1;

  assertAssetFilesMatchAssets({ assetFiles, assets: data.assets });

  const existingFileNames = await loadExistingImportedAssetFileNames({
    assets: data.assets,
    ctx,
  });

  if (assetFiles !== undefined && assetFiles.length > 0) {
    await dependencies.uploadImportedAssetFiles({
      assetClient: dependencies.createAssetClient(),
      assetFiles,
      assets: data.assets,
    });
  }

  await ensureImportedAssetFiles({
    assets: data.assets,
    ctx,
    existingFileNames,
    projectId,
  });

  const update = await ctx.postgrest.client
    .from("Build")
    .update(
      createBuildImportUpdate({
        data,
        lastTransactionId: crypto.randomUUID(),
        updatedAt: new Date().toISOString(),
        version: nextVersion,
      }),
      { count: "exact" }
    )
    .match({
      id: build.id,
      projectId,
      version: build.version,
    });

  if (update.error) {
    throw update.error;
  }
  if (update.count !== 1) {
    throw new Error("Unable to import project data because build changed.");
  }

  await replaceProjectAssetRows({ assets: data.assets, ctx, projectId });

  await updateProjectPreviewImage({
    assetId: getImportedPreviewImageAssetId(data),
    ctx,
    projectId,
  });

  return { version: nextVersion };
};

export const __testing__ = {
  assertSyncDataVersion,
  createImportedFileRows,
  createImportedAssetRows,
  createBuildImportUpdate,
  getImportedPreviewImageAssetId,
  assertImportedAssetNames,
  assertAssetFilesMatchAssets,
  loadExistingImportedAssetFileNames,
  uploadImportedAssetFiles,
};
