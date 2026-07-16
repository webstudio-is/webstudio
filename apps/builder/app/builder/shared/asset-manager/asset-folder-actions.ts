import { executeRuntimeMutation } from "~/shared/instance-utils/data";

export const createAssetFolder = (values: {
  name: string;
  parentId: string | undefined;
}) => executeRuntimeMutation({ id: "assetFolders.create", input: values });

const updateAssetFolder = (
  folderId: string,
  values: { name?: string; parentId?: string | null }
) =>
  executeRuntimeMutation({
    id: "assetFolders.update",
    input: { folderId, values },
  });

export const saveAssetFolder = (
  folderId: string,
  values: { name: string; parentId: string | undefined }
) =>
  updateAssetFolder(folderId, {
    name: values.name,
    parentId: values.parentId ?? null,
  });

export const moveAssetFolder = (
  folderId: string,
  parentId: string | undefined
) => updateAssetFolder(folderId, { parentId: parentId ?? null });

export const deleteAssetFolder = (folderId: string) =>
  executeRuntimeMutation({
    id: "assetFolders.delete",
    input: { folderId },
  });

export const moveAssetToFolder = (
  assetId: string,
  folderId: string | undefined
) =>
  executeRuntimeMutation({
    id: "assets.update",
    input: { assetId, values: { folderId: folderId ?? null } },
  });
