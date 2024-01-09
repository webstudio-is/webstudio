import type { Folder, Folders } from "@webstudio-is/sdk";

export const parseFolders = (foldersString: string): Folders => {
  const folders = JSON.parse(foldersString) as Array<Folder>;
  return new Map(folders.map((folder) => [folder.id, folder]));
};

export const serializeFolders = (folders: Folders) => {
  const foldersValues: Array<Folder> = Array.from(folders.values());
  return JSON.stringify(foldersValues);
};
