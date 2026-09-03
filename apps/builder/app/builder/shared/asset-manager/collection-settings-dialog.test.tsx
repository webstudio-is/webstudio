import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, expect, test } from "vitest";
import {
  createDefaultCollectionConfig,
  parseCollectionConfig,
} from "@webstudio-is/content-engine";
import {
  assetContentDescriptorHeader,
  serializeAssetContentDescriptor,
} from "@webstudio-is/protocol/asset-resource-api";
import type { Asset } from "@webstudio-is/sdk";
import { __testing__ } from "~/shared/asset-content-bridge.client";
import { $project } from "~/shared/sync/data-stores";
import {
  CollectionSettingsDialog,
  getCollectionSettingsSaveOrder,
} from "./collection-settings-dialog";
import { createAssetManagerTestRenderer } from "./test-utils";

const createAsset = ({
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
  name: `${filename}-storage.${format}`,
  filename,
  folderId: "posts",
  type: "file",
  format,
  size: 1,
  description: null,
  createdAt: "2026-09-02T00:00:00.000Z",
  meta: {},
});

const renderer = createAssetManagerTestRenderer();
const { initBridge, clearBridge } = __testing__;

beforeEach(() => {
  $project.set({ id: "project" } as never);
  initBridge({
    authorize: () => true,
    requireReload: () => undefined,
    request: async () => {
      const template = "---\ndraft: true\n---\n\nStart writing.\n";
      const asset = createAsset({
        id: "template",
        filename: "template",
        format: "mdx",
      });
      return new Response(template, {
        headers: {
          "content-length": String(new TextEncoder().encode(template).length),
          [assetContentDescriptorHeader]:
            serializeAssetContentDescriptor(asset),
        },
      });
    },
  });
});

afterEach(() => {
  renderer.cleanup();
  clearBridge();
  $project.set(undefined);
});

test("keeps the slug source field type fixed to text", async () => {
  const configAsset = createAsset({
    id: "config",
    filename: "collection",
    format: "json",
  });
  const templateAsset = createAsset({
    id: "template",
    filename: "template",
    format: "mdx",
  });
  renderer.render(
    <CollectionSettingsDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset,
        templateAsset,
        config: parseCollectionConfig(createDefaultCollectionConfig()),
        templateProperties: { draft: true },
      }}
      open
      onOpenChange={() => undefined}
    />
  );

  await act(async () => undefined);

  const typeControl = document.querySelector<HTMLButtonElement>(
    '[aria-label="Title type"]'
  );
  expect(typeControl).not.toBeNull();
  expect(typeControl?.disabled).toBe(true);
});

test("orders schema and template writes without creating an invalid collection", () => {
  const baseValue = JSON.parse(createDefaultCollectionConfig());
  const baseConfig = parseCollectionConfig(JSON.stringify(baseValue));

  const addedValue = structuredClone(baseValue);
  addedValue.properties.summary = { type: "string" };
  const addedConfig = parseCollectionConfig(JSON.stringify(addedValue));
  expect(
    getCollectionSettingsSaveOrder({
      currentConfig: baseConfig,
      currentTemplateProperties: { draft: true },
      nextConfig: addedConfig,
      nextTemplateProperties: { draft: true, summary: "Hello" },
    })
  ).toBe("config-first");

  expect(
    getCollectionSettingsSaveOrder({
      currentConfig: addedConfig,
      currentTemplateProperties: { draft: true, summary: "Hello" },
      nextConfig: baseConfig,
      nextTemplateProperties: { draft: true },
    })
  ).toBe("template-first");

  const oldTypedValue = structuredClone(baseValue);
  oldTypedValue.properties.rating = { type: "string" };
  const nextTypedValue = structuredClone(baseValue);
  nextTypedValue.properties.rating = { type: "number" };
  expect(
    getCollectionSettingsSaveOrder({
      currentConfig: parseCollectionConfig(JSON.stringify(oldTypedValue)),
      currentTemplateProperties: { draft: true, rating: "five" },
      nextConfig: parseCollectionConfig(JSON.stringify(nextTypedValue)),
      nextTemplateProperties: { draft: true, rating: 5 },
    })
  ).toBeUndefined();
});

test("does not enable saving when the entry template failed to load", async () => {
  initBridge({
    authorize: () => true,
    requireReload: () => undefined,
    request: async () => {
      throw new Error("Template unavailable");
    },
  });
  const configAsset = createAsset({
    id: "config",
    filename: "collection",
    format: "json",
  });
  const templateAsset = createAsset({
    id: "template",
    filename: "template",
    format: "mdx",
  });
  renderer.render(
    <CollectionSettingsDialog
      collection={{
        status: "ready",
        folderId: "posts",
        configAsset,
        templateAsset,
        config: parseCollectionConfig(createDefaultCollectionConfig()),
        templateProperties: { draft: true },
      }}
      open
      onOpenChange={() => undefined}
    />
  );

  await act(async () => undefined);

  const save = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === "Save");
  expect(document.body.textContent).toContain("Template unavailable");
  expect(save?.disabled).toBe(true);
});
