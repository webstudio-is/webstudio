import { expect, test, vi } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  blockComponent,
  blockTemplateComponent,
  elementComponent,
} from "@webstudio-is/sdk";
import { applyBuilderPatchTransactions } from "@webstudio-is/project-build/state";
import { createContentBlockSourceController } from "./content-block-source-controller";

const createState = () => ({
  pages: createDefaultPages({ rootInstanceId: "block" }),
  instances: new Map([
    [
      "block",
      {
        type: "instance" as const,
        id: "block",
        component: blockComponent,
        children: [
          { type: "id" as const, value: "templates" },
          { type: "id" as const, value: "body" },
        ],
      },
    ],
    [
      "templates",
      {
        type: "instance" as const,
        id: "templates",
        component: blockTemplateComponent,
        children: [],
      },
    ],
    [
      "body",
      {
        type: "instance" as const,
        id: "body",
        component: elementComponent,
        tag: "p",
        children: [{ type: "text" as const, value: "Existing" }],
      },
    ],
  ]),
  props: new Map(),
  dataSources: new Map(),
  resources: new Map(),
  styleSources: new Map(),
  styleSourceSelections: new Map(),
  styles: new Map(),
  breakpoints: new Map(),
  assets: new Map(),
});

test("validates before confirmation and revalidates before replacing existing content", async () => {
  let state = createState();
  let currentName = "article_v1.mdx";
  const openAsset = vi.fn(async () => ({
    asset: {
      id: "asset",
      projectId: "project",
      name: currentName,
      type: "file" as const,
      format: "mdx",
      size: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    source: "",
    status: "saved" as const,
  }));
  const reloadAsset = vi.fn(async (_assetId: string, expectedName: string) => {
    if (expectedName !== currentName) {
      throw new Error("Revision conflict");
    }
    return openAsset();
  });
  const controller = createContentBlockSourceController({
    blockInstanceId: "block",
    renderScope: '["block"]',
    projectId: "project",
    getState: () => state,
    openAsset,
    reloadAsset,
    resolveExpressionAssetId: () => undefined,
    flushAsset: vi.fn(),
    updateAssetSource: vi.fn(),
    commitProjectPayload: (payload) => {
      state = applyBuilderPatchTransactions(state, [
        { id: "test", payload: [...payload] },
      ]).state as typeof state;
    },
  });

  await expect(
    controller.requestSource({
      source: { type: "asset", assetId: "asset" },
    })
  ).resolves.toEqual({ status: "requires-confirmation", diagnostics: [] });
  expect(openAsset).toHaveBeenCalledOnce();
  expect(state.instances.get("body")).toBeDefined();

  await expect(
    controller.requestSource({
      source: { type: "asset", assetId: "asset" },
      confirmed: true,
    })
  ).resolves.toMatchObject({ status: "applied" });
  expect(reloadAsset).toHaveBeenCalledWith("asset", "article_v1.mdx");
  expect(state.instances.has("body")).toBe(false);
  expect(
    Array.from(state.props.values()).find(
      (prop) => prop.instanceId === "block" && prop.name === "src"
    )
  ).toMatchObject({
    type: "asset",
    value: "asset",
  });
});

test("disconnects without loading or copying the Asset source", async () => {
  let state = createState();
  state.props.set("src", {
    id: "src",
    instanceId: "block",
    name: "src",
    type: "asset",
    value: "asset",
  });
  const source = "# From MDX";
  const openAsset = vi.fn(async () => ({
    asset: {
      id: "asset",
      projectId: "project",
      name: "article.mdx",
      type: "file" as const,
      format: "mdx",
      size: new TextEncoder().encode(source).byteLength,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    source,
    status: "saved" as const,
  }));
  const controller = createContentBlockSourceController({
    blockInstanceId: "block",
    renderScope: '["block"]',
    projectId: "project",
    getState: () => state,
    openAsset,
    reloadAsset: vi.fn(),
    resolveExpressionAssetId: () => undefined,
    flushAsset: vi.fn(),
    updateAssetSource: vi.fn(),
    commitProjectPayload: (payload) => {
      state = applyBuilderPatchTransactions(state, [
        { id: "test", payload: [...payload] },
      ]).state as typeof state;
    },
  });

  await expect(controller.disconnect()).resolves.toEqual({ status: "applied" });
  expect(openAsset).not.toHaveBeenCalled();
  expect(state.props.has("src")).toBe(false);
  expect(state.instances.get("block")?.children).toEqual([
    { type: "id", value: "templates" },
    { type: "id", value: "body" },
  ]);
});
