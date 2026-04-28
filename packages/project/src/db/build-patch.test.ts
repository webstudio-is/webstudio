import { describe, expect, test } from "vitest";
import {
  createTestServer,
  db,
  empty,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import type { Patch } from "immer";
import { patchBuild, type BuildPatchTransaction } from "./build-patch";
import {
  createBuildPatchUpdate,
  singlePlayerVersionMismatchResult,
} from "./build-patch-core";

const server = createTestServer();

const createContext = (): AppContext =>
  ({
    ...testContext,
    authorization: { type: "user", userId: "user-1" },
    getOwnerPlanFeatures: async () => ({}),
  }) as unknown as AppContext;

const ownershipHandler = db.get("Project", ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.has("userId")) {
    return json({ id: url.searchParams.get("id")?.replace("eq.", "") });
  }
  return json(null);
});

const buildRow = {
  id: "build-1",
  projectId: "project-1",
  version: 3,
  lastTransactionId: "previous-tx",
  isCleaned: null,
  publishStatus: "PUBLISHED" as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  pages: JSON.stringify({
    meta: {},
    homePage: {
      id: "page-1",
      name: "Home",
      path: "",
      title: "Home",
      meta: {},
      rootInstanceId: "body-1",
    },
    pages: [],
    folders: [{ id: "root", name: "Root", slug: "", children: [] }],
  }),
  breakpoints: JSON.stringify([]),
  styles: JSON.stringify([]),
  styleSources: JSON.stringify([]),
  styleSourceSelections: JSON.stringify([]),
  props: JSON.stringify([
    {
      id: "prop-1",
      instanceId: "body-1",
      name: "title",
      type: "string",
      value: "Old title",
    },
  ]),
  dataSources: JSON.stringify([]),
  resources: JSON.stringify([]),
  instances: JSON.stringify([
    { id: "body-1", type: "instance", component: "Body", children: [] },
  ]),
  deployment: null,
  marketplaceProduct: JSON.stringify({}),
};

const transaction = (
  overrides: Partial<BuildPatchTransaction> = {}
): BuildPatchTransaction => ({
  id: "tx-1",
  payload: [
    {
      namespace: "props",
      patches: [
        { op: "replace", path: ["prop-1", "value"], value: "New title" },
      ],
    },
  ],
  ...overrides,
});

describe("patchBuild", () => {
  test("applies transactions, validates data, and updates build with optimistic version guard", async () => {
    let updatedBuild: unknown;
    server.use(
      db.get("Build", () => json([buildRow])),
      db.patch("Build", async ({ request }) => {
        updatedBuild = await request.json();
        return empty({ headers: { "Content-Range": "*/1" } });
      })
    );

    const result = await patchBuild(
      {
        buildId: "build-1",
        projectId: "project-1",
        clientVersion: 3,
        transactions: [transaction()],
      },
      createContext()
    );

    expect(result).toEqual({ status: "ok", version: 4 });
    expect(updatedBuild).toMatchObject({
      version: 4,
      lastTransactionId: "tx-1",
    });
    expect(JSON.parse((updatedBuild as { props: string }).props)).toEqual([
      {
        id: "prop-1",
        instanceId: "body-1",
        name: "title",
        type: "string",
        value: "New title",
      },
    ]);
  });

  test("applies page path changes from normalized page id patches", async () => {
    let updatedBuild: unknown;
    server.use(
      db.get("Build", () =>
        json([
          {
            ...buildRow,
            pages: JSON.stringify({
              meta: {},
              homePageId: "page-1",
              rootFolderId: "root",
              pages: [
                {
                  id: "page-1",
                  name: "Home",
                  path: "",
                  title: "Home",
                  meta: {},
                  rootInstanceId: "body-1",
                },
                {
                  id: "page-2",
                  name: "About",
                  path: "/about",
                  title: "About",
                  meta: {},
                  rootInstanceId: "body-1",
                },
              ],
              folders: [
                {
                  id: "root",
                  name: "Root",
                  slug: "",
                  children: ["page-1", "page-2"],
                },
              ],
            }),
          },
        ])
      ),
      db.patch("Build", async ({ request }) => {
        updatedBuild = await request.json();
        return empty({ headers: { "Content-Range": "*/1" } });
      })
    );

    const result = await patchBuild(
      {
        buildId: "build-1",
        projectId: "project-1",
        clientVersion: 3,
        transactions: [
          transaction({
            payload: [
              {
                namespace: "pages",
                patches: [
                  {
                    op: "replace",
                    path: ["pages", "page-2", "path"],
                    value: "/company",
                  },
                ],
              },
            ],
          }),
        ],
      },
      createContext()
    );

    expect(result).toEqual({ status: "ok", version: 4 });
    expect(
      JSON.parse((updatedBuild as { pages: string }).pages).pages.find(
        (page: { id: string }) => page.id === "page-2"
      )?.path
    ).toBe("/company");
  });

  test("returns ok when retrying a transaction already saved by the server", async () => {
    let didPatch = false;
    server.use(
      db.get("Build", () =>
        json([{ ...buildRow, version: 4, lastTransactionId: "tx-1" }])
      ),
      db.patch("Build", () => {
        didPatch = true;
        return empty({ headers: { "Content-Range": "*/1" } });
      })
    );

    const result = await patchBuild(
      {
        buildId: "build-1",
        projectId: "project-1",
        clientVersion: 3,
        transactions: [transaction()],
      },
      createContext()
    );

    expect(result).toEqual({ status: "ok", version: 4 });
    expect(didPatch).toBe(false);
  });

  test("returns version_mismatched when loaded build version differs", async () => {
    server.use(db.get("Build", () => json([{ ...buildRow, version: 4 }])));

    const result = await patchBuild(
      {
        buildId: "build-1",
        projectId: "project-1",
        clientVersion: 3,
        transactions: [transaction()],
      },
      createContext()
    );

    expect(result).toEqual(singlePlayerVersionMismatchResult);
  });

  test("returns version_mismatched when optimistic update affects no rows", async () => {
    server.use(
      db.get("Build", () => json([buildRow])),
      db.patch("Build", () => empty({ headers: { "Content-Range": "*/0" } }))
    );

    const result = await patchBuild(
      {
        buildId: "build-1",
        projectId: "project-1",
        clientVersion: 3,
        transactions: [transaction()],
      },
      createContext()
    );

    expect(result).toEqual(singlePlayerVersionMismatchResult);
  });

  test("rejects unknown namespaces", async () => {
    let didPatch = false;
    server.use(
      db.get("Build", () => json([buildRow])),
      db.patch("Build", () => {
        didPatch = true;
        return empty({ headers: { "Content-Range": "*/1" } });
      })
    );

    const result = await patchBuild(
      {
        buildId: "build-1",
        projectId: "project-1",
        clientVersion: 3,
        transactions: [
          transaction({
            payload: [
              {
                namespace: "unknown",
                patches: [{ op: "add", path: [], value: null }],
              },
            ],
          }),
        ],
      },
      createContext()
    );

    expect(result).toEqual({
      status: "error",
      errors: 'Unknown namespace "unknown"',
    });
    expect(didPatch).toBe(false);
  });

  test("core patch helper is decoupled from asset app logic", async () => {
    const assetPatch: Patch = { op: "add", path: ["asset-1"], value: {} };
    const result = await createBuildPatchUpdate({
      build: buildRow,
      clientVersion: 3,
      transactions: [
        transaction({
          payload: [
            {
              namespace: "assets",
              patches: [assetPatch],
            },
          ],
        }),
      ],
    });

    expect(result).toMatchObject({
      status: "ok",
      assetPatches: [[assetPatch]],
      nextVersion: 4,
      update: {
        lastTransactionId: "tx-1",
        version: 4,
      },
    });
  });

  test("does not mark build as saved when asset patching fails", async () => {
    let didPatchBuild = false;
    server.use(
      ownershipHandler,
      db.get("Build", () => json([buildRow])),
      db.get("Asset", () => json([])),
      db.patch("Build", () => {
        didPatchBuild = true;
        return empty({ headers: { "Content-Range": "*/1" } });
      })
    );

    await expect(
      patchBuild(
        {
          buildId: "build-1",
          projectId: "project-1",
          clientVersion: 3,
          transactions: [
            transaction({
              payload: [
                {
                  namespace: "assets",
                  patches: [
                    {
                      op: "add",
                      path: ["asset-invalid"],
                      value: {
                        id: "asset-invalid",
                        name: "invalid.jpg",
                      },
                    },
                  ],
                },
              ],
            }),
          ],
        },
        createContext()
      )
    ).rejects.toThrow();

    expect(didPatchBuild).toBe(false);
  });
});
