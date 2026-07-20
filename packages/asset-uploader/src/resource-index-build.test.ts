import { describe, expect, test, vi } from "vitest";
import { createCanonicalAssetFileEntry } from "@webstudio-is/asset-resource";
import {
  createTestServer,
  db,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import {
  AssetResourceIndexBuildCancelledError,
  AssetResourceIndexBuildSupersededError,
  buildPersistAndActivateAssetResourceIndex,
} from "./resource-index-build";

const server = createTestServer();
const entry = createCanonicalAssetFileEntry({
  projectId: "project-1",
  document: {
    _id: "post-1",
    _type: "asset.file",
    name: "post.md",
    path: "blog/post.md",
    key: "post",
    extension: "md",
    mimeType: "text/markdown",
    size: 100,
    revision: "content-revision",
    contentRef: "private:post.md",
    properties: { slug: "post" },
  },
});

describe("resource index build and activation", () => {
  test("persists a validated artifact before atomically activating it", async () => {
    const events: string[] = [];
    server.use(
      db.post("rpc/begin_asset_resource_index_build", async ({ request }) => {
        events.push("begin");
        expect(await request.json()).toMatchObject({
          p_project_id: "project-1",
          p_resource_id: "posts",
          p_query: `*[properties.slug == $slug]`,
          p_query_hash: expect.stringMatching(/^sha256:/),
          p_asset_revision: expect.stringMatching(/^sha256:/),
        });
        return json(null);
      }),
      db.post("rpc/activate_asset_resource_index", async ({ request }) => {
        events.push("activate");
        expect(await request.json()).toMatchObject({
          p_project_id: "project-1",
          p_resource_id: "posts",
          p_revision: expect.stringMatching(/^sha256:/),
          p_checksum: expect.stringMatching(/^sha256:/),
          p_object_key: expect.stringContaining(
            "projects/project-1/resources/posts"
          ),
        });
        return json(true);
      })
    );
    const result = await buildPersistAndActivateAssetResourceIndex({
      client: testContext.postgrest.client,
      store: {
        putIfAbsent: async ({ checksum }) => {
          events.push("persist");
          return { status: "created", checksum };
        },
        delete: async () => "deleted",
      },
      projectId: "project-1",
      resourceId: "posts",
      query: `*[properties.slug == $slug]`,
      entries: [entry],
    });

    expect(events).toEqual(["begin", "persist", "activate"]);
    expect(result.index.documents).toHaveLength(1);
  });

  test("reports a superseded build when compare-and-swap activation loses", async () => {
    server.use(
      db.post("rpc/begin_asset_resource_index_build", () => json(null)),
      db.post("rpc/activate_asset_resource_index", () => json(false)),
      db.post("rpc/fail_asset_resource_index_build", () => json(false))
    );
    await expect(
      buildPersistAndActivateAssetResourceIndex({
        client: testContext.postgrest.client,
        store: {
          putIfAbsent: async ({ checksum }) => ({
            status: "created",
            checksum,
          }),
        },
        projectId: "project-1",
        resourceId: "posts",
        query: "*[]",
        entries: [entry],
      })
    ).rejects.toBeInstanceOf(AssetResourceIndexBuildSupersededError);
  });

  test("uses a unique identity for each otherwise identical build attempt", async () => {
    const begun: string[] = [];
    const activated: string[] = [];
    server.use(
      db.post("rpc/begin_asset_resource_index_build", async ({ request }) => {
        const body = (await request.json()) as {
          p_build_attempt_id: string;
        };
        begun.push(body.p_build_attempt_id);
        return json(null);
      }),
      db.post("rpc/activate_asset_resource_index", async ({ request }) => {
        const body = (await request.json()) as {
          p_build_attempt_id: string;
        };
        activated.push(body.p_build_attempt_id);
        return json(true);
      })
    );
    const input = {
      client: testContext.postgrest.client,
      store: {
        putIfAbsent: async ({ checksum }: { checksum: string }) => ({
          status: "created" as const,
          checksum,
        }),
      },
      projectId: "project-1",
      resourceId: "posts",
      query: "*[]",
      entries: [entry],
    };

    await buildPersistAndActivateAssetResourceIndex(input);
    await buildPersistAndActivateAssetResourceIndex(input);

    expect(begun).toHaveLength(2);
    expect(new Set(begun).size).toBe(2);
    expect(activated).toEqual(begun);
  });

  test("marks a current failed attempt without trying to activate it", async () => {
    const activate = vi.fn();
    server.use(
      db.post("rpc/begin_asset_resource_index_build", () => json(null)),
      db.post("rpc/activate_asset_resource_index", activate),
      db.post("rpc/fail_asset_resource_index_build", async ({ request }) => {
        expect(await request.json()).toMatchObject({
          p_project_id: "project-1",
          p_resource_id: "posts",
          p_build_error: {
            code: "INDEX_BUILD_FAILED",
            message: "Resource index build failed",
          },
        });
        return json(true);
      })
    );
    await expect(
      buildPersistAndActivateAssetResourceIndex({
        client: testContext.postgrest.client,
        store: {
          putIfAbsent: async () => {
            throw new Error("Storage unavailable");
          },
        },
        projectId: "project-1",
        resourceId: "posts",
        query: "*[]",
        entries: [entry],
      })
    ).rejects.toThrow("Storage unavailable");
    expect(activate).not.toHaveBeenCalled();
  });

  test("marks an in-flight cancelled build stale and never activates it", async () => {
    const controller = new AbortController();
    const activate = vi.fn();
    let releaseStorage: (() => void) | undefined;
    server.use(
      db.post("rpc/begin_asset_resource_index_build", () => json(null)),
      db.post("rpc/activate_asset_resource_index", activate),
      db.post("rpc/cancel_asset_resource_index_build", () => json(true))
    );
    const build = buildPersistAndActivateAssetResourceIndex({
      client: testContext.postgrest.client,
      store: {
        putIfAbsent: async ({ checksum }) => {
          await new Promise<void>((resolve) => {
            releaseStorage = resolve;
          });
          return { status: "created", checksum };
        },
      },
      projectId: "project-1",
      resourceId: "posts",
      query: "*[]",
      entries: [entry],
      signal: controller.signal,
    });
    await vi.waitFor(() => expect(releaseStorage).toBeTypeOf("function"));
    controller.abort();
    releaseStorage?.();

    await expect(build).rejects.toBeInstanceOf(
      AssetResourceIndexBuildCancelledError
    );
    expect(activate).not.toHaveBeenCalled();
  });

  test("rejects an invalid query before build state or storage changes", async () => {
    const putIfAbsent = vi.fn();
    await expect(
      buildPersistAndActivateAssetResourceIndex({
        client: testContext.postgrest.client,
        store: { putIfAbsent },
        projectId: "project-1",
        resourceId: "posts",
        query: "*[invalid ==",
        entries: [entry],
      })
    ).rejects.toMatchObject({ code: "INVALID_QUERY" });
    expect(putIfAbsent).not.toHaveBeenCalled();
  });
});
