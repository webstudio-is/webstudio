import { afterEach, describe, expect, test } from "vitest";
import { migratePages } from "@webstudio-is/project-migrations/pages";
import { serializedBuild } from "@webstudio-is/project-build/contracts";
import { createBuilderStateFromBuildData } from "@webstudio-is/project-build/state";
import {
  createRuntimeFixtureBuildSnapshot,
  createRuntimeFixtureSerializedBuild,
  publicApiCommandByOperationId,
  runtimeFixturePermissions,
  startRuntimeFixtureApi,
} from "./runtime-fixture-api";

const closeCallbacks: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(closeCallbacks.splice(0).map((close) => close()));
});

describe("runtime fixture API", () => {
  test("serializes build snapshots for their distinct API contracts", () => {
    const state = createBuilderStateFromBuildData({
      pages: migratePages({
        meta: {},
        compiler: {},
        redirects: [],
        homePageId: "home",
        rootFolderId: "root",
        pages: [
          {
            id: "home",
            name: "Home",
            path: "",
            title: "Home",
            rootInstanceId: "root-instance",
            meta: {},
          },
        ],
        folders: [
          {
            id: "root",
            name: "Root",
            slug: "",
            children: ["home"],
          },
        ],
      }),
      instances: [
        {
          type: "instance",
          id: "root-instance",
          component: "Box",
          children: [],
        },
      ],
      props: [],
      dataSources: [],
      resources: [],
      breakpoints: [],
      styles: [],
      styleSources: [],
      styleSourceSelections: [],
      assets: [],
      projectSettings: { meta: {}, compiler: {} },
    });
    const baseBuild = {
      id: "old-build",
      projectId: "project",
      version: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const snapshot = createRuntimeFixtureBuildSnapshot({
      state,
      projectId: "project",
      buildId: "build",
      version: 2,
    });
    expect(snapshot.pages).toEqual([expect.objectContaining({ id: "home" })]);
    expect(snapshot.instances).toEqual([
      expect.objectContaining({ id: "root-instance" }),
    ]);
    expect(snapshot.variables).toEqual([]);
    expect(snapshot).not.toHaveProperty("dataSources");

    const build = createRuntimeFixtureSerializedBuild({
      state,
      baseBuild,
      buildId: "build",
      version: 2,
    });
    expect(serializedBuild.parse(build)).toEqual(build);
    expect(build.pages).toEqual(
      expect.objectContaining({
        pages: [expect.objectContaining({ id: "home" })],
      })
    );
    expect(build.instances).toEqual([
      ["root-instance", expect.objectContaining({ id: "root-instance" })],
    ]);
  });

  test.each([
    {
      method: "GET",
      request: (origin: string) =>
        fetch(
          `${origin}/trpc/api.pages.list?input=${encodeURIComponent(
            JSON.stringify({ 0: { json: { limit: 3 } } })
          )}`
        ),
    },
    {
      method: "POST",
      request: (origin: string) =>
        fetch(`${origin}/trpc/api.pages.list`, {
          method: "POST",
          body: JSON.stringify({ 0: { json: { limit: 3 } } }),
        }),
    },
  ])("decodes $method tRPC input", async ({ request }) => {
    const api = await startRuntimeFixtureApi(
      async ({ operationPath, readInput }) => ({
        operationPath,
        input: await readInput(),
      })
    );
    closeCallbacks.push(api.close);

    const response = await request(api.origin);

    expect(await response.json()).toEqual([
      {
        result: {
          data: {
            operationPath: "pages.list",
            input: { limit: 3 },
          },
        },
      },
    ]);
  });

  test("returns a stable tRPC error envelope", async () => {
    const api = await startRuntimeFixtureApi(async () => {
      throw new Error("fixture failed");
    });
    closeCallbacks.push(api.close);

    const response = await fetch(`${api.origin}/trpc/api.pages.list`);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual([
      {
        error: {
          message: "fixture failed",
          code: -32603,
          data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
        },
      },
    ]);
  });

  test("derives permissions and command names from the public API contract", () => {
    expect(runtimeFixturePermissions.apiContract.operationIds).toContain(
      "publish.list"
    );
    expect(publicApiCommandByOperationId.get("pages.list")).toBe("list-pages");
  });
});
