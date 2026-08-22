import { describe, expect, test } from "vitest";
import type { AssetRepository } from "@webstudio-is/asset-uploader/server";
import {
  blockComponent,
  blockTemplateComponent,
  elementComponent,
} from "@webstudio-is/sdk";
import type { BuilderState } from "../state/builder-state";
import { applyBuilderPatchTransactions } from "../state/patch";
import {
  ContentBlockSourceRevisionConflictError,
  prepareContentBlockConnect,
  prepareContentBlockDisconnect,
  prepareContentBlockSwitch,
} from "./content-block-source-lifecycle";
import { createMdxAssetEditingSession } from "./mdx-asset-session";

const encoder = new TextEncoder();

const createRepository = (initial: Record<string, string>) => {
  const sources = new Map(Object.entries(initial));
  const names = new Map(
    Object.keys(initial).map((id) => [id, `${id}_initial.mdx`])
  );
  const writes: string[] = [];
  let revision = 0;
  const repository = {
    readContent: async ({ assetId }: { assetId: string }) => {
      const source = sources.get(assetId);
      const name = names.get(assetId);
      if (source === undefined || name === undefined) {
        throw new Error("Asset not found");
      }
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
    updateContent: async ({
      assetId,
      expectedName,
      data,
    }: Parameters<AssetRepository["updateContent"]>[0]) => {
      if (names.get(assetId) !== expectedName) {
        throw new Error("Changed remotely");
      }
      const source = await new Response(data).text();
      revision += 1;
      const name = `${assetId}_${revision}.mdx`;
      names.set(assetId, name);
      sources.set(assetId, source);
      writes.push(source);
      return {
        id: assetId,
        projectId: "project",
        type: "file" as const,
        format: "file",
        name,
        filename: `${assetId}.mdx`,
        size: encoder.encode(source).byteLength,
        description: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        meta: {},
      };
    },
  } satisfies Pick<AssetRepository, "readContent" | "updateContent">;
  return { repository, sources, writes };
};

const createState = ({
  body = true,
  source,
}: {
  body?: boolean;
  source?: "first" | "expression";
} = {}): BuilderState => {
  const instances: NonNullable<BuilderState["instances"]> = new Map([
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
  ]);
  if (body) {
    instances.set("body", {
      type: "instance",
      id: "body",
      component: elementComponent,
      tag: "p",
      children: [{ type: "text", value: "Block body" }],
    });
  }
  return {
    pages: {
      homePageId: "page",
      rootFolderId: "folder",
      pages: new Map([
        [
          "page",
          {
            id: "page",
            name: "Home",
            title: "Home",
            path: "",
            rootInstanceId: "block",
            meta: {},
          },
        ],
      ]),
      folders: new Map([
        [
          "folder",
          { id: "folder", name: "Root", slug: "", children: ["page"] },
        ],
      ]),
    },
    instances,
    props:
      source === undefined
        ? new Map()
        : new Map([
            [
              "src",
              source === "expression"
                ? {
                    id: "src",
                    instanceId: "block",
                    name: "src",
                    type: "expression" as const,
                    value: "$ws$dataSource$asset",
                  }
                : {
                    id: "src",
                    instanceId: "block",
                    name: "src",
                    type: "asset" as const,
                    value: "first",
                  },
            ],
          ]),
    dataSources: new Map(),
    resources: new Map(),
    styleSources: new Map(),
    styleSourceSelections: new Map(),
    styles: new Map(),
    breakpoints: new Map(),
    assets: new Map(),
  };
};

const createContext = () => {
  let id = 0;
  return { projectId: "project", createId: () => `generated-${id++}` };
};

const applyPayload = (
  state: BuilderState,
  payload: readonly import("../contracts/patch").BuilderPatchChange[]
) =>
  applyBuilderPatchTransactions(state, [
    {
      id: "lifecycle",
      payload: payload.map((change) => structuredClone(change)),
    },
  ]).state;

describe("Content Block source lifecycle", () => {
  test("requires confirmation before replacing a persisted block body", async () => {
    const { repository, sources, writes } = createRepository({
      first: "File body",
    });
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
    });

    const prepared = await prepareContentBlockConnect({
      state: createState(),
      blockInstanceId: "block",
      source: { type: "asset", assetId: "first" },
      renderScope: "page:/",
      projectId: "project",
      session,
      context: createContext(),
    });

    expect(prepared.requiresConfirmation).toBe(true);
    expect(writes).toEqual([]);
    expect(sources.get("first")).toBe("File body");
  });

  test("uses validated file content and removes every persisted body child", async () => {
    const { repository } = createRepository({ first: "File body" });
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
    });
    const state = createState();
    const prepared = await prepareContentBlockConnect({
      state,
      blockInstanceId: "block",
      source: { type: "asset", assetId: "first" },
      renderScope: "page:/",
      projectId: "project",
      session,
      context: createContext(),
    });

    const next = applyPayload(state, prepared.projectPayload);
    expect(next.instances?.get("block")?.children).toEqual([
      { type: "id", value: "templates" },
    ]);
    expect(next.instances?.has("body")).toBe(false);
    expect(Array.from(next.props?.values() ?? [])).toMatchObject([
      { name: "src", type: "asset", value: "first" },
    ]);
    expect(prepared.requiresConfirmation).toBe(true);
  });

  test("never writes the selected file while preparing a connection", async () => {
    const { repository, sources, writes } = createRepository({
      first: "---\ntitle: Existing\n---\n\nFile body\n",
    });
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
    });
    const state = createState();
    await prepareContentBlockConnect({
      state,
      blockInstanceId: "block",
      source: { type: "asset", assetId: "first" },
      renderScope: "page:/",
      projectId: "project",
      session,
      context: createContext(),
    });

    expect(writes).toEqual([]);
    expect(sources.get("first")).toBe(
      "---\ntitle: Existing\n---\n\nFile body\n"
    );
  });

  test("disconnects by copying resolved content with fresh project ids", async () => {
    const { repository, sources } = createRepository({ first: "# File body" });
    const state = createState({ body: false, source: "first" });
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
    });
    const loaded = await session.open({
      blockInstanceId: "block",
      source: { type: "asset", assetId: "first" },
      renderScope: "page:/",
      state,
      projectId: "project",
    });
    if (loaded.status !== "saved") {
      throw new Error("Expected loaded source");
    }
    const sourceRootId = loaded.root.fragment.instances[0].id;
    const prepared = await prepareContentBlockDisconnect({
      state,
      blockInstanceId: "block",
      currentSessionKey: loaded.key,
      renderScope: "page:/",
      projectId: "project",
      session,
      context: createContext(),
    });
    const next = applyPayload(state, prepared.projectPayload);
    const copiedChild = next.instances?.get("block")?.children[1];

    expect(copiedChild?.type).toBe("id");
    expect(copiedChild?.type === "id" && copiedChild.value).not.toBe(
      sourceRootId
    );
    expect(Array.from(next.props?.values() ?? [])).not.toMatchObject([
      { name: "src" },
    ]);
    expect(sources.get("first")).toBe("# File body");
  });

  test("rejects disconnect when the loaded file revision changed", async () => {
    const { repository, sources, writes } = createRepository({
      first: "First",
    });
    const state = createState({ body: false, source: "first" });
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
    });
    const loaded = await session.open({
      blockInstanceId: "block",
      source: { type: "asset", assetId: "first" },
      renderScope: "page:/",
      state,
      projectId: "project",
    });
    if (loaded.status !== "saved") {
      throw new Error("Expected loaded source");
    }
    sources.set("first", "Changed remotely");

    await expect(
      prepareContentBlockDisconnect({
        state,
        blockInstanceId: "block",
        currentSessionKey: loaded.key,
        renderScope: "page:/",
        projectId: "project",
        session,
        context: createContext(),
      })
    ).rejects.toBeInstanceOf(ContentBlockSourceRevisionConflictError);
    expect(writes).toEqual([]);
  });

  test("switch validates the new dynamic source before changing the old source prop", async () => {
    const { repository } = createRepository({ first: "First" });
    const state = createState({ body: false, source: "first" });
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
      resolveExpressionAssetId: () => "missing",
    });
    const loaded = await session.open({
      blockInstanceId: "block",
      source: { type: "asset", assetId: "first" },
      renderScope: "page:/",
      state,
      projectId: "project",
    });
    if (loaded.status !== "saved") {
      throw new Error("Expected loaded source");
    }
    const restore = await session.prepareSourceReplacement({
      key: loaded.key,
      expectedSource: loaded.source,
      source: "Unsaved first",
    });
    if (restore.status !== "ready") {
      throw new Error("Expected prepared source restore");
    }
    const pending = restore.apply({ schedule: false }).state;

    await expect(
      prepareContentBlockSwitch({
        state,
        blockInstanceId: "block",
        currentSessionKey: loaded.key,
        source: { type: "expression", value: "$ws$dataSource$asset" },
        renderScope: "page:/",
        projectId: "project",
        session,
        context: createContext(),
      })
    ).rejects.toThrow();
    expect(state.props?.get("src")).toMatchObject({
      type: "asset",
      value: "first",
    });
    expect(session.get(loaded.key)).toBe(pending);
  });

  test("resolves a dynamic source once and persists the expression contract", async () => {
    const { repository } = createRepository({ first: "File body" });
    let resolutions = 0;
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
      resolveExpressionAssetId: () => {
        resolutions += 1;
        return "first";
      },
    });
    const state = createState({ body: false });
    const prepared = await prepareContentBlockConnect({
      state,
      blockInstanceId: "block",
      source: { type: "expression", value: "$ws$dataSource$asset" },
      renderScope: "collection:item-1",
      projectId: "project",
      session,
      context: createContext(),
    });
    const next = applyPayload(state, prepared.projectPayload);

    expect(resolutions).toBe(1);
    expect(next.props?.get("generated-0")).toMatchObject({
      instanceId: "block",
      name: "src",
      type: "expression",
      value: "$ws$dataSource$asset",
    });
    expect(prepared.sourceState).toMatchObject({
      status: "saved",
      identity: { assetId: "first", renderScope: "collection:item-1" },
    });
  });

  test("does not copy a non-empty block body into an empty file", async () => {
    const { repository, sources, writes } = createRepository({ first: "" });
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
    });
    const prepared = await prepareContentBlockConnect({
      state: createState(),
      blockInstanceId: "block",
      source: { type: "asset", assetId: "first" },
      renderScope: "page:/",
      projectId: "project",
      session,
      context: createContext(),
    });

    expect(prepared.requiresConfirmation).toBe(true);
    expect(writes).toEqual([]);
    expect(sources.get("first")).toBe("");
  });

  test("does not persist pending writes while preparing a source switch", async () => {
    const { repository, sources, writes } = createRepository({
      first: "First",
      second: "Second",
    });
    const state = createState({ body: false, source: "first" });
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
    });
    const loaded = await session.open({
      blockInstanceId: "block",
      source: { type: "asset", assetId: "first" },
      renderScope: "page:/",
      state,
      projectId: "project",
    });
    if (loaded.status !== "saved") {
      throw new Error("Expected loaded source");
    }
    const restore = await session.prepareSourceReplacement({
      key: loaded.key,
      expectedSource: loaded.source,
      source: "Edited first",
    });
    if (restore.status !== "ready") {
      throw new Error("Expected prepared source restore");
    }
    restore.apply({ schedule: false });

    await expect(
      prepareContentBlockSwitch({
        state,
        blockInstanceId: "block",
        currentSessionKey: loaded.key,
        source: { type: "asset", assetId: "second" },
        renderScope: "page:/",
        projectId: "project",
        session,
        context: createContext(),
      })
    ).rejects.toThrow("MDX Asset session is pending");

    expect(writes).toEqual([]);
    expect(sources.get("first")).toBe("First");
    expect(state.props?.get("src")).toMatchObject({
      type: "asset",
      value: "first",
    });
  });

  test("switches source contracts when they resolve to the same file", async () => {
    const { repository, writes } = createRepository({ first: "First" });
    const state = createState({ body: false, source: "first" });
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
      resolveExpressionAssetId: () => "first",
    });
    const loaded = await session.open({
      blockInstanceId: "block",
      source: { type: "asset", assetId: "first" },
      renderScope: "page:/",
      state,
      projectId: "project",
    });
    if (loaded.status !== "saved") {
      throw new Error("Expected loaded source");
    }
    const restore = await session.prepareSourceReplacement({
      key: loaded.key,
      expectedSource: loaded.source,
      source: "Unsaved first",
    });
    if (restore.status !== "ready") {
      throw new Error("Expected prepared source restore");
    }
    restore.apply({ schedule: false });

    const prepared = await prepareContentBlockSwitch({
      state,
      blockInstanceId: "block",
      currentSessionKey: loaded.key,
      source: { type: "expression", value: "$ws$dataSource$asset" },
      renderScope: "page:/",
      projectId: "project",
      session,
      context: createContext(),
    });
    const next = applyPayload(state, prepared.projectPayload);

    expect(writes).toEqual([]);
    expect(next.props?.get("src")).toMatchObject({
      type: "expression",
      value: "$ws$dataSource$asset",
    });
    expect(prepared.sourceState).toMatchObject({
      status: "pending",
      localSource: "Unsaved first",
    });
  });

  test("does not settle the current source when the target has unresolved writes", async () => {
    const { repository, writes } = createRepository({
      first: "First",
      second: "Second",
    });
    const state = createState({ body: false, source: "first" });
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
    });
    const first = await session.open({
      blockInstanceId: "block",
      source: { type: "asset", assetId: "first" },
      renderScope: "page:/",
      state,
      projectId: "project",
    });
    const second = await session.open({
      blockInstanceId: "block",
      source: { type: "asset", assetId: "second" },
      renderScope: "page:/",
      state,
      projectId: "project",
    });
    if (first.status !== "saved" || second.status !== "saved") {
      throw new Error("Expected loaded sources");
    }
    const firstRestore = await session.prepareSourceReplacement({
      key: first.key,
      expectedSource: first.source,
      source: "Unsaved first",
    });
    const secondRestore = await session.prepareSourceReplacement({
      key: second.key,
      expectedSource: second.source,
      source: "Unsaved second",
    });
    if (firstRestore.status !== "ready" || secondRestore.status !== "ready") {
      throw new Error("Expected prepared source restores");
    }
    const pendingFirst = firstRestore.apply({ schedule: false }).state;
    const pendingSecond = secondRestore.apply({ schedule: false }).state;

    await expect(
      prepareContentBlockSwitch({
        state,
        blockInstanceId: "block",
        currentSessionKey: first.key,
        source: { type: "asset", assetId: "second" },
        renderScope: "page:/",
        projectId: "project",
        session,
        context: createContext(),
      })
    ).rejects.toThrow("MDX Asset session is pending");

    expect(session.get(first.key)).toBe(pendingFirst);
    expect(session.get(second.key)).toBe(pendingSecond);
    expect(writes).toEqual([]);
  });

  test("switches files without changing either file body", async () => {
    const { repository, sources, writes } = createRepository({
      first: "First",
      second: "---\ntitle: Target\n---\n\nSecond\n",
    });
    const state = createState({ body: false, source: "first" });
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
    });
    const loaded = await session.open({
      blockInstanceId: "block",
      source: { type: "asset", assetId: "first" },
      renderScope: "page:/",
      state,
      projectId: "project",
    });
    if (loaded.status !== "saved") {
      throw new Error("Expected loaded source");
    }

    const prepared = await prepareContentBlockSwitch({
      state,
      blockInstanceId: "block",
      currentSessionKey: loaded.key,
      source: { type: "asset", assetId: "second" },
      renderScope: "page:/",
      projectId: "project",
      session,
      context: createContext(),
    });

    const next = applyPayload(state, prepared.projectPayload);
    expect(prepared.requiresConfirmation).toBe(false);
    expect(writes).toEqual([]);
    expect(sources.get("first")).toBe("First");
    expect(sources.get("second")).toBe("---\ntitle: Target\n---\n\nSecond\n");
    expect(next.props?.get("src")).toMatchObject({
      type: "asset",
      value: "second",
    });
  });

  test("rejects invalid switch targets without replacing the usable source", async () => {
    const { repository, writes } = createRepository({
      first: "First",
      second: "export const unsafe = true",
    });
    const state = createState({ body: false, source: "first" });
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
    });
    const loaded = await session.open({
      blockInstanceId: "block",
      source: { type: "asset", assetId: "first" },
      renderScope: "page:/",
      state,
      projectId: "project",
    });
    if (loaded.status !== "saved") {
      throw new Error("Expected loaded source");
    }

    await expect(
      prepareContentBlockSwitch({
        state,
        blockInstanceId: "block",
        currentSessionKey: loaded.key,
        source: { type: "asset", assetId: "second" },
        renderScope: "page:/",
        projectId: "project",
        session,
        context: createContext(),
      })
    ).rejects.toThrow("MDX Asset session is recoverable");

    expect(writes).toEqual([]);
    expect(session.get(loaded.key)).toBe(loaded);
    expect(state.props?.get("src")).toMatchObject({ value: "first" });
  });

  test("keeps unresolved MDX out of the copied project body and reports it", async () => {
    const { repository } = createRepository({
      first: 'Before\n\n<ws.element ws:name="Missing" />\n\nAfter',
    });
    const state = createState({ body: false, source: "first" });
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
    });
    const loaded = await session.open({
      blockInstanceId: "block",
      source: { type: "asset", assetId: "first" },
      renderScope: "page:/",
      state,
      projectId: "project",
    });
    if (loaded.status !== "saved") {
      throw new Error("Expected loaded source");
    }
    const prepared = await prepareContentBlockDisconnect({
      state,
      blockInstanceId: "block",
      currentSessionKey: loaded.key,
      renderScope: "page:/",
      projectId: "project",
      session,
      context: createContext(),
    });
    const next = applyPayload(state, prepared.projectPayload);
    const copiedText = Array.from(next.instances?.values() ?? [])
      .flatMap(({ children }) => children)
      .flatMap((child) => (child.type === "text" ? [child.value] : []))
      .join(" ");

    expect(prepared.diagnostics.map(({ code }) => code)).toContain(
      "unresolved-template"
    );
    expect(copiedText).toContain("Before");
    expect(copiedText).toContain("After");
    expect(copiedText).not.toContain("Missing");
    expect(next.instances?.get("block")?.children[0]).toEqual({
      type: "id",
      value: "templates",
    });
  });

  test("rejects a loaded session from another source or render scope", async () => {
    const { repository, writes } = createRepository({
      first: "First",
      second: "Second",
    });
    const state = createState({ body: false, source: "first" });
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
    });
    const otherSource = await session.open({
      blockInstanceId: "block",
      source: { type: "asset", assetId: "second" },
      renderScope: "page:/",
      state,
      projectId: "project",
    });
    const otherScope = await session.open({
      blockInstanceId: "block",
      source: { type: "asset", assetId: "first" },
      renderScope: "collection:item-1",
      state,
      projectId: "project",
    });
    if (otherSource.status !== "saved" || otherScope.status !== "saved") {
      throw new Error("Expected loaded sources");
    }
    const restore = await session.prepareSourceReplacement({
      key: otherSource.key,
      expectedSource: otherSource.source,
      source: "Unsaved second",
    });
    if (restore.status !== "ready") {
      throw new Error("Expected prepared source restore");
    }
    const pendingOtherSource = restore.apply({ schedule: false }).state;

    await expect(
      prepareContentBlockDisconnect({
        state,
        blockInstanceId: "block",
        currentSessionKey: otherSource.key,
        renderScope: "page:/",
        projectId: "project",
        session,
        context: createContext(),
      })
    ).rejects.toThrow("does not match the Content Block source");
    await expect(
      prepareContentBlockDisconnect({
        state,
        blockInstanceId: "block",
        currentSessionKey: otherScope.key,
        renderScope: "page:/",
        projectId: "project",
        session,
        context: createContext(),
      })
    ).rejects.toThrow("different render scope");
    expect(session.get(otherSource.key)).toBe(pendingOtherSource);
    expect(writes).toEqual([]);
  });

  test("validates persisted ownership before settling a disconnect write", async () => {
    const { repository, writes } = createRepository({ first: "First" });
    const state = createState({ source: "first" });
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
    });
    const loaded = await session.open({
      blockInstanceId: "block",
      source: { type: "asset", assetId: "first" },
      renderScope: "page:/",
      state,
      projectId: "project",
    });
    if (loaded.status !== "saved") {
      throw new Error("Expected loaded source");
    }
    const restore = await session.prepareSourceReplacement({
      key: loaded.key,
      expectedSource: loaded.source,
      source: "Unsaved first",
    });
    if (restore.status !== "ready") {
      throw new Error("Expected prepared source restore");
    }
    const pending = restore.apply({ schedule: false }).state;

    await expect(
      prepareContentBlockDisconnect({
        state,
        blockInstanceId: "block",
        currentSessionKey: loaded.key,
        renderScope: "page:/",
        projectId: "project",
        session,
        context: createContext(),
      })
    ).rejects.toThrow("persisted body content");

    expect(session.get(loaded.key)).toBe(pending);
    expect(writes).toEqual([]);
  });

  test("repeated connect is a noop while a prepared replacement remains saved", async () => {
    const { repository } = createRepository({ first: "" });
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
    });
    const state = createState();
    const first = await prepareContentBlockConnect({
      state,
      blockInstanceId: "block",
      source: { type: "asset", assetId: "first" },
      renderScope: "page:/",
      projectId: "project",
      session,
      context: createContext(),
    });
    const connected = applyPayload(state, first.projectPayload);
    const repeated = await prepareContentBlockConnect({
      state: connected,
      blockInstanceId: "block",
      source: { type: "asset", assetId: "first" },
      renderScope: "page:/",
      projectId: "project",
      session,
      context: createContext(),
    });

    expect(repeated.projectPayload).toEqual([]);
    expect(repeated.sourceState?.status).toBe("saved");
  });

  test("repairs a connected block that still contains persisted body content", async () => {
    const { repository } = createRepository({ first: "File body" });
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
    });
    const state = createState({ source: "first" });

    const prepared = await prepareContentBlockConnect({
      state,
      blockInstanceId: "block",
      source: { type: "asset", assetId: "first" },
      renderScope: "page:/",
      projectId: "project",
      session,
      context: createContext(),
    });
    const repaired = applyPayload(state, prepared.projectPayload);

    expect(repaired.instances?.get("block")?.children).toEqual([
      { type: "id", value: "templates" },
    ]);
    expect(repaired.instances?.has("body")).toBe(false);
    expect(prepared.requiresConfirmation).toBe(false);
  });

  test("repeated disconnect is a project-only noop", async () => {
    const { repository } = createRepository({ first: "File body" });
    const state = createState({ body: false, source: "first" });
    const session = createMdxAssetEditingSession({
      repository,
      authorizeAsset: () => true,
    });
    const loaded = await session.open({
      blockInstanceId: "block",
      source: { type: "asset", assetId: "first" },
      renderScope: "page:/",
      state,
      projectId: "project",
    });
    if (loaded.status !== "saved") {
      throw new Error("Expected loaded source");
    }
    const first = await prepareContentBlockDisconnect({
      state,
      blockInstanceId: "block",
      currentSessionKey: loaded.key,
      renderScope: "page:/",
      projectId: "project",
      session,
      context: createContext(),
    });
    const disconnected = applyPayload(state, first.projectPayload);

    const repeated = await prepareContentBlockDisconnect({
      state: disconnected,
      blockInstanceId: "block",
      renderScope: "page:/",
      projectId: "project",
      session,
      context: createContext(),
    });

    expect(repeated.projectPayload).toEqual([]);
  });
});
