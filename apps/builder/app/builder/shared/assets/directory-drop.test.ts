import { expect, test, vi } from "vitest";
import {
  createDroppedAssetFolderStructure,
  readDroppedAssetItems,
  type DroppedAssetDirectory,
} from "./directory-drop";

const fileEntry = (file: File) =>
  ({
    name: file.name,
    isFile: true,
    isDirectory: false,
    file: (success: FileCallback) => success(file),
  }) as FileSystemFileEntry;

const directoryEntry = (name: string, batches: readonly FileSystemEntry[][]) =>
  ({
    name,
    isFile: false,
    isDirectory: true,
    createReader: () => {
      let index = 0;
      return {
        readEntries: (success: FileSystemEntriesCallback) => {
          success(batches[index] ?? []);
          index += 1;
        },
      };
    },
  }) as FileSystemDirectoryEntry;

const droppedItem = (entry: FileSystemEntry, standard = false) =>
  ({
    kind: "file",
    type: "",
    getAsFile: () => null,
    webkitGetAsEntry: standard ? undefined : () => entry,
    ...(standard ? { getAsEntry: () => entry } : {}),
  }) as unknown as DataTransferItem;

test("reads dropped files and complete nested directory hierarchies", async () => {
  const direct = new File(["direct"], "direct.txt");
  const markdown = new File(["# Home"], "index.md");
  const logo = new File(["logo"], "logo.svg");
  const images = directoryEntry("images", [[fileEntry(logo)], []]);
  const empty = directoryEntry("empty", [[]]);
  const site = directoryEntry("site", [
    [fileEntry(markdown), images],
    [empty],
    [],
  ]);

  await expect(
    readDroppedAssetItems([
      droppedItem(fileEntry(direct), true),
      droppedItem(site),
    ])
  ).resolves.toEqual({
    files: [direct],
    directories: [
      {
        name: "site",
        files: [markdown],
        directories: [
          { name: "images", files: [logo], directories: [] },
          { name: "empty", files: [], directories: [] },
        ],
      },
    ],
  });
});

test("falls back to regular files when directory entries are unavailable", async () => {
  const file = new File(["content"], "file.txt");
  const item = {
    getAsFile: () => file,
    webkitGetAsEntry: () => null,
  } as unknown as DataTransferItem;

  await expect(readDroppedAssetItems([item])).resolves.toEqual({
    files: [file],
    directories: [],
  });
});

test("creates every folder before returning files grouped by destination", async () => {
  const readme = new File(["readme"], "readme.md");
  const logo = new File(["logo"], "logo.svg");
  const directories: DroppedAssetDirectory[] = [
    {
      name: "site",
      files: [readme],
      directories: [
        { name: "images", files: [logo], directories: [] },
        { name: "empty", files: [], directories: [] },
      ],
    },
  ];
  const getOrCreateFolder = vi.fn(
    async (name: string, parentId: string | undefined) =>
      parentId === undefined ? name : `${parentId}/${name}`
  );

  await expect(
    createDroppedAssetFolderStructure({
      directories,
      getOrCreateFolder,
    })
  ).resolves.toEqual([
    { folderId: "site", files: [readme] },
    { folderId: "site/images", files: [logo] },
  ]);
  expect(getOrCreateFolder.mock.calls).toEqual([
    ["site", undefined],
    ["images", "site"],
    ["empty", "site"],
  ]);
});
