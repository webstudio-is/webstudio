import { describe, expect, test } from "vitest";
import { createDefaultCollectionConfig } from "@webstudio-is/content-engine";
import type { Asset } from "@webstudio-is/sdk";
import { validateCollectionFolder } from "./collection-persistence";

describe("collection persistence", () => {
  test("rejects a truncated collection config read", async () => {
    const source = createDefaultCollectionConfig();
    const configAsset: Asset = {
      id: "config",
      projectId: "project-1",
      name: "config-storage.json",
      filename: "collection",
      folderId: "posts",
      type: "file",
      format: "json",
      size: source.length,
      description: null,
      createdAt: "2026-09-03T00:00:00.000Z",
      meta: {},
    };

    await expect(
      validateCollectionFolder({
        assets: [configAsset],
        folderId: "posts",
        assetStore: {
          readFile: async () => ({
            data: new Blob([source.slice(0, -1)]).stream(),
            contentLength: source.length - 1,
          }),
        },
      })
    ).rejects.toThrow("content length does not match its metadata");
  });

  test("rejects a truncated collection template read", async () => {
    const configSource = createDefaultCollectionConfig();
    const templateSource = "---\ndraft: true\n---\n\nStart writing.\n";
    const configAsset: Asset = {
      id: "config",
      projectId: "project-1",
      name: "config-storage.json",
      filename: "collection",
      folderId: "posts",
      type: "file",
      format: "json",
      size: configSource.length,
      description: null,
      createdAt: "2026-09-03T00:00:00.000Z",
      meta: {},
    };
    const templateAsset: Asset = {
      ...configAsset,
      id: "template",
      name: "template-storage.mdx",
      filename: "template",
      format: "mdx",
      size: templateSource.length,
    };

    await expect(
      validateCollectionFolder({
        assets: [configAsset, templateAsset],
        folderId: "posts",
        assetStore: {
          readFile: async (name) => {
            const source =
              name === configAsset.name
                ? configSource
                : templateSource.slice(0, -1);
            return {
              data: new Blob([source]).stream(),
              contentLength: source.length,
            };
          },
        },
      })
    ).rejects.toThrow("content length does not match its metadata");
  });

  test("rejects case-insensitive duplicate entry filenames", async () => {
    const configSource = createDefaultCollectionConfig();
    const templateSource = "---\ndraft: true\n---\n\nStart writing.\n";
    const entrySource =
      "---\ntitle: Hello world\nslug: hello-world\ndraft: true\n---\n\nBody.\n";
    const configAsset: Asset = {
      id: "config",
      projectId: "project-1",
      name: "config-storage.json",
      filename: "collection",
      folderId: "posts",
      type: "file",
      format: "json",
      size: configSource.length,
      description: null,
      createdAt: "2026-09-03T00:00:00.000Z",
      meta: {},
    };
    const templateAsset: Asset = {
      ...configAsset,
      id: "template",
      name: "template-storage.mdx",
      filename: "template",
      format: "mdx",
      size: templateSource.length,
    };
    const firstEntry: Asset = {
      ...templateAsset,
      id: "first-entry",
      name: "first-entry-storage.mdx",
      filename: "hello-world",
      size: entrySource.length,
    };
    const secondEntry: Asset = {
      ...firstEntry,
      id: "second-entry",
      name: "second-entry-storage.mdx",
      filename: "HELLO-WORLD",
    };
    const sources = new Map([
      [configAsset.name, configSource],
      [templateAsset.name, templateSource],
      [firstEntry.name, entrySource],
      [secondEntry.name, entrySource],
    ]);

    await expect(
      validateCollectionFolder({
        assets: [configAsset, templateAsset, firstEntry, secondEntry],
        folderId: "posts",
        assetStore: {
          readFile: async (name) => {
            const source = sources.get(name);
            if (source === undefined) {
              throw new Error(`Unexpected read: ${name}`);
            }
            return {
              data: new Blob([source]).stream(),
              contentLength: source.length,
            };
          },
        },
      })
    ).rejects.toThrow('duplicate filename "HELLO-WORLD.mdx"');
  });
});
