import {
  assetFolders,
  createAssetFolderHierarchy,
  type AssetFolder,
} from "@webstudio-is/sdk";
import type { Client } from "@webstudio-is/postgrest/index.server";
import {
  applyValidatedMapPatches,
  assertPostgrestSuccess,
  diffMaps,
  type Patch,
} from "./patch-utils";

export const createAssetFolderRows = (
  folders: Iterable<AssetFolder>,
  projectId: string
) => {
  const folderList = Array.from(folders);
  const hierarchy = createAssetFolderHierarchy(
    new Map(folderList.map((folder) => [folder.id, folder]))
  );
  return hierarchy.sortByDepth(folderList).map((folder) => ({
    id: folder.id,
    projectId,
    name: folder.name,
    parentId: folder.parentId ?? null,
    createdAt: folder.createdAt,
  }));
};

export const loadAssetFoldersByProjectWithClient = async (
  projectId: string,
  client: Client
): Promise<AssetFolder[]> => {
  const result = await client
    .from("AssetFolder")
    .select("id, projectId, name, parentId, createdAt")
    .eq("projectId", projectId)
    .order("id");
  assertPostgrestSuccess(result);

  return (result.data ?? []).map((folder) => ({
    id: folder.id,
    projectId: folder.projectId,
    name: folder.name,
    parentId: folder.parentId ?? undefined,
    createdAt: folder.createdAt,
  }));
};

export const patchAssetFoldersWithClient = async (
  { projectId, client }: { projectId: string; client: Client },
  patches: Array<Patch>,
  { deferDeletes = false }: { deferDeletes?: boolean } = {}
): Promise<string[]> => {
  const currentList = await loadAssetFoldersByProjectWithClient(
    projectId,
    client
  );
  const current = new Map(currentList.map((folder) => [folder.id, folder]));
  const validated = applyValidatedMapPatches(current, patches, (value) =>
    assetFolders.parse(value)
  );
  for (const folder of validated.values()) {
    if (folder.projectId !== projectId) {
      throw new Error(`Asset folder ${folder.id} belongs to another project`);
    }
  }

  const { added, updated, deletedKeys } = diffMaps(
    current,
    validated,
    (previous, folder) =>
      previous.name === folder.name && previous.parentId === folder.parentId
  );
  const changed = [...added, ...updated];
  if (changed.length > 0) {
    const result = await client
      .from("AssetFolder")
      .upsert(createAssetFolderRows(changed, projectId), {
        onConflict: "id,projectId",
      })
      .select("id, name, parentId");
    assertPostgrestSuccess(result);
    const persisted = new Map((result.data ?? []).map((row) => [row.id, row]));
    for (const folder of changed) {
      const row = persisted.get(folder.id);
      if (
        row?.name !== folder.name ||
        (row.parentId ?? undefined) !== folder.parentId
      ) {
        throw new Error(
          `Asset folder update was not persisted for ${folder.id}`
        );
      }
    }
  }

  if (deletedKeys.length > 0 && deferDeletes === false) {
    await deleteAssetFoldersWithClient({ projectId, ids: deletedKeys }, client);
  }
  return deletedKeys;
};

export const deleteAssetFoldersWithClient = async (
  { projectId, ids }: { projectId: string; ids: string[] },
  client: Client
) => {
  if (ids.length === 0) {
    return;
  }
  const result = await client
    .from("AssetFolder")
    .delete()
    .in("id", ids)
    .eq("projectId", projectId)
    .select("id");
  assertPostgrestSuccess(result);
  const deletedIds = new Set((result.data ?? []).map(({ id }) => id));
  const missingId = ids.find((id) => deletedIds.has(id) === false);
  if (missingId !== undefined) {
    throw new Error(`Asset folder deletion was not persisted for ${missingId}`);
  }
};
