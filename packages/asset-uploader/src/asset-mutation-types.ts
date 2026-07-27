/** Storage-layer commands after transport validation has completed. */
export type AssetMetadataUpdate = {
  filename?: string | null;
  description?: string | null;
  folderId?: string | null;
};

export type AssetFolderUpdate = {
  name?: string;
  parentId?: string | null;
};
