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
} from "@webstudio-is/asset-uploader/index.server";
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
  const assetNames = new Set<string>();

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
    if (assetNames.has(asset.name)) {
      throw new Error(`Imported asset name is duplicated: ${asset.name}`);
    }
    assetIds.add(asset.id);
    assetNames.add(asset.name);
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

const assertImportedAssetFilesUploaded = async ({
  assets,
  ctx,
  projectId,
}: {
  assets: Asset[];
  ctx: AppContext;
  projectId: string;
}) => {
  if (assets.length === 0) {
    return;
  }

  const files = await ctx.postgrest.client
    .from("File")
    .select("name")
    .eq("status", "UPLOADED")
    .eq("uploaderProjectId", projectId)
    .in(
      "name",
      assets.map((asset) => asset.name)
    );

  if (files.error) {
    throw files.error;
  }

  const existingFileNames = new Set(
    (files.data ?? []).map((file) => file.name)
  );
  const missingAssets = assets.filter(
    (asset) => existingFileNames.has(asset.name) === false
  );
  if (missingAssets.length > 0) {
    throw new Error(
      getMissingImportedAssetFilesMessage(
        missingAssets.map((asset) => asset.name)
      )
    );
  }

  if (existingFileNames.size > 0) {
    const visibleFiles = await ctx.postgrest.client
      .from("File")
      .update({ isDeleted: false })
      .in("name", Array.from(existingFileNames));
    if (visibleFiles.error) {
      throw visibleFiles.error;
    }
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
  dependencies = {
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
  const { assets: importedAssets, folders: importedAssetFolders } =
    normalizeImportedAssetFolderData(data.assetFolders ?? [], data.assets);

  await assertImportedAssetFilesUploaded({
    assets: importedAssets,
    ctx,
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
    throw new Error("Unable to import project bundle because build changed.");
  }

  await replaceProjectAssetRows({
    assets: importedAssets,
    assetFolders: importedAssetFolders,
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
  assertImportedAssetFilesUploaded,
};
