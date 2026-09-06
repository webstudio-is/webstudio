import {
  AuthorizationError,
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import {
  serializeConfig,
  serializeData,
  serializeStyles,
  serializeStyleSourceSelections,
} from "@webstudio-is/project-build/persistence";
import {
  createAssetFolderRows,
  createAssetRows,
  formatAsset,
  getCollectionFolderIds,
  validateCollectionFolder,
  type AssetObjectReader,
} from "@webstudio-is/asset-uploader/server";
import { loadDevBuildByProjectId } from "@webstudio-is/project-build/server";
import {
  migratePages,
  serializePages,
} from "@webstudio-is/project-migrations/pages";
import {
  createProjectSettingsFromPages,
  removeLegacyProjectSettingsFromPages,
} from "@webstudio-is/project-build";
import {
  isAssetFileName,
  getMissingImportedAssetFilesMessage,
  getBundleVersionMismatchMessage,
  bundleVersion,
  type PublishedProjectBundle,
  type ProjectBundle,
} from "@webstudio-is/protocol";
import {
  createId,
  getHomePage,
  normalizeAssetFolderData,
  assetFolders as assetFoldersSchema,
  type Asset,
  type AssetFolder,
  type Breakpoint,
  type DataSource,
  type Instance,
  type Prop,
  type Resource,
  type StyleSource,
} from "@webstudio-is/sdk";
import { createAssetClient } from "~/shared/asset-client";

const toMap = <Key extends string, Value>(entries: [Key, Value][]) =>
  new Map<Key, Value>(entries);

const assertBundleVersion = (
  data: Pick<PublishedProjectBundle, "bundleVersion">
) => {
  if (data.bundleVersion !== bundleVersion) {
    throw new Error(
      getBundleVersionMismatchMessage({
        ignoreVersionCheckHint:
          "explicitly ignore the version check if you know the source and target data formats are compatible",
        receivedVersion: data.bundleVersion,
      })
    );
  }
};

export const assertProjectBuildPermit = async ({
  ctx,
  hasProjectPermit = authorizeProject.hasProjectPermit,
  projectId,
}: {
  ctx: AppContext;
  hasProjectPermit?: typeof authorizeProject.hasProjectPermit;
  projectId: string;
}) => {
  const canBuild = await hasProjectPermit({ projectId, permit: "build" }, ctx);
  if (canBuild === false) {
    throw new AuthorizationError(
      "You don't have permission to build this project."
    );
  }
};

const createBuildImportUpdate = ({
  data,
  lastTransactionId,
  updatedAt,
  version,
}: {
  data: ProjectBundle;
  lastTransactionId: string;
  updatedAt: string;
  version: number;
}) => {
  const pages = migratePages(data.build.pages);
  const projectSettings =
    data.build.projectSettings ?? createProjectSettingsFromPages(pages);
  return {
    version,
    lastTransactionId,
    updatedAt,
    pages: JSON.stringify(
      serializePages(removeLegacyProjectSettingsFromPages(pages))
    ),
    projectSettings: serializeConfig(projectSettings),
    ...(data.build.marketplaceProduct === undefined
      ? {}
      : {
          marketplaceProduct: serializeConfig(data.build.marketplaceProduct),
        }),
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
  };
};

const getImportedPreviewImageAssetId = (data: ProjectBundle) => {
  const socialImageAssetId = getHomePage(migratePages(data.build.pages)).meta
    .socialImageAssetId;
  if (socialImageAssetId === undefined) {
    return null;
  }
  const importedAssetIds = new Set(data.assets.map((asset) => asset.id));
  return importedAssetIds.has(socialImageAssetId) ? socialImageAssetId : null;
};

const assertImportedAssetNames = (assets: Asset[]) => {
  const assetIds = new Set<string>();

  for (const asset of assets) {
    if (asset.id === "") {
      throw new Error("Imported asset id is invalid.");
    }
    if (assetIds.has(asset.id)) {
      throw new Error(`Imported asset id is duplicated: ${asset.id}`);
    }
    if (isAssetFileName(asset.name) === false) {
      throw new Error(`Imported asset name is invalid: ${asset.name}`);
    }
    assetIds.add(asset.id);
  }
};

const assertImportedAssets = (assets: Asset[]) => {
  assertImportedAssetNames(assets);
};

const normalizeImportedAssetFolderData = (
  folders: AssetFolder[],
  assets: Asset[]
) => {
  const folderMap = new Map(folders.map((folder) => [folder.id, folder]));
  if (folderMap.size !== folders.length) {
    throw new Error("Imported asset folder id is duplicated.");
  }
  const validatedFolders = assetFoldersSchema.parse(folderMap);
  return normalizeAssetFolderData({
    assets,
    folders: Array.from(validatedFolders.values()),
  });
};

const loadImportedAssetFiles = async ({
  assets,
  ctx,
  projectId,
}: {
  assets: Asset[];
  ctx: AppContext;
  projectId: string;
}) => {
  if (assets.length === 0) {
    return { assets, fileNames: new Set<string>() };
  }

  const files = await ctx.postgrest.client
    .from("File")
    .select("name, format, description, size, createdAt, updatedAt, meta")
    .eq("status", "UPLOADED")
    .eq("uploaderProjectId", projectId)
    .in(
      "name",
      assets.map((asset) => asset.name)
    );

  if (files.error) {
    throw files.error;
  }

  const filesByName = new Map(
    (files.data ?? []).map((file) => [file.name, file])
  );
  const missingAssets = assets.filter(
    (asset) => filesByName.has(asset.name) === false
  );
  if (missingAssets.length > 0) {
    throw new Error(
      getMissingImportedAssetFilesMessage(
        missingAssets.map((asset) => asset.name)
      )
    );
  }

  return {
    assets: assets.map((asset) => {
      const file = filesByName.get(asset.name);
      if (file === undefined) {
        throw new Error(`Imported asset file is missing: ${asset.name}`);
      }
      return formatAsset({
        assetId: asset.id,
        projectId,
        filename: asset.filename ?? null,
        description: asset.description ?? null,
        folderId: asset.folderId,
        file,
      });
    }),
    fileNames: new Set(filesByName.keys()),
  };
};

const restoreImportedAssetFiles = async ({
  fileNames,
  ctx,
  projectId,
}: {
  fileNames: ReadonlySet<string>;
  ctx: AppContext;
  projectId: string;
}) => {
  if (fileNames.size === 0) {
    return;
  }
  const visibleFiles = await ctx.postgrest.client
    .from("File")
    .update({ isDeleted: false })
    .eq("uploaderProjectId", projectId)
    .in("name", Array.from(fileNames));
  if (visibleFiles.error) {
    throw visibleFiles.error;
  }
};

const validateImportedCollections = async ({
  assets,
  assetStore,
}: {
  assets: readonly Asset[];
  assetStore: AssetObjectReader;
}) => {
  for (const folderId of getCollectionFolderIds(assets)) {
    await validateCollectionFolder({ assets, folderId, assetStore });
  }
};

const replaceProjectAssetRows = async ({
  assets,
  assetFolders,
  ctx,
  projectId,
}: {
  assets: Asset[];
  assetFolders: AssetFolder[];
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

  const deletedFolders = await ctx.postgrest.client
    .from("AssetFolder")
    .delete()
    .eq("projectId", projectId);
  if (deletedFolders.error) {
    throw deletedFolders.error;
  }

  if (assetFolders.length > 0) {
    const insertedFolder = await ctx.postgrest.client
      .from("AssetFolder")
      .insert(createAssetFolderRows(assetFolders, projectId));
    if (insertedFolder.error) {
      throw insertedFolder.error;
    }
  }

  if (assets.length === 0) {
    return;
  }

  const insertedAssets = await ctx.postgrest.client
    .from("Asset")
    .insert(createAssetRows(assets, projectId));
  if (insertedAssets.error) {
    throw insertedAssets.error;
  }
};

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

export const importPublishedProjectBundle = async (
  {
    ctx,
    data,
    ignoreVersionCheck = false,
    projectId,
  }: {
    ctx: AppContext;
    data: PublishedProjectBundle;
    ignoreVersionCheck?: boolean;
    projectId: string;
  },
  dependencies: {
    hasProjectPermit: typeof authorizeProject.hasProjectPermit;
    loadDevBuildByProjectId: typeof loadDevBuildByProjectId;
    assetStore?: AssetObjectReader;
  } = {
    hasProjectPermit: authorizeProject.hasProjectPermit,
    loadDevBuildByProjectId,
  }
) => {
  if (ignoreVersionCheck === false) {
    assertBundleVersion(data);
  }

  await assertProjectBuildPermit({
    ctx,
    hasProjectPermit: dependencies.hasProjectPermit,
    projectId,
  });

  const build = await dependencies.loadDevBuildByProjectId(ctx, projectId);
  const nextVersion = build.version + 1;

  assertImportedAssets(data.assets);
  const { assets: normalizedAssets, folders: importedAssetFolders } =
    normalizeImportedAssetFolderData(data.assetFolders ?? [], data.assets);

  const { assets: importedAssets, fileNames: importedFileNames } =
    await loadImportedAssetFiles({
      assets: normalizedAssets,
      ctx,
      projectId,
    });
  const collectionFolderIds = getCollectionFolderIds(importedAssets);
  if (collectionFolderIds.size > 0) {
    await validateImportedCollections({
      assets: importedAssets,
      assetStore: dependencies.assetStore ?? createAssetClient(),
    });
  }
  const buildUpdate = createBuildImportUpdate({
    data,
    lastTransactionId: createId(),
    updatedAt: new Date().toISOString(),
    version: nextVersion,
  });
  const update = await ctx.postgrest.client
    .from("Build")
    .update(buildUpdate, { count: "exact" })
    .match({
      id: build.id,
      projectId,
      version: build.version,
    });

  if (update.error) {
    throw update.error;
  }
  if (update.count !== 1) {
    throw new Error("Unable to import project bundle because build changed.");
  }

  await replaceProjectAssetRows({
    assets: importedAssets,
    assetFolders: importedAssetFolders,
    ctx,
    projectId,
  });

  await restoreImportedAssetFiles({
    fileNames: importedFileNames,
    ctx,
    projectId,
  });

  await updateProjectPreviewImage({
    assetId: getImportedPreviewImageAssetId(data),
    ctx,
    projectId,
  });

  return { version: nextVersion };
};

export const __testing__ = {
  assertProjectBuildPermit,
  assertBundleVersion,
  createBuildImportUpdate,
  getImportedPreviewImageAssetId,
  assertImportedAssetNames,
  assertImportedAssets,
  normalizeImportedAssetFolderData,
  loadImportedAssetFiles,
  restoreImportedAssetFiles,
  validateImportedCollections,
};
