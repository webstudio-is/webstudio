import { describe, expect, test } from "vitest";
import type { Asset } from "@webstudio-is/sdk";
import { createDefaultCollectionConfig } from "@webstudio-is/content-engine";
import {
  createLoadingContentCollections,
  discoverContentCollections,
  getCollectionReservedAssetIds,
  mergeLoadingContentCollections,
} from "./content-collections";

const asset = ({
  id,
  filename,
  format,
}: {
  id: string;
  filename: string;
  format: string;
}): Asset => ({
  id,
  projectId: "project",
  name: `${filename}_${id}.${format}`,
  filename,
  description: null,
  folderId: "folder",
  size: 1,
  createdAt: "2026-09-02T00:00:00.000Z",
  type: "file",
  format,
  meta: {},
});

describe("discoverContentCollections", () => {
  test("reserves possible templates while collection settings load", () => {
    const config = asset({
      id: "config",
      filename: "collection",
      format: "json",
    });
    const possibleTemplate = asset({
      id: "possible-template",
      filename: "article",
      format: "mdx",
    });
    const loading = createLoadingContentCollections([config, possibleTemplate]);

    expect(
      getCollectionReservedAssetIds(loading, { includeInvalid: true })
    ).toEqual(new Set([config.id, possibleTemplate.id]));
  });

  test("keeps a ready collection stable when an entry changes", async () => {
    const config = asset({
      id: "config",
      filename: "collection",
      format: "json",
    });
    const template = asset({
      id: "template",
      filename: "template",
      format: "mdx",
    });
    const discovered = await discoverContentCollections({
      assets: [config, template],
      readSource: async (currentAsset) =>
        currentAsset.id === config.id
          ? createDefaultCollectionConfig()
          : "---\ndraft: false\n---\n",
    });
    const ready = discovered.get("folder");
    const entry = asset({ id: "entry", filename: "hello", format: "mdx" });

    const merged = mergeLoadingContentCollections({
      current: discovered,
      loading: createLoadingContentCollections([config, template, entry]),
    });

    expect(merged.get("folder")).toBe(ready);
  });

  test("recognizes collection.json and reserves its referenced template", async () => {
    const config = asset({
      id: "config",
      filename: "collection",
      format: "json",
    });
    const template = asset({
      id: "template",
      filename: "template",
      format: "mdx",
    });
    const collections = await discoverContentCollections({
      assets: [config, template],
      readSource: async (currentAsset) =>
        currentAsset.id === config.id
          ? createDefaultCollectionConfig()
          : "---\ndraft: false\n---\n\nStart writing.\n",
    });

    expect(collections.get("folder")).toMatchObject({
      status: "ready",
      configAsset: config,
      templateAsset: template,
      templateProperties: { draft: false },
    });
  });

  test("keeps a folder special when collection.json is invalid", async () => {
    const config = asset({
      id: "config",
      filename: "collection",
      format: "json",
    });
    const possibleTemplate = asset({
      id: "possible-template",
      filename: "article",
      format: "mdx",
    });
    const collections = await discoverContentCollections({
      assets: [config, possibleTemplate],
      readSource: async () => "not json",
    });

    expect(collections.get("folder")).toMatchObject({
      status: "invalid",
      message: "collection.json contains invalid JSON",
    });
    expect(
      getCollectionReservedAssetIds(collections, { includeInvalid: true })
    ).toEqual(new Set([config.id, possibleTemplate.id]));
  });

  test("keeps an identified invalid template reserved in content mode", async () => {
    const config = asset({
      id: "config",
      filename: "collection",
      format: "json",
    });
    const template = asset({
      id: "template",
      filename: "template",
      format: "mdx",
    });
    const collections = await discoverContentCollections({
      assets: [config, template],
      readSource: async (currentAsset) =>
        currentAsset.id === config.id
          ? createDefaultCollectionConfig()
          : "---\ndraft: true\n---\n\n<Broken",
    });

    expect(collections.get("folder")).toMatchObject({
      status: "invalid",
      configAsset: config,
      templateAsset: template,
      repairAsset: template,
    });
    expect(
      getCollectionReservedAssetIds(collections, { includeInvalid: true })
    ).toEqual(new Set([config.id, template.id]));
  });

  test("reports a direct non-entry file as an invalid collection", async () => {
    const config = asset({
      id: "config",
      filename: "collection",
      format: "json",
    });
    const template = asset({
      id: "template",
      filename: "template",
      format: "mdx",
    });
    const image = asset({ id: "image", filename: "cover", format: "png" });
    const collections = await discoverContentCollections({
      assets: [config, template, image],
      readSource: async () => createDefaultCollectionConfig(),
    });

    expect(collections.get("folder")).toMatchObject({
      status: "invalid",
      message: 'Move "cover.png" into a subfolder',
      editorRepair: { action: "move", asset: image },
    });
  });

  test("reports an invalid entry without reserving it from repair", async () => {
    const config = asset({
      id: "config",
      filename: "collection",
      format: "json",
    });
    const template = asset({
      id: "template",
      filename: "template",
      format: "mdx",
    });
    const entry = asset({ id: "entry", filename: "hello", format: "mdx" });
    const reads = new Map<string, number>();
    const collections = await discoverContentCollections({
      assets: [config, template, entry],
      readSource: async (currentAsset) => {
        reads.set(currentAsset.id, (reads.get(currentAsset.id) ?? 0) + 1);
        if (currentAsset.id === config.id) {
          return createDefaultCollectionConfig();
        }
        if (currentAsset.id === template.id) {
          return "---\ndraft: true\n---\n";
        }
        return "---\ntitle: Hello\nslug: another-slug\ndraft: false\n---\n";
      },
    });

    expect(collections.get("folder")).toMatchObject({
      status: "invalid",
      repairAsset: entry,
      editorRepair: { action: "edit", asset: entry },
      message:
        'Collection entry "hello.mdx": The slug must match the entry filename',
    });
    expect(
      getCollectionReservedAssetIds(collections, { includeInvalid: true })
    ).toEqual(new Set([config.id, template.id]));
    expect(reads.get(template.id)).toBe(1);
  });

  test("rejects duplicate logical filenames case-insensitively", async () => {
    const config = asset({
      id: "config",
      filename: "collection",
      format: "json",
    });
    const template = asset({
      id: "template",
      filename: "template",
      format: "mdx",
    });
    const firstEntry = asset({
      id: "first-entry",
      filename: "hello",
      format: "mdx",
    });
    const duplicateEntry = asset({
      id: "duplicate-entry",
      filename: "HELLO",
      format: "mdx",
    });
    const collections = await discoverContentCollections({
      assets: [config, template, firstEntry, duplicateEntry],
      readSource: async (currentAsset) =>
        currentAsset.id === config.id
          ? createDefaultCollectionConfig()
          : "---\ntitle: Hello\nslug: hello\ndraft: false\n---\n",
    });

    expect(collections.get("folder")).toMatchObject({
      status: "invalid",
      repairAsset: duplicateEntry,
      editorRepair: { action: "move", asset: duplicateEntry },
      message: 'Collection folder contains duplicate filename "HELLO.mdx"',
    });
    expect(
      getCollectionReservedAssetIds(collections, { includeInvalid: true })
    ).toEqual(new Set([config.id, template.id]));
  });

  test("rejects ambiguous collection configuration and templates", async () => {
    const config = asset({
      id: "config",
      filename: "collection",
      format: "json",
    });
    const duplicateConfig = asset({
      id: "duplicate-config",
      filename: "collection",
      format: "json",
    });
    const template = asset({
      id: "template",
      filename: "template",
      format: "mdx",
    });
    const duplicateTemplate = asset({
      id: "duplicate-template",
      filename: "template",
      format: "mdx",
    });
    const readSource = async (currentAsset: Asset) =>
      currentAsset.format === "json"
        ? createDefaultCollectionConfig()
        : "---\ndraft: true\n---\n";

    const duplicateConfigs = await discoverContentCollections({
      assets: [config, duplicateConfig, template],
      readSource,
    });
    expect(duplicateConfigs.get("folder")).toMatchObject({
      status: "invalid",
      message: "A collection folder must contain exactly one collection.json",
    });
    expect(
      getCollectionReservedAssetIds(duplicateConfigs, { includeInvalid: true })
    ).toEqual(new Set([config.id, duplicateConfig.id, template.id]));

    const duplicateTemplates = await discoverContentCollections({
      assets: [config, template, duplicateTemplate],
      readSource,
    });
    expect(duplicateTemplates.get("folder")).toMatchObject({
      status: "invalid",
      message: 'Collection template "template.mdx" is ambiguous',
    });
    expect(
      getCollectionReservedAssetIds(duplicateTemplates, {
        includeInvalid: true,
      })
    ).toEqual(new Set([config.id, template.id, duplicateTemplate.id]));
  });
});
