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
import { syncDataVersion, type Data } from "@webstudio-is/http-client";
import {
  getHomePage,
  type Asset,
  type Breakpoint,
  type DataSource,
  type Instance,
  type Prop,
  type Resource,
  type StyleDecl,
  type StyleDeclKey,
  type StyleSource,
} from "@webstudio-is/sdk";

const toMap = <Key extends string, Value>(entries: [Key, Value][]) =>
  new Map<Key, Value>(entries);

const assertSyncDataVersion = (data: Pick<Data, "syncDataVersion">) => {
  if (data.syncDataVersion !== syncDataVersion) {
    throw new Error(
      `Synced project data format is incompatible. Expected version ${syncDataVersion}, received ${data.syncDataVersion ?? "missing"}. Please run webstudio sync again and retry the import.`
    );
  }
};

const createBuildImportUpdate = ({
  data,
  lastTransactionId,
  updatedAt,
  version,
}: {
  data: Data;
  lastTransactionId: string;
  updatedAt: string;
  version: number;
}) => ({
  version,
  lastTransactionId,
  updatedAt,
  pages: JSON.stringify(data.build.pages),
  breakpoints: serializeData<Breakpoint>(toMap(data.build.breakpoints)),
  styles: serializeStyles(
    new Map<StyleDeclKey, StyleDecl>(
      data.build.styles.map(([styleDeclKey, style]) => [styleDeclKey, style])
    )
  ),
  styleSources: serializeData<StyleSource>(toMap(data.build.styleSources)),
  styleSourceSelections: serializeStyleSourceSelections(
    toMap(data.build.styleSourceSelections)
  ),
  props: serializeData<Prop>(toMap(data.build.props)),
  dataSources: serializeData<DataSource>(toMap(data.build.dataSources)),
  resources: serializeData<Resource>(toMap(data.build.resources)),
  instances: serializeData<Instance>(toMap(data.build.instances)),
});

const getImportedPreviewImageAssetId = (data: Data) => {
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

const ensureImportedAssetFiles = async ({
  assets,
  ctx,
  projectId,
}: {
  assets: Asset[];
  ctx: AppContext;
  projectId: string;
}) => {
  const assetsByFileName = new Map(assets.map((asset) => [asset.name, asset]));
  if (assetsByFileName.size === 0) {
    return;
  }

  const files = await ctx.postgrest.client
    .from("File")
    .select("name")
    .in("name", Array.from(assetsByFileName.keys()));

  if (files.error) {
    throw files.error;
  }

  for (const file of files.data ?? []) {
    assetsByFileName.delete(file.name);
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

const replaceProjectAssets = async ({
  assets,
  ctx,
  projectId,
}: {
  assets: Asset[];
  ctx: AppContext;
  projectId: string;
}) => {
  await ensureImportedAssetFiles({ assets, ctx, projectId });

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

export const importSyncedProjectData = async ({
  ctx,
  data,
  projectId,
}: {
  ctx: AppContext;
  data: Data;
  projectId: string;
}) => {
  assertSyncDataVersion(data);

  const canBuild = await authorizeProject.hasProjectPermit(
    { projectId, permit: "build" },
    ctx
  );
  if (canBuild === false) {
    throw new AuthorizationError(
      "You don't have permission to build this project."
    );
  }

  const build = await loadDevBuildByProjectId(ctx, projectId);
  const nextVersion = build.version + 1;

  await replaceProjectAssets({ assets: data.assets, ctx, projectId });

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
};
