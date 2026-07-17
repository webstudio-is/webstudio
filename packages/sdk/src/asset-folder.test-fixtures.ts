import type { AssetFolder, AssetFolders } from "./schema/asset-folders";

export const createAssetFolderFixture = ({
  id,
  parentId,
  name = id,
  createdAt = "2026-01-01T00:00:00.000Z",
}: {
  id: string;
  parentId?: string;
  name?: string;
  createdAt?: string;
}): AssetFolder => ({ id, projectId: "project", name, parentId, createdAt });

export const createAssetFoldersFixture = (
  ...folders: AssetFolder[]
): AssetFolders => new Map(folders.map((folder) => [folder.id, folder]));
