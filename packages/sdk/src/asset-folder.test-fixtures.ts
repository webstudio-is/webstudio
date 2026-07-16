import type { AssetFolder, AssetFolders } from "./schema/asset-folders";

export const createAssetFolderFixture = (
  id: string,
  parentId?: string,
  name = id
): AssetFolder => ({
  id,
  projectId: "project",
  name,
  parentId,
  createdAt: "2026-01-01T00:00:00.000Z",
});

export const createAssetFoldersFixture = (
  ...folders: AssetFolder[]
): AssetFolders => new Map(folders.map((folder) => [folder.id, folder]));
