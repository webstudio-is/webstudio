import type { Folder } from "@webstudio-is/sdk";

export const parseFolders = (foldersString: string): Array<Folder> => {
  return JSON.parse(foldersString) as Array<Folder>;
};

export const serializeFolders = (folders: Array<Folder>) => {
  return JSON.stringify(folders);
};
