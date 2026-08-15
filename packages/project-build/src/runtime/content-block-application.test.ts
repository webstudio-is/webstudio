import type { AssetRepository } from "@webstudio-is/asset-uploader/server";
import {
  blockComponent,
  blockTemplateComponent,
  createStructuredAssetQueryResourceBody,
  elementComponent,
  encodeDataVariableId,
  type Instance,
} from "@webstudio-is/sdk";
import type { ContentArtifactV1 } from "@webstudio-is/content-engine";
import { describe, expect, test, vi } from "vitest";
import type { BuilderState } from "../state/builder-state";
import { createDefaultPages } from "../shared/pages-utils";
import { createContentBlockApplicationOperations } from "./content-block-application";
import { createMdxAssetEditingSession } from "./mdx-asset-session";

const encoder = new TextEncoder();

const createState = (
  source: "asset" | "expression" | undefined = "asset",
  body = false
): BuilderState => ({
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
          ...(body ? ([{ type: "id", value: "body" }] as const) : []),
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
    ...(body
      ? ([
          [
            "body",
            {
              type: "instance" as const,
              id: "body",
              component: elementComponent,
              tag: "p",
              children: [{ type: "text" as const, value: "Persisted body" }],
            },
          ],
        ] as [string, Instance][])
      : []),
  ]),
  props: new Map(
    source === undefined
      ? []
      : [
          [
            "src",
            source === "asset"
              ? {
                  id: "src",
                  instanceId: "block",
                  name: "src",
                  type: "asset" as const,
                  value: "article",
                }
              : {
                  id: "src",
                  instanceId: "block",
                  name: "src",
                  type: "expression" as const,
                  value: "article.body",
                },
          ],
        ]
  ),
  dataSources: new Map(),
  resources: new Map(),
  styleSources: new Map(),
  styleSourceSelections: new Map(),
  styles: new Map(),
  breakpoints: new Map(),
  assets: new Map(),
});

const createRepository = (initialSource = "# Original") => {
  let source = initialSource;
  let name = "article-initial.mdx";
  const updateContent = vi.fn(
    async ({
      assetId,
      data,
    }: Parameters<AssetRepository["updateContent"]>[0]) => {
      source = await new Response(data).text();
      name = "article-updated.mdx";
      return {
        id: assetId,
        projectId: "project",
        type: "file" as const,
        format: "file",
        name,
        filename: "article.mdx",
        size: encoder.encode(source).byteLength,
        description: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        meta: {},
      };
    }
  );
  return {
    repository: {
      readContent: async ({
        assetId,
      }: Parameters<AssetRepository["readContent"]>[0]) => {
        const bytes = encoder.encode(source);
        return {
          asset: {
            id: assetId,
            projectId: "project",
            type: "file" as const,
            format: "file",
            name,
            filename: `${assetId}.mdx`,
            size: bytes.byteLength,
            description: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-02T00:00:00.000Z",
            meta: {},
          },
          data: {
            async *[Symbol.asyncIterator]() {
              yield bytes;
            },
          },
        };
      },
      updateContent,
    },
    updateContent,
    getSource: () => source,
  };
};

describe("Content Block application operations", () => {
  test("discovers exact dynamic render scopes and their repair capabilities", async () => {
    const { repository } = createRepository();
    const resolveExpressionAssetId = vi.fn(() => "article");
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
      resolveExpressionAssetId,
    });
    const operations = createContentBlockApplicationOperations({
      projectId: "project",
      session,
      getState: () => createState("expression"),
      context: { createId: () => "generated" },
    });

    const first = await operations.inspectSource({
      blockInstanceId: "block",
      renderScope: "page:/posts:item:one",
      variables: { "article.body": "article" },
    });
    const second = await operations.inspectSource({
      blockInstanceId: "block",
      renderScope: "page:/posts:item:two",
    });

    expect(first).toMatchObject({
      sessionStatus: "saved",
      resolvedIdentity: {
        assetId: "article",
        renderScope: "page:/posts:item:one",
      },
      capabilities: { canEdit: true, canDisconnectWithCopy: true },
      repairRoutes: ["open-file", "disconnect-with-copy"],
    });
    expect(second.resolvedIdentity?.renderScope).toBe("page:/posts:item:two");
    expect(resolveExpressionAssetId).toHaveBeenCalledTimes(2);
    expect(resolveExpressionAssetId).toHaveBeenNthCalledWith(1, {
      expression: "article.body",
      blockInstanceId: "block",
      renderScope: "page:/posts:item:one",
      variables: { "article.body": "article" },
    });
  });

  test("routes semantic edits through the shared runtime and persists only MDX", async () => {
    const { repository, updateContent, getSource } = createRepository();
    const state = createState();
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
      debounceMilliseconds: 0,
    });
    const commitProjectPayload = vi.fn();
    const operations = createContentBlockApplicationOperations({
      projectId: "project",
      session,
      getState: () => state,
      commitProjectPayload,
      context: { createId: () => "generated" },
    });
    await operations.inspectSource({
      blockInstanceId: "block",
      renderScope: "page:/",
    });
    const loaded = session.list()[0];
    if (!("root" in loaded)) {
      throw new Error("Expected loaded root");
    }
    const headingId = loaded.root.fragment.instances[0].id;

    const result = await operations.semanticEdit({
      operationId: "instances.updateText",
      input: { instanceId: headingId, childIndex: 0, text: "Updated" },
      blockInstanceId: "block",
      renderScope: "page:/",
    });

    expect(result.status).toBe("complete");
    expect(updateContent).toHaveBeenCalledTimes(1);
    expect(commitProjectPayload).not.toHaveBeenCalled();
    expect(getSource()).toContain("# Updated");
    expect(state.instances?.has(headingId)).toBe(false);
  });

  test("returns a stale-safe confirmation before replacing persisted body", async () => {
    const { repository } = createRepository();
    const state = createState("asset", true);
    state.props?.clear();
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
    });
    let id = 0;
    const operations = createContentBlockApplicationOperations({
      projectId: "project",
      session,
      getState: () => state,
      commitProjectPayload: vi.fn(),
      context: { createId: () => `generated-${id++}`, projectVersion: 1 },
    });
    const preview = await operations.applyLifecycle({
      action: "connect",
      blockInstanceId: "block",
      renderScope: "page:/",
      source: { type: "asset", assetId: "article" },
      authority: "use-file-content",
      dryRun: true,
    });
    expect(preview).toMatchObject({
      status: "confirmation-required",
      code: "content-source-confirmation-required",
      result: { action: "connect", storageWrites: [] },
    });
    if (preview.status !== "confirmation-required") {
      throw new Error("Expected confirmation");
    }
    const stale = await operations.applyLifecycle({
      action: "connect",
      blockInstanceId: "block",
      renderScope: "page:/",
      source: { type: "asset", assetId: "article" },
      authority: "use-file-content",
      confirmationToken: `${preview.confirmationToken}changed`,
    });
    expect(stale.status).toBe("confirmation-required");
  });

  test("previews a lossless connection without requiring confirmation", async () => {
    const { repository } = createRepository();
    const state = createState();
    state.props?.clear();
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
    });
    const commitProjectPayload = vi.fn();
    const operations = createContentBlockApplicationOperations({
      projectId: "project",
      session,
      getState: () => state,
      commitProjectPayload,
      context: { createId: () => "generated" },
    });

    await expect(
      operations.applyLifecycle({
        action: "connect",
        blockInstanceId: "block",
        renderScope: "page:/",
        source: { type: "asset", assetId: "article" },
        authority: "use-file-content",
        dryRun: true,
      })
    ).resolves.toMatchObject({
      status: "complete",
      result: { action: "connect", changesProject: true, storageWrites: [] },
    });
    expect(commitProjectPayload).not.toHaveBeenCalled();
  });

  test("requires confirmation for disconnect and rejects unavailable recovery actions", async () => {
    const { repository } = createRepository();
    const state = createState();
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
    });
    const commitProjectPayload = vi.fn();
    const operations = createContentBlockApplicationOperations({
      projectId: "project",
      session,
      getState: () => state,
      commitProjectPayload,
      context: { createId: () => "generated", projectVersion: 1 },
    });
    await operations.inspectSource({
      blockInstanceId: "block",
      renderScope: "page:/",
    });

    await expect(
      operations.recover({
        blockInstanceId: "block",
        renderScope: "page:/",
        action: "copy-unsaved-mdx",
      })
    ).resolves.toMatchObject({
      status: "blocked",
      code: "content-source-session-failed",
    });
    const preview = await operations.applyLifecycle({
      action: "disconnect",
      blockInstanceId: "block",
      renderScope: "page:/",
      dryRun: true,
    });
    expect(preview.status).toBe("confirmation-required");
    expect(commitProjectPayload).not.toHaveBeenCalled();
    if (preview.status !== "confirmation-required") {
      throw new Error("Expected disconnect confirmation");
    }
    await expect(
      operations.applyLifecycle({
        action: "disconnect",
        blockInstanceId: "block",
        renderScope: "page:/",
        confirmationToken: preview.confirmationToken,
      })
    ).resolves.toMatchObject({ status: "complete" });
    expect(commitProjectPayload).toHaveBeenCalledTimes(1);
  });

  test("rolls back prepared file state when atomic connect persistence is unavailable", async () => {
    const { repository, updateContent } = createRepository();
    const state = createState("asset", true);
    state.props?.clear();
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
    });
    const operations = createContentBlockApplicationOperations({
      projectId: "project",
      session,
      getState: () => state,
      context: { createId: () => "generated" },
    });

    await expect(
      operations.applyLifecycle({
        action: "connect",
        blockInstanceId: "block",
        renderScope: "page:/",
        source: { type: "asset", assetId: "article" },
        authority: "replace-file-body-with-block-content",
      })
    ).resolves.toMatchObject({
      status: "blocked",
      code: "content-source-atomic-persistence-unavailable",
    });
    expect(session.list()).toEqual([
      expect.objectContaining({ status: "saved", source: "# Original" }),
    ]);
    expect(updateContent).not.toHaveBeenCalled();
  });

  test("discovers the owning direct source and migrates template references through the pinned session", async () => {
    const { repository, updateContent, getSource } = createRepository(
      '<ws.element ws:name="Card" />'
    );
    const state = createState();
    const templates = state.instances?.get("templates");
    if (templates === undefined) {
      throw new Error("Expected Templates instance");
    }
    templates.children.push({ type: "id", value: "card" });
    state.instances?.set("card", {
      type: "instance",
      id: "card",
      component: elementComponent,
      tag: "div",
      label: "Card",
      children: [],
    });
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: ({ assetId }) => assetId !== "missing",
      debounceMilliseconds: 0,
    });
    const operations = createContentBlockApplicationOperations({
      projectId: "project",
      session,
      getState: () => state,
      context: { createId: () => "generated" },
    });

    await expect(
      operations.migrateTemplateReferences({
        templateInstanceId: "card",
        migration: { type: "remove" },
        renderScope: "page:/selected",
        selectedAssetIds: ["reviewed"],
        dryRun: true,
      })
    ).resolves.toMatchObject({
      discoveryComplete: true,
      files: [{ assetId: "reviewed" }],
    });
    await expect(
      operations.migrateTemplateReferences({
        templateInstanceId: "card",
        migration: { type: "remove" },
        renderScope: "page:/selected-with-failure",
        selectedAssetIds: ["article", "missing"],
        dryRun: true,
      })
    ).resolves.toMatchObject({
      status: "confirmation-required",
      files: [
        { assetId: "article" },
        {
          assetId: "missing",
          status: "failed",
          diagnostics: [{ code: "asset-authorization-failed" }],
        },
      ],
    });

    const preview = await operations.migrateTemplateReferences({
      templateInstanceId: "card",
      migration: { type: "rename", to: "Feature Card" },
      renderScope: "page:/",
      dryRun: true,
    });
    expect(preview).toMatchObject({
      status: "confirmation-required",
      discoveryComplete: true,
      updateCount: 1,
      files: [{ assetId: "article", changed: true }],
    });
    if (preview.status !== "confirmation-required") {
      throw new Error("Expected migration confirmation");
    }
    state.props?.set("src", {
      id: "src",
      instanceId: "block",
      name: "src",
      type: "expression",
      value: '"article"',
    });
    await expect(
      operations.migrateTemplateReferences({
        templateInstanceId: "card",
        migration: { type: "rename", to: "Feature Card" },
        renderScope: "page:/static-expression",
        dryRun: true,
      })
    ).resolves.toMatchObject({
      status: "confirmation-required",
      discoveryComplete: true,
      files: [{ assetId: "article" }],
    });

    const result = await operations.migrateTemplateReferences({
      templateInstanceId: "card",
      migration: { type: "rename", to: "Feature Card" },
      renderScope: "page:/",
      confirmationToken: preview.confirmationToken,
    });
    expect(result).toMatchObject({
      status: "complete",
      updateCount: 1,
      files: [{ assetId: "article", status: "updated" }],
    });
    expect(updateContent).toHaveBeenCalledTimes(1);
    expect(getSource()).toContain('ws:name="Feature Card"');
  });

  test("discovers finite query candidates without loading unrelated MDX", async () => {
    const state = createState("expression");
    const resourceVariable = encodeDataVariableId("posts-data");
    const sourceProp = state.props?.get("src");
    if (sourceProp?.type !== "expression") {
      throw new Error("Expected expression source");
    }
    sourceProp.value = `${resourceVariable}.data.properties.mdx`;
    state.dataSources?.set("posts-data", {
      type: "resource",
      id: "posts-data",
      scopeInstanceId: "block",
      name: "posts",
      resourceId: "posts",
    });
    state.resources?.set("posts", {
      id: "posts",
      name: "Posts",
      control: "system",
      method: "post",
      url: '"/$resources/assets"',
      headers: [],
      body: createStructuredAssetQueryResourceBody({
        where: {
          all: [
            {
              field: ["properties", "category"],
              operator: "eq",
              value: '"published"',
            },
          ],
        },
        sort: [],
        limit: "1",
        offset: "0",
        output: { mode: "all", includeMetadata: true },
        content: { mode: "none" },
      }),
    });
    const templates = state.instances?.get("templates")!;
    templates.children.push({ type: "id", value: "card" });
    state.instances?.set("card", {
      type: "instance",
      id: "card",
      component: elementComponent,
      tag: "div",
      label: "Card",
      children: [],
    });
    const readIds: string[] = [];
    const source = '<ws.element ws:name="Card" />';
    const session = createMdxAssetEditingSession({
      repository: {
        readContent: async ({ assetId }) => {
          readIds.push(assetId);
          const bytes = encoder.encode(source);
          return {
            asset: {
              id: assetId,
              projectId: "project",
              type: "file" as const,
              format: "file",
              name: `${assetId}-revision.mdx`,
              filename: assetId,
              size: bytes.byteLength,
              description: null,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
              meta: {},
            },
            data: {
              async *[Symbol.asyncIterator]() {
                yield bytes;
              },
            },
          };
        },
        updateContent: async () => {
          throw new Error("Dry-run must not write");
        },
      },
      authorizeAsset: () => true,
      resolveExpressionAssetId: () => "article.mdx",
    });
    const migrationContentArtifact = {
      documents: [
        {
          _id: "post",
          _type: "asset.file",
          name: "post.json",
          path: "post.json",
          key: "post",
          extension: "json",
          mimeType: "application/json",
          size: 1,
          properties: { category: "published", mdx: "article.mdx" },
        },
        {
          _id: "private-post",
          _type: "asset.file",
          name: "private.json",
          path: "private.json",
          key: "private",
          extension: "json",
          mimeType: "application/json",
          size: 1,
          properties: { category: "private", mdx: "private.mdx" },
        },
      ],
    } as unknown as ContentArtifactV1;
    const operations = createContentBlockApplicationOperations({
      projectId: "project",
      session,
      getState: () => state,
      migrationContentArtifact,
      context: { createId: () => "generated" },
    });

    const result = await operations.migrateTemplateReferences({
      templateInstanceId: "card",
      migration: { type: "remove" },
      renderScope: "page:/posts/one",
      dryRun: true,
    });

    expect(result).toMatchObject({
      status: "confirmation-required",
      discoveryComplete: true,
      files: [{ assetId: "article.mdx", omissionCount: 1 }],
    });
    expect(readIds).toEqual(["article.mdx"]);
    expect(readIds).not.toContain("private.mdx");
  });
});
