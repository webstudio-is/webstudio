import { describe, expect, test } from "vitest";
import {
  blockComponent,
  blockTemplateComponent,
  type Asset,
} from "@webstudio-is/sdk";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import { applyBuilderPatchTransactions } from "../state/patch";
import type { BuilderState } from "../state/builder-state";
import { createDefaultPages } from "../shared/pages-utils";
import {
  createContentBlockApplication,
  inspectMdxAssetSource,
} from "./content-block-application";

const createFixture = () => {
  let source = "# From file";
  let asset: Pick<
    Asset,
    | "id"
    | "projectId"
    | "name"
    | "type"
    | "format"
    | "size"
    | "createdAt"
    | "updatedAt"
  > = {
    id: "asset",
    projectId: "project",
    name: "article.mdx",
    type: "file",
    format: "mdx",
    size: new TextEncoder().encode(source).byteLength,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const session = {
    open: async () => ({ asset, source, status: "saved" as const }),
    reload: async () => ({ asset, source, status: "saved" as const }),
    save: (_assetId: string, nextSource: string) => {
      source = nextSource;
    },
    flush: async () => {
      asset = {
        ...asset,
        size: new TextEncoder().encode(source).byteLength,
        updatedAt: "2026-01-02T00:00:00.000Z",
      };
      return { asset, source, status: "saved" as const };
    },
    get: () => ({ asset, source, status: "saved" as const }),
  };
  const state: BuilderState = {
    pages: createDefaultPages({ rootInstanceId: "block" }),
    instances: new Map([
      [
        "block",
        {
          type: "instance",
          id: "block",
          component: blockComponent,
          children: [
            { type: "id", value: "templates" },
            { type: "id", value: "old" },
          ],
        },
      ],
      [
        "templates",
        {
          type: "instance",
          id: "templates",
          component: blockTemplateComponent,
          children: [],
        },
      ],
      [
        "old",
        {
          type: "instance",
          id: "old",
          component: "ws:element",
          tag: "p",
          children: [{ type: "text", value: "Old" }],
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
    assets: new Map([[asset.id, asset as Asset]]),
  };
  return {
    session,
    state,
    getSource: () => source,
    application: createContentBlockApplication({
      projectId: "project",
      session,
      metas: componentMetas,
      createId: (() => {
        let index = 0;
        return () => `generated-${index++}`;
      })(),
    }),
  };
};

describe("createContentBlockApplication", () => {
  test("inspects an Asset in each resolvable Content Block context", async () => {
    const fixture = createFixture();
    fixture.state.dataSources?.set("selectedAsset", {
      id: "selectedAsset",
      scopeInstanceId: "block",
      name: "selectedAsset",
      type: "variable",
      value: { type: "string", value: "asset" },
    });
    const connected = await fixture.application.connect({
      state: fixture.state,
      blockInstanceId: "block",
      renderScope: "page",
      source: { type: "expression", value: "selectedAsset" },
    });
    const connectedState = applyBuilderPatchTransactions(fixture.state, [
      { id: "connect", payload: [...connected.projectPayload] },
    ]).state;

    await expect(
      inspectMdxAssetSource({
        source: '<ws.element ws:name="Missing" />',
        assetId: "asset",
        state: connectedState,
        metas: componentMetas,
        projectId: "project",
      })
    ).resolves.toEqual([
      expect.objectContaining({
        code: "unresolved-template",
        blockInstanceId: "block",
        templateName: "Missing",
      }),
    ]);
  });

  test("reports content-model errors when inspecting a connected Asset", async () => {
    const fixture = createFixture();
    const connected = await fixture.application.connect({
      state: fixture.state,
      blockInstanceId: "block",
      renderScope: "page",
      source: { type: "asset", assetId: "asset" },
    });
    const connectedState = applyBuilderPatchTransactions(fixture.state, [
      { id: "connect", payload: [...connected.projectPayload] },
    ]).state;

    await expect(
      inspectMdxAssetSource({
        source: `1. test

   <ws.element ws:tag="li">nested item</ws.element>
`,
        assetId: "asset",
        state: connectedState,
        metas: componentMetas,
        projectId: "project",
      })
    ).resolves.toEqual([
      expect.objectContaining({
        code: "invalid-mdx",
        message: "Placing <li> element inside a <li> violates HTML spec.",
      }),
    ]);
  });

  test("connects with the normal lifecycle payload and disconnects with materialized content", async () => {
    const fixture = createFixture();
    const connected = await fixture.application.connect({
      state: fixture.state,
      blockInstanceId: "block",
      renderScope: "page",
      source: { type: "asset", assetId: "asset" },
    });
    expect(connected.requiresConfirmation).toBe(true);
    const connectedState = applyBuilderPatchTransactions(fixture.state, [
      { id: "connect", payload: [...connected.projectPayload] },
    ]).state;
    expect(connectedState.instances?.has("old")).toBe(false);

    const disconnected = await fixture.application.disconnect({
      state: connectedState,
      blockInstanceId: "block",
      renderScope: "page",
    });
    const disconnectedState = applyBuilderPatchTransactions(connectedState, [
      { id: "disconnect", payload: [...disconnected.projectPayload] },
    ]).state;
    const block = disconnectedState.instances?.get("block");
    const headingId = block?.children.find(
      (child) => child.type === "id" && child.value !== "templates"
    );
    expect(
      headingId?.type === "id"
        ? disconnectedState.instances?.get(headingId.value)?.tag
        : undefined
    ).toBe("h1");
  });

  test("edits and reloads the whole MDX source through the shared session", async () => {
    const fixture = createFixture();
    const connected = await fixture.application.connect({
      state: fixture.state,
      blockInstanceId: "block",
      renderScope: "page",
      source: { type: "asset", assetId: "asset" },
    });
    const connectedState = applyBuilderPatchTransactions(fixture.state, [
      { id: "connect", payload: [...connected.projectPayload] },
    ]).state;
    const saved = await fixture.application.editSource({
      state: connectedState,
      blockInstanceId: "block",
      renderScope: "page",
      source: "## Updated",
    });
    expect(saved.diagnostics).toEqual([]);
    expect(fixture.getSource()).toBe("## Updated");
    const inspected = await fixture.application.inspect({
      state: connectedState,
      blockInstanceId: "block",
      renderScope: "page",
      source: { type: "asset", assetId: "asset" },
    });
    expect(inspected.source).toBe("## Updated");

    const invalidSource = "# Kept\n\n<ws.element";
    const invalid = await fixture.application.editSource({
      state: connectedState,
      blockInstanceId: "block",
      renderScope: "page",
      source: invalidSource,
    });
    expect(fixture.getSource()).toBe(invalidSource);
    expect(invalid.diagnostics).toEqual([
      expect.objectContaining({
        code: "invalid-mdx",
        severity: "error",
      }),
    ]);
  });

  test("resolves expression sources from shared project variables", async () => {
    const fixture = createFixture();
    fixture.state.dataSources?.set("selectedAsset", {
      id: "selectedAsset",
      scopeInstanceId: "block",
      name: "selectedAsset",
      type: "variable",
      value: { type: "string", value: "asset" },
    });

    const inspected = await fixture.application.inspect({
      state: fixture.state,
      blockInstanceId: "block",
      renderScope: "page",
      source: { type: "expression", value: "selectedAsset" },
    });

    expect(inspected.identity.assetId).toBe("asset");
    expect(inspected.source).toBe("# From file");
  });

  test("previews frontmatter without mutating the Asset session", async () => {
    const fixture = createFixture();
    const connected = await fixture.application.connect({
      state: fixture.state,
      blockInstanceId: "block",
      renderScope: "page",
      source: { type: "asset", assetId: "asset" },
    });
    const connectedState = applyBuilderPatchTransactions(fixture.state, [
      { id: "connect", payload: [...connected.projectPayload] },
    ]).state;

    const preview = await fixture.application.previewFrontmatter({
      state: connectedState,
      blockInstanceId: "block",
      renderScope: "page",
      properties: { title: "Preview" },
    });

    expect(preview.source).toContain("title: Preview");
    expect(fixture.getSource()).toBe("# From file");
  });

  test("plans and confirms template reference migrations against exact revisions", async () => {
    const fixture = createFixture();
    await fixture.application.editSource({
      state: applyBuilderPatchTransactions(fixture.state, [
        {
          id: "connect",
          payload: [
            {
              namespace: "props",
              patches: [
                {
                  op: "add",
                  path: ["src"],
                  value: {
                    id: "src",
                    instanceId: "block",
                    name: "src",
                    type: "asset",
                    value: "asset",
                  },
                },
              ],
            },
          ],
        },
      ]).state,
      blockInstanceId: "block",
      renderScope: "page",
      source: '<ws.element ws:name="Old" />',
    });
    const plan = await fixture.application.migrateTemplateReferences({
      assetIds: ["asset"],
      migration: { type: "rename", from: "Old", to: "New" },
    });
    expect(plan).toMatchObject({
      status: "confirmation-required",
      updateCount: 1,
      changedFileCount: 1,
    });
    if (plan.status !== "confirmation-required") {
      throw new Error("Expected a confirmation plan");
    }
    const result = await fixture.application.migrateTemplateReferences({
      assetIds: ["asset"],
      migration: { type: "rename", from: "Old", to: "New" },
      confirmationToken: plan.confirmationToken,
    });
    expect(result.status).toBe("complete");
    expect(fixture.getSource()).toContain('ws:name="New"');
  });
});
