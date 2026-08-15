import { describe, expect, test } from "vitest";
import {
  getAssetContentHash,
  blockComponent,
  blockTemplateComponent,
} from "@webstudio-is/sdk";
import type { AssetRepository } from "@webstudio-is/asset-uploader/server";
import type { BuilderState } from "../state/builder-state";
import {
  createMdxAssetEditingSession,
  type MdxAssetEditingSessionState,
} from "./mdx-asset-session";

const encoder = new TextEncoder();

const asset = (id: string, name = `${id}_hash.mdx`) => ({
  id,
  projectId: "project",
  size: 0,
  name,
  filename: `${id}.mdx`,
  description: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  type: "file" as const,
  format: "file",
  meta: {},
});

const createRepository = (sources: Map<string, string>) =>
  ({
    readContent: async ({ assetId }: { assetId: string }) => {
      const source = sources.get(assetId);
      if (source === undefined) {
        throw new Error("Asset not found");
      }
      const bytes = encoder.encode(source);
      return {
        asset: { ...asset(assetId), size: bytes.byteLength },
        data: {
          async *[Symbol.asyncIterator]() {
            yield bytes;
          },
        },
        contentLength: bytes.byteLength,
      };
    },
  }) satisfies Pick<AssetRepository, "readContent">;

const createState = (): BuilderState => ({
  instances: new Map([
    [
      "block",
      {
        type: "instance",
        id: "block",
        component: blockComponent,
        children: [{ type: "id", value: "templates" }],
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

const expectStatus = <Status extends MdxAssetEditingSessionState["status"]>(
  state: MdxAssetEditingSessionState,
  status: Status
) => {
  expect(state.status).toBe(status);
  return state as Extract<MdxAssetEditingSessionState, { status: Status }>;
};

describe("MDX Asset editing session", () => {
  test("loads direct Assets into a revision-pinned materialized root", async () => {
    const source = "# Direct";
    const session = createMdxAssetEditingSession({
      repository: createRepository(new Map([["direct", source]])),
      authorizeAsset: () => true,
    });

    const loaded = expectStatus(
      await session.open({
        blockInstanceId: "block",
        source: { type: "asset", assetId: "direct" },
        renderScope: "page:/one",
        state: createState(),
        projectId: "project",
      }),
      "saved"
    );

    expect(loaded.identity).toEqual({
      blockInstanceId: "block",
      assetId: "direct",
      revision: `sha256:${await getAssetContentHash(encoder.encode(source))}`,
      contentRef: "direct_hash.mdx",
      format: "mdx",
      renderScope: "page:/one",
    });
    expect(loaded.root.fragment.instances[0]).toMatchObject({ tag: "h1" });
  });

  test("resolves a dynamic binding once and isolates render scopes", async () => {
    const sources = new Map([
      ["first", "First"],
      ["second", "Second"],
    ]);
    let resolved = "first";
    let resolutionCount = 0;
    const session = createMdxAssetEditingSession({
      repository: createRepository(sources),
      authorizeAsset: () => true,
      resolveExpressionAssetId: () => {
        resolutionCount += 1;
        return resolved;
      },
    });
    const input = {
      blockInstanceId: "block",
      source: { type: "expression" as const, value: "post.body" },
      state: createState(),
      projectId: "project",
    };

    const first = expectStatus(
      await session.open({ ...input, renderScope: "collection:first" }),
      "saved"
    );
    resolved = "second";
    const second = expectStatus(
      await session.open({ ...input, renderScope: "collection:second" }),
      "saved"
    );

    expect(first.key).not.toBe(second.key);
    expect(first.identity.assetId).toBe("first");
    expect(second.identity.assetId).toBe("second");
    expect(session.get(first.key)).toBe(first);
    expect(session.get(second.key)).toBe(second);
    expect(resolutionCount).toBe(2);
  });

  test("returns a typed failure when dynamic source resolution fails", async () => {
    const session = createMdxAssetEditingSession({
      repository: createRepository(new Map()),
      authorizeAsset: () => true,
      resolveExpressionAssetId: () => {
        throw new Error("Unavailable scope");
      },
    });

    const failed = expectStatus(
      await session.open({
        blockInstanceId: "block",
        source: { type: "expression", value: "post.body" },
        renderScope: "page:/one",
        state: createState(),
        projectId: "project",
      }),
      "failed"
    );
    expect(failed.error.message).toBe("Unavailable scope");
  });

  test("does not re-evaluate a changed dynamic binding while preparing a save", async () => {
    let resolved = "first";
    let resolutionCount = 0;
    const authorized: string[] = [];
    const session = createMdxAssetEditingSession({
      repository: createRepository(new Map([["first", "Before"]])),
      authorizeAsset: ({ assetId, operation }) => {
        authorized.push(`${operation}:${assetId}`);
        return true;
      },
      resolveExpressionAssetId: () => {
        resolutionCount += 1;
        return resolved;
      },
    });
    const loaded = expectStatus(
      await session.open({
        blockInstanceId: "block",
        source: { type: "expression", value: "post.body" },
        renderScope: "page:/one",
        state: createState(),
        projectId: "project",
      }),
      "saved"
    );
    const instance = loaded.root.fragment.instances[0];
    resolved = "other";

    const pending = expectStatus(
      await session.prepareSave({
        key: loaded.key,
        changes: [
          {
            root: { type: "external", identity: loaded.identity },
            payload: [
              {
                namespace: "instances",
                patches: [
                  {
                    op: "replace",
                    path: [instance.id, "children", 0],
                    value: { type: "text", value: "After" },
                  },
                ],
              },
            ],
          },
        ],
      }),
      "pending"
    );

    expect(resolutionCount).toBe(1);
    expect(pending.writes[0].root.identity.assetId).toBe("first");
    expect(authorized).toEqual(["read:first", "write:first"]);
  });

  test("does not discard a pending save when the same scope is reopened", async () => {
    const session = createMdxAssetEditingSession({
      repository: createRepository(new Map([["post", "Before"]])),
      authorizeAsset: () => true,
    });
    const input = {
      blockInstanceId: "block",
      source: { type: "asset" as const, assetId: "post" },
      renderScope: "page:/one",
      state: createState(),
      projectId: "project",
    };
    const loaded = expectStatus(await session.open(input), "saved");
    const instance = loaded.root.fragment.instances[0];
    const pending = expectStatus(
      await session.prepareSave({
        key: loaded.key,
        changes: [
          {
            root: { type: "external", identity: loaded.identity },
            payload: [
              {
                namespace: "instances",
                patches: [
                  {
                    op: "replace",
                    path: [instance.id, "children", 0],
                    value: { type: "text", value: "After" },
                  },
                ],
              },
            ],
          },
        ],
      }),
      "pending"
    );

    expect(await session.open(input)).toBe(pending);
    expect(session.get(loaded.key)).toBe(pending);
  });

  test("keeps a session saved when there are no writes to prepare", async () => {
    const session = createMdxAssetEditingSession({
      repository: createRepository(new Map([["post", "Body"]])),
      authorizeAsset: () => true,
    });
    const loaded = expectStatus(
      await session.open({
        blockInstanceId: "block",
        source: { type: "asset", assetId: "post" },
        renderScope: "page:/one",
        state: createState(),
        projectId: "project",
      }),
      "saved"
    );

    expect(await session.prepareSave({ key: loaded.key, changes: [] })).toBe(
      loaded
    );
    expect(session.get(loaded.key)).toBe(loaded);
  });

  test("reports changed direct bindings and stale revisions as conflicts", async () => {
    const mismatchedRepository = {
      readContent: async () => {
        const bytes = encoder.encode("Body");
        return {
          asset: { ...asset("other"), size: bytes.byteLength },
          data: {
            async *[Symbol.asyncIterator]() {
              yield bytes;
            },
          },
        };
      },
    } satisfies Pick<AssetRepository, "readContent">;
    const mismatch = createMdxAssetEditingSession({
      repository: mismatchedRepository,
      authorizeAsset: () => true,
    });
    const changed = expectStatus(
      await mismatch.open({
        blockInstanceId: "block",
        source: { type: "asset", assetId: "selected" },
        renderScope: "page:/one",
        state: createState(),
        projectId: "project",
      }),
      "conflicting"
    );
    expect(changed.diagnostics).toMatchObject([
      {
        code: "changed-binding",
        loadedAssetId: "other",
        resolvedAssetId: "selected",
      },
    ]);

    const stale = createMdxAssetEditingSession({
      repository: createRepository(new Map([["selected", "Body"]])),
      authorizeAsset: () => true,
    });
    const conflict = expectStatus(
      await stale.open({
        blockInstanceId: "block",
        source: { type: "asset", assetId: "selected" },
        renderScope: "page:/one",
        expectedRevision: "sha256:stale",
        state: createState(),
        projectId: "project",
      }),
      "conflicting"
    );
    expect(conflict.diagnostics).toMatchObject([
      {
        code: "stale-revision",
        expectedRevision: "sha256:stale",
      },
    ]);

    const legacy = expectStatus(
      await stale.open({
        blockInstanceId: "block",
        source: { type: "asset", assetId: "selected" },
        renderScope: "page:/legacy",
        expectedRevision: "file:selected_hash.mdx:2026-01-02T00:00:00.000Z:4",
        state: createState(),
        projectId: "project",
      }),
      "saved"
    );
    expect(legacy.identity.revision).toBe(
      "file:selected_hash.mdx:2026-01-02T00:00:00.000Z:4"
    );
  });

  test("keeps invalid and unsafe MDX recoverable and supports reload/cancel", async () => {
    const sources = new Map([["post", `<ws.element ws:tag="p">`]]);
    const session = createMdxAssetEditingSession({
      repository: createRepository(sources),
      authorizeAsset: () => true,
    });
    const input = {
      blockInstanceId: "block",
      source: { type: "asset" as const, assetId: "post" },
      renderScope: "page:/one",
      state: createState(),
      projectId: "project",
    };
    const invalid = expectStatus(await session.open(input), "recoverable");
    expect(invalid.diagnostics[0]).toMatchObject({ code: "invalid-mdx" });

    sources.set("post", `{alert("unsafe")}`);
    const recoverable = expectStatus(await session.open(input), "recoverable");
    expect(recoverable.diagnostics[0]).toMatchObject({ code: "unsafe-mdx" });

    sources.set("post", "Recovered");
    const recovered = expectStatus(await session.open(input), "saved");
    expect(recovered.key).not.toBe(recoverable.key);
    expect(session.cancel(recovered.key).status).toBe("cancelled");
  });
});
