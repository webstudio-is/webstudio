export type DroppedAssetDirectory = {
  name: string;
  files: File[];
  directories: DroppedAssetDirectory[];
};

export type DroppedAssetItems = {
  files: File[];
  directories: DroppedAssetDirectory[];
};

type DataTransferItemWithEntry = DataTransferItem & {
  getAsEntry?: () => FileSystemEntry | null;
};

const getEntry = (item: DataTransferItem) => {
  const itemWithEntry = item as DataTransferItemWithEntry;
  return itemWithEntry.getAsEntry?.() ?? item.webkitGetAsEntry?.();
};

const readFileEntry = (entry: FileSystemFileEntry) =>
  new Promise<File>((resolve, reject) => entry.file(resolve, reject));

const readDirectoryEntries = async (entry: FileSystemDirectoryEntry) => {
  const reader = entry.createReader();
  const entries: FileSystemEntry[] = [];
  while (true) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject)
    );
    if (batch.length === 0) {
      return entries;
    }
    entries.push(...batch);
  }
};

const readDirectoryEntry = async (
  entry: FileSystemDirectoryEntry
): Promise<DroppedAssetDirectory> => {
  const children = await readDirectoryEntries(entry);
  const files: File[] = [];
  const directories: DroppedAssetDirectory[] = [];
  for (const child of children) {
    if (child.isFile) {
      files.push(await readFileEntry(child as FileSystemFileEntry));
      continue;
    }
    if (child.isDirectory) {
      directories.push(
        await readDirectoryEntry(child as FileSystemDirectoryEntry)
      );
    }
  }
  return { name: entry.name, files, directories };
};

export const readDroppedAssetItems = async (
  items: readonly DataTransferItem[]
): Promise<DroppedAssetItems> => {
  const files: File[] = [];
  const directories: DroppedAssetDirectory[] = [];

  for (const item of items) {
    const entry = getEntry(item);
    if (entry?.isDirectory) {
      directories.push(
        await readDirectoryEntry(entry as FileSystemDirectoryEntry)
      );
      continue;
    }
    if (entry?.isFile) {
      files.push(await readFileEntry(entry as FileSystemFileEntry));
      continue;
    }
    const file = item.getAsFile();
    if (file !== null) {
      files.push(file);
    }
  }

  return { files, directories };
};

export type DroppedAssetFileGroup = {
  folderId: string;
  files: File[];
};

export const createDroppedAssetFolderStructure = async ({
  directories,
  parentFolderId,
  getOrCreateFolder,
}: {
  directories: readonly DroppedAssetDirectory[];
  parentFolderId?: string;
  getOrCreateFolder: (
    name: string,
    parentId: string | undefined
  ) => string | Promise<string>;
}): Promise<DroppedAssetFileGroup[]> => {
  const groups: DroppedAssetFileGroup[] = [];
  const createDirectories = async (
    children: readonly DroppedAssetDirectory[],
    parentId: string | undefined
  ) => {
    for (const directory of children) {
      const folderId = await getOrCreateFolder(directory.name, parentId);
      if (directory.files.length > 0) {
        groups.push({ folderId, files: directory.files });
      }
      await createDirectories(directory.directories, folderId);
    }
  };

  await createDirectories(directories, parentFolderId);
  return groups;
};
