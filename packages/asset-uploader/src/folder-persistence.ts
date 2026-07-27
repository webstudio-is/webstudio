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

const pendingProjectMutations = new Map<string, Promise<void>>();

/**
 * Serializes folder mutations handled by this process so each validation reads
 * the result of the preceding write. Separate application instances cannot
 * share this lock; database constraints remain the final protection for
 * references and sibling uniqueness.
 */
const withAssetFolderMutationLock = async <Result>(
  projectId: string,
  mutate: () => Promise<Result>
): Promise<Result> => {
  const previous = pendingProjectMutations.get(projectId) ?? Promise.resolve();
  let release = () => {};
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  pendingProjectMutations.set(projectId, current);
  await previous;
  try {
    return await mutate();
  } finally {
    release();
    if (pendingProjectMutations.get(projectId) === current) {
      pendingProjectMutations.delete(projectId);
    }
  }
};

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
  client: Client,
  folderIds?: string[]
): Promise<AssetFolder[]> => {
  let query = client
    .from("AssetFolder")
    .select("id, projectId, name, parentId, createdAt")
    .eq("projectId", projectId);
  if (folderIds !== undefined) {
    if (folderIds.length === 0) {
      return [];
    }
    query = query.in("id", folderIds);
  }
  const result = await query.order("id");
  assertPostgrestSuccess(result);

  return (result.data ?? []).map((folder) => ({
    id: folder.id,
    projectId: folder.projectId,
    name: folder.name,
    parentId: folder.parentId ?? undefined,
    createdAt: folder.createdAt,
  }));
};

export const upsertAssetFolderWithClient = async (
  {
    projectId,
    folder,
  }: {
    projectId: string;
    folder: AssetFolder;
  },
  client: Client
): Promise<AssetFolder> =>
  await withAssetFolderMutationLock(projectId, async () => {
    const current = new Map(
      (await loadAssetFoldersByProjectWithClient(projectId, client)).map(
        (item) => [item.id, item]
      )
    );
    const validated = assetFolders.parse(
      new Map(current).set(folder.id, folder)
    );
    const value = validated.get(folder.id);
    if (value === undefined) {
      throw new Error("Asset folder was not validated");
    }
    const result = await client
      .from("AssetFolder")
      .upsert(createAssetFolderRows([value], projectId), {
        onConflict: "id,projectId",
      })
      .select("id, projectId, name, parentId, createdAt")
      .single();
    assertPostgrestSuccess(result);
    if (result.data?.id !== value.id) {
      throw new Error("Asset folder was not persisted");
    }
    return {
      id: result.data.id,
      projectId: result.data.projectId,
      name: result.data.name,
      parentId: result.data.parentId ?? undefined,
      createdAt: result.data.createdAt,
    };
  });

export const patchAssetFoldersWithClient = async (
  { projectId, client }: { projectId: string; client: Client },
  patches: Array<Patch>,
  { deferDeletes = false }: { deferDeletes?: boolean } = {}
): Promise<string[]> =>
  await withAssetFolderMutationLock(projectId, async () => {
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
      const persisted = new Map(
        (result.data ?? []).map((row) => [row.id, row])
      );
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
      await deleteAssetFoldersUnlocked({ projectId, ids: deletedKeys }, client);
    }
    return deletedKeys;
  });

const deleteAssetFoldersUnlocked = async (
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

export const deleteAssetFoldersWithClient = async (
  props: { projectId: string; ids: string[] },
  client: Client
) =>
  await withAssetFolderMutationLock(props.projectId, async () => {
    await deleteAssetFoldersUnlocked(props, client);
  });
