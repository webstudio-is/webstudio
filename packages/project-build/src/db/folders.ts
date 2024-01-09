import type { Folder } from "@webstudio-is/sdk";

export const parseFolders = (
  foldersString: string
): Map<Folder["id"], Folder> => {
  const folders = JSON.parse(foldersString) as Array<Folder>;
  return new Map(folders.map((folder) => [folder.id, folder]));
};

export const serializeFolders = (folders: Map<Folder["id"], Folder>) => {
  const foldersValues: Array<Folder> = Array.from(folders.values());
  return JSON.stringify(foldersValues);
};
