import { describe, expect, test } from "vitest";
import type { Asset } from "@webstudio-is/sdk";
import { createDefaultCollectionConfig } from "@webstudio-is/content-engine";
import { discoverContentCollections } from "./content-collections";

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
      readSource: async () => createDefaultCollectionConfig(),
    });

    expect(collections.get("folder")).toMatchObject({
      status: "ready",
      configAsset: config,
      templateAsset: template,
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
});
