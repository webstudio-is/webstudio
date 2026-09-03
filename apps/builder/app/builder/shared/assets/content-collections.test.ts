import { describe, expect, test } from "vitest";
import type { Asset } from "@webstudio-is/sdk";
import { createDefaultCollectionConfig } from "@webstudio-is/content-engine";
import {
  discoverContentCollections,
  getCollectionReservedAssetIds,
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
    const collections = await discoverContentCollections({
      assets: [config],
      readSource: async () => "not json",
    });

    expect(collections.get("folder")).toMatchObject({
      status: "invalid",
      message: "collection.json contains invalid JSON",
    });
    expect(
      getCollectionReservedAssetIds(collections, { includeInvalid: true })
    ).toEqual(new Set([config.id]));
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
      message: "Move non-entry files into a subfolder",
    });
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
    ).toEqual(new Set([config.id, duplicateConfig.id]));

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
