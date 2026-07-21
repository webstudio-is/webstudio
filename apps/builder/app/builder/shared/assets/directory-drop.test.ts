import { expect, test } from "vitest";
import { readDroppedAssetItems } from "./directory-drop";

const fileEntry = (file: File) =>
  ({
    name: file.name,
    isFile: true,
    isDirectory: false,
    file: (resolve: FileCallback) => resolve(file),
  }) as FileSystemFileEntry;

const directoryEntry = (
  name: string,
  batches: readonly FileSystemEntry[][]
) => {
  let index = 0;
  return {
    name,
    isFile: false,
    isDirectory: true,
    createReader: () => ({
      readEntries: (resolve: FileSystemEntriesCallback) => {
        resolve(batches[index] ?? []);
        index += 1;
      },
    }),
  } as FileSystemDirectoryEntry;
};

test("reads dropped directories without calling getAsFile on them", async () => {
  const file = new File(["content"], "index.html");
  const directory = directoryEntry("site", [[fileEntry(file)], []]);
  const item = {
    kind: "file",
    getAsEntry: () => directory,
    getAsFile: () => {
      throw new DOMException("directory", "NotFoundError");
    },
  } as unknown as DataTransferItem;

  await expect(readDroppedAssetItems([item])).resolves.toEqual({
    files: [],
    directories: [{ name: "site", files: [file], directories: [] }],
  });
});

test("falls back to regular files when no entry API is available", async () => {
  const file = new File(["content"], "file.txt");
  const item = { getAsFile: () => file } as unknown as DataTransferItem;

  await expect(readDroppedAssetItems([item])).resolves.toEqual({
    files: [file],
    directories: [],
  });
});
