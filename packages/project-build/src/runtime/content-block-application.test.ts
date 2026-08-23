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
import {
  createContentBlockApplicationOperations,
  executeContentBlockPersistencePlan,
  persistContentBlockStorageChangesSerially,
} from "./content-block-application";
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

const addTemplateHeading = (state: BuilderState) => {
  state.instances?.set("template-heading", {
    type: "instance",
    id: "template-heading",
    component: elementComponent,
    tag: "h2",
    children: [{ type: "text", value: "Before" }],
  });
  state.instances?.set("templates", {
    ...state.instances.get("templates")!,
    children: [{ type: "id", value: "template-heading" }],
  });
};

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
    setSource: (value: string) => {
      source = value;
    },
  };
};

describe("Content Block application operations", () => {
  test("preflights the complete serial plan and stops after the first durable failure", async () => {
    const events: string[] = [];
    const createStep = (
      name: string,
      status: "saved" | "failed" = "saved"
    ) => ({
      type: name === "project" ? ("project" as const) : ("asset" as const),
      preflight: async () => {
        events.push(`preflight:${name}`);
        return { status: "ready" as const };
      },
      persist: async () => {
        events.push(`persist:${name}`);
        return status === "saved"
          ? { status }
          : {
              status,
              code: "content-source-write-conflict",
              message: "Source changed",
            };
      },
    });

    await expect(
      executeContentBlockPersistencePlan([
        createStep("destination"),
        createStep("source", "failed"),
        createStep("project"),
      ])
    ).resolves.toMatchObject({
      status: "partial",
      steps: [
        { type: "asset", status: "saved" },
        { type: "asset", status: "failed" },
        { type: "project", status: "not-attempted" },
      ],
      retry: { replan: true, project: true },
    });
    expect(events).toEqual([
      "preflight:destination",
      "preflight:source",
      "preflight:project",
      "persist:destination",
      "persist:source",
    ]);
  });

  test("preflights every storage root before saving the first one", async () => {
    const firstIdentity = {
      blockInstanceId: "first-block",
      assetId: "first",
      revision: "sha256:first",
      contentRef: "first.mdx",
      format: "mdx" as const,
      renderScope: "page:/first",
    };
    const secondIdentity = {
      ...firstIdentity,
      blockInstanceId: "second-block",
      assetId: "second",
      revision: "sha256:second",
      contentRef: "second.mdx",
      renderScope: "page:/second",
    };
    const queueSave = vi.fn();
    const preflightSave = vi.fn(async ({ key }: { key: string }) =>
      key.includes("second")
        ? { status: "blocked" as const, reason: "Second Asset is stale" }
        : { status: "ready" as const }
    );
    const changes = [firstIdentity, secondIdentity].map((identity) => ({
      root: { type: "external" as const, identity },
      payload: [
        {
          namespace: "instances" as const,
          patches: [
            {
              op: "replace" as const,
              path: ["content", "children", 0, "value"],
              value: "Updated",
            },
          ],
        },
      ],
    }));

    await expect(
      persistContentBlockStorageChangesSerially({
        session: {
          list: () =>
            [firstIdentity, secondIdentity].map((identity) => ({
              status: "saved",
              key: JSON.stringify([
                identity.blockInstanceId,
                identity.assetId,
                identity.revision,
                identity.contentRef,
                identity.format,
                identity.renderScope,
              ]),
              identity,
              source: "# Original",
              diagnostics: [],
            })),
          preflightSave,
          queueSave,
        } as never,
        changes,
      })
    ).resolves.toMatchObject({
      status: "failed",
      steps: [
        { status: "not-attempted", root: firstIdentity },
        { status: "failed", root: secondIdentity },
      ],
      retry: {
        replan: true,
        roots: [firstIdentity, secondIdentity],
      },
    });
    expect(preflightSave).toHaveBeenCalledTimes(2);
    expect(queueSave).not.toHaveBeenCalled();
  });

  test("rejects multiple writable roots for one Asset before preflight", async () => {
    const preflight = vi.fn(async () => ({ status: "ready" as const }));
    const persist = vi.fn(async () => ({ status: "saved" as const }));
    const firstRoot = {
      blockInstanceId: "first-block",
      assetId: "shared-asset",
      revision: "sha256:shared",
      contentRef: "shared_revision.mdx",
      format: "mdx" as const,
      renderScope: "page:/first",
    };
    const secondRoot = {
      ...firstRoot,
      blockInstanceId: "second-block",
      renderScope: "page:/second",
    };

    await expect(
      executeContentBlockPersistencePlan([
        { type: "asset", root: firstRoot, preflight, persist },
        { type: "asset", root: secondRoot, preflight, persist },
      ])
    ).resolves.toMatchObject({
      status: "failed",
      steps: [
        { type: "asset", status: "not-attempted", root: firstRoot },
        {
          type: "asset",
          status: "failed",
          root: secondRoot,
          code: "content-source-duplicate-asset",
        },
      ],
    });
    expect(preflight).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  test("combines accumulated changes for one root into one revisioned write", async () => {
    const identity = {
      blockInstanceId: "block",
      assetId: "article",
      revision: "sha256:article",
      contentRef: "article.mdx",
      format: "mdx" as const,
      renderScope: "page:/",
    };
    const key = JSON.stringify([
      identity.blockInstanceId,
      identity.assetId,
      identity.revision,
      identity.contentRef,
      identity.format,
      identity.renderScope,
    ]);
    const changes = ["First", "Second"].map((value) => ({
      root: { type: "external" as const, identity },
      payload: [
        {
          namespace: "instances" as const,
          patches: [
            {
              op: "replace" as const,
              path: ["content", "children", 0, "value"],
              value,
            },
          ],
        },
      ],
    }));
    const preflightSave = vi.fn(async () => ({ status: "ready" as const }));
    const queueSave = vi.fn(async () => ({
      status: "pending" as const,
      key,
      identity,
      localSource: "# Second",
      diagnostics: [],
    }));
    const flush = vi.fn(async () => ({
      status: "saved" as const,
      key,
      identity,
      source: "# Second",
      diagnostics: [],
    }));

    await expect(
      persistContentBlockStorageChangesSerially({
        session: {
          list: () => [
            {
              status: "saved",
              key,
              identity,
              source: "# Original",
              diagnostics: [],
            },
          ],
          preflightSave,
          queueSave,
          flush,
        } as never,
        changes,
      })
    ).resolves.toMatchObject({
      status: "complete",
      steps: [{ type: "asset", status: "saved", root: identity }],
    });
    expect(preflightSave).toHaveBeenCalledOnce();
    expect(preflightSave).toHaveBeenCalledWith({ key, changes });
    expect(queueSave).toHaveBeenCalledOnce();
    expect(queueSave).toHaveBeenCalledWith({ key, changes });
    expect(flush).toHaveBeenCalledOnce();
  });

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

  test("does not activate a superseded source inspection", async () => {
    const { repository } = createRepository();
    let releaseFirstRead!: () => void;
    const firstReadGate = new Promise<void>((resolve) => {
      releaseFirstRead = resolve;
    });
    let readCount = 0;
    const session = createMdxAssetEditingSession({
      repository: {
        ...repository,
        readContent: async ({ assetId }) => {
          readCount += 1;
          const currentRead = readCount;
          if (currentRead === 1) {
            await firstReadGate;
          }
          const source = currentRead === 1 ? "Old" : "New";
          const bytes = encoder.encode(source);
          return {
            asset: {
              id: assetId,
              projectId: "project",
              type: "file" as const,
              format: "file",
              name: `article-${source.toLowerCase()}.mdx`,
              filename: "article.mdx",
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
      },
      authorizeAsset: () => true,
    });
    const operations = createContentBlockApplicationOperations({
      projectId: "project",
      session,
      getState: () => createState(),
      context: { createId: () => "generated" },
    });
    const input = {
      blockInstanceId: "block",
      renderScope: "page:/",
    };

    const superseded = operations.inspectSource(input);
    await vi.waitFor(() => expect(readCount).toBe(1));
    const current = await operations.inspectSource(input);
    releaseFirstRead();

    expect(current).toMatchObject({
      sessionStatus: "saved",
      resolvedIdentity: { contentRef: "article-new.mdx" },
    });
    await expect(superseded).resolves.toMatchObject({
      sessionStatus: "failed",
      resolvedIdentity: undefined,
    });
    await expect(
      operations.inspectSource({ ...input, load: false })
    ).resolves.toMatchObject({
      sessionStatus: "saved",
      resolvedIdentity: { contentRef: "article-new.mdx" },
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

  test("rejects a stale project-only semantic edit", async () => {
    const { repository, updateContent } = createRepository();
    const state = createState();
    addTemplateHeading(state);
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
    });
    const commitProjectPayload = vi.fn();
    let projectVersion = 1;
    const operations = createContentBlockApplicationOperations({
      projectId: "project",
      session,
      getState: () => state,
      getProjectVersion: () => projectVersion,
      commitProjectPayload,
      context: { createId: () => "generated" },
    });
    await operations.inspectSource({
      blockInstanceId: "block",
      renderScope: "page:/",
    });

    const editing = operations.semanticEdit({
      operationId: "instances.updateText",
      input: {
        instanceId: "template-heading",
        childIndex: 0,
        text: "After",
      },
      blockInstanceId: "block",
      renderScope: "page:/",
    });
    projectVersion += 1;

    await expect(editing).resolves.toMatchObject({
      status: "blocked",
      code: "content-source-session-failed",
    });
    expect(commitProjectPayload).not.toHaveBeenCalled();
    expect(updateContent).not.toHaveBeenCalled();
  });

  test("reports a project-only semantic edit persistence failure", async () => {
    const { repository } = createRepository();
    const state = createState();
    addTemplateHeading(state);
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
    });
    const operations = createContentBlockApplicationOperations({
      projectId: "project",
      session,
      getState: () => state,
      commitProjectPayload: async () => {
        throw new Error("Project write failed");
      },
      context: { createId: () => "generated" },
    });
    await operations.inspectSource({
      blockInstanceId: "block",
      renderScope: "page:/",
    });

    await expect(
      operations.semanticEdit({
        operationId: "instances.updateText",
        input: {
          instanceId: "template-heading",
          childIndex: 0,
          text: "After",
        },
        blockInstanceId: "block",
        renderScope: "page:/",
      })
    ).resolves.toMatchObject({
      status: "blocked",
      code: "content-source-session-failed",
      message: "Project write failed",
    });
  });

  test("reports a committed semantic edit when projection recovery is needed", async () => {
    const storage = createRepository();
    const state = createState();
    const updateContent = storage.repository.updateContent;
    const session = createMdxAssetEditingSession({
      repository: {
        ...storage.repository,
        updateContent: async (input) => {
          const result = await updateContent(input);
          state.assets = undefined;
          return result;
        },
      },
      authorizeAsset: () => true,
      debounceMilliseconds: 0,
    });
    const operations = createContentBlockApplicationOperations({
      projectId: "project",
      session,
      getState: () => state,
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

    await expect(
      operations.semanticEdit({
        operationId: "instances.updateText",
        input: {
          instanceId: loaded.root.fragment.instances[0].id,
          childIndex: 0,
          text: "Updated",
        },
        blockInstanceId: "block",
        renderScope: "page:/",
      })
    ).resolves.toMatchObject({ status: "complete" });
    expect(session.list()).toEqual([
      expect.objectContaining({
        status: "recoverable",
        committedSource: expect.stringContaining("Updated"),
      }),
    ]);
  });

  test("invalidates connection confirmation when the selected file revision changes", async () => {
    const { repository, setSource } = createRepository();
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
      dryRun: true,
    });
    expect(preview).toMatchObject({
      status: "confirmation-required",
      code: "content-source-confirmation-required",
      result: { action: "connect" },
    });
    if (preview.status !== "confirmation-required") {
      throw new Error("Expected confirmation");
    }
    setSource("# Changed remotely");
    const stale = await operations.applyLifecycle({
      action: "connect",
      blockInstanceId: "block",
      renderScope: "page:/",
      source: { type: "asset", assetId: "article" },
      confirmationToken: preview.confirmationToken,
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
        dryRun: true,
      })
    ).resolves.toMatchObject({
      status: "complete",
      result: { action: "connect", changesProject: true },
    });
    expect(commitProjectPayload).not.toHaveBeenCalled();
  });

  test("requires confirmation for disconnect", async () => {
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

  test("connects after confirmation without writing the selected Asset", async () => {
    const { repository, updateContent, getSource } = createRepository();
    const state = createState("asset", true);
    state.props?.clear();
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
    });
    const commitProjectPayload = vi.fn(async () => {});
    const operations = createContentBlockApplicationOperations({
      projectId: "project",
      session,
      getState: () => state,
      context: { createId: () => "generated" },
      commitProjectPayload,
    });

    const confirmation = await operations.applyLifecycle({
      action: "connect",
      blockInstanceId: "block",
      renderScope: "page:/",
      source: { type: "asset", assetId: "article" },
    });
    expect(confirmation.status).toBe("confirmation-required");
    if (confirmation.status !== "confirmation-required") {
      throw new Error("Expected replacement confirmation");
    }
    await expect(
      operations.applyLifecycle({
        action: "connect",
        blockInstanceId: "block",
        renderScope: "page:/",
        source: { type: "asset", assetId: "article" },
        confirmationToken: confirmation.confirmationToken,
      })
    ).resolves.toMatchObject({
      status: "complete",
      result: {
        persistence: {
          status: "complete",
          steps: [{ type: "project", status: "saved" }],
        },
      },
    });
    expect(getSource()).toBe("# Original");
    expect(updateContent).not.toHaveBeenCalled();
    expect(commitProjectPayload).toHaveBeenCalledOnce();
  });

  test("leaves the selected Asset unchanged when the project connection fails", async () => {
    const storage = createRepository();
    const state = createState("asset", true);
    state.props?.clear();
    const session = createMdxAssetEditingSession({
      repository: storage.repository,
      authorizeAsset: () => true,
    });
    const operations = createContentBlockApplicationOperations({
      projectId: "project",
      session,
      getState: () => state,
      context: { createId: () => "generated" },
      commitProjectPayload: async () => {
        throw new Error("Project write failed");
      },
    });
    const confirmation = await operations.applyLifecycle({
      action: "connect",
      blockInstanceId: "block",
      renderScope: "page:/",
      source: { type: "asset", assetId: "article" },
    });
    if (confirmation.status !== "confirmation-required") {
      throw new Error("Expected replacement confirmation");
    }

    await expect(
      operations.applyLifecycle({
        action: "connect",
        blockInstanceId: "block",
        renderScope: "page:/",
        source: { type: "asset", assetId: "article" },
        confirmationToken: confirmation.confirmationToken,
      })
    ).resolves.toMatchObject({
      status: "blocked",
      result: {
        persistence: {
          status: "failed",
          steps: [{ type: "project", status: "failed" }],
          retry: { replan: true, roots: [], project: true },
        },
      },
    });
    expect(storage.getSource()).toBe("# Original");
    expect(storage.updateContent).not.toHaveBeenCalled();
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
