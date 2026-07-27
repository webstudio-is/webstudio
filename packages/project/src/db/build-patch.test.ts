import { describe, expect, test } from "vitest";
import {
  createTestServer,
  db,
  empty,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import {
  patchBuild,
  patchLoadedBuild,
  type BuildPatchTransaction,
} from "./build-patch";
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
  projectSettings: JSON.stringify({ meta: {}, compiler: {} }),
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
  test("patches an already loaded build and returns the updated build row", async () => {
    let didLoadBuild = false;
    server.use(
      db.get("Build", () => {
        didLoadBuild = true;
        return json([buildRow]);
      }),
      db.patch("Build", () => empty({ headers: { "Content-Range": "*/1" } }))
    );

    const result = await patchLoadedBuild(
      {
        build: buildRow,
        buildId: "build-1",
        projectId: "project-1",
        clientVersion: 3,
        transactions: [transaction()],
      },
      createContext()
    );

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.version).toBe(4);
      expect(result.build.version).toBe(4);
      expect(JSON.parse(result.build.props)).toEqual([
        {
          id: "prop-1",
          instanceId: "body-1",
          name: "title",
          type: "string",
          value: "New title",
        },
      ]);
    }
    expect(didLoadBuild).toBe(false);
  });

  test("persists asset-folder namespace changes before accepting the build transaction", async () => {
    let insertedFolders: unknown;
    server.use(
      db.get("AssetFolder", () => json([])),
      db.post("AssetFolder", async ({ request }) => {
        insertedFolders = await request.json();
        return json(insertedFolders as never);
      }),
      db.patch("Build", () => empty({ headers: { "Content-Range": "*/1" } }))
    );

    const result = await patchLoadedBuild(
      {
        build: buildRow,
        buildId: "build-1",
        projectId: "project-1",
        clientVersion: 3,
        transactions: [
          transaction({
            payload: [
              {
                namespace: "assetFolders",
                patches: [
                  {
                    op: "add",
                    path: ["folder-1"],
                    value: {
                      id: "folder-1",
                      projectId: "project-1",
                      name: "Images",
                      createdAt: "2026-01-01T00:00:00.000Z",
                    },
                  },
                ],
              },
            ],
          }),
        ],
      },
      createContext()
    );

    expect(result.status).toBe("ok");
    expect(insertedFolders).toEqual([
      {
        id: "folder-1",
        projectId: "project-1",
        name: "Images",
        parentId: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });

  test("deletes folder assets before deleting the folder", async () => {
    const calls: string[] = [];
    const assetRow = {
      assetId: "asset-1",
      projectId: "project-1",
      filename: null,
      description: null,
      folderId: "folder-1",
      file: {
        name: "asset.pdf",
        format: "pdf",
        description: null,
        size: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        meta: "{}",
        status: "UPLOADED",
      },
    };
    server.use(
      ownershipHandler,
      db.get("AssetFolder", () =>
        json([
          {
            id: "folder-1",
            projectId: "project-1",
            name: "Folder",
            parentId: null,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ])
      ),
      db.get("Asset", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.has("name")) {
          return json([]);
        }
        if (url.searchParams.has("id")) {
          return json([
            {
              id: "asset-1",
              projectId: "project-1",
              name: "asset.pdf",
              file: assetRow.file,
            },
          ]);
        }
        return json([assetRow]);
      }),
      db.patch("Project", () => empty({ status: 204 })),
      db.delete("Asset", () => {
        calls.push("asset-delete");
        return empty({ status: 204 });
      }),
      db.patch("File", () => empty({ status: 204 })),
      db.delete("AssetFolder", () => {
        calls.push("folder-delete");
        return json([{ id: "folder-1" }]);
      }),
      db.patch("Build", () => {
        calls.push("build-update");
        return empty({ headers: { "Content-Range": "*/1" } });
      })
    );

    const result = await patchLoadedBuild(
      {
        build: buildRow,
        buildId: "build-1",
        projectId: "project-1",
        clientVersion: 3,
        transactions: [
          transaction({
            payload: [
              {
                namespace: "assetFolders",
                patches: [{ op: "remove", path: ["folder-1"] }],
              },
              {
                namespace: "assets",
                patches: [{ op: "remove", path: ["asset-1"] }],
              },
            ],
          }),
        ],
      },
      createContext()
    );

    expect(result.status).toBe("ok");
    expect(calls).toEqual(["asset-delete", "folder-delete", "build-update"]);
  });

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

  test("applies data source variable additions", async () => {
    const result = await createBuildPatchUpdate({
      build: buildRow,
      clientVersion: 3,
      transactions: [
        transaction({
          payload: [
            {
              namespace: "dataSources",
              patches: [
                {
                  op: "add",
                  path: ["variable-1"],
                  value: {
                    id: "variable-1",
                    scopeInstanceId: "body-1",
                    name: "title",
                    type: "variable",
                    value: { type: "string", value: "" },
                  },
                },
              ],
            },
          ],
        }),
      ],
    });

    expect(result).toMatchObject({
      status: "ok",
      nextVersion: 4,
      update: {
        lastTransactionId: "tx-1",
        version: 4,
      },
    });
    if (result.status === "ok") {
      expect(JSON.parse(result.update?.dataSources ?? "")).toEqual([
        {
          id: "variable-1",
          scopeInstanceId: "body-1",
          name: "title",
          type: "variable",
          value: { type: "string", value: "" },
        },
      ]);
    }
  });

  test("persists project settings without modifying pages storage", async () => {
    const result = await createBuildPatchUpdate({
      build: buildRow,
      clientVersion: 3,
      transactions: [
        transaction({
          payload: [
            {
              namespace: "projectSettings",
              patches: [
                {
                  op: "add",
                  path: ["meta", "agentInstructions"],
                  value: "Use existing components.",
                },
              ],
            },
          ],
        }),
      ],
    });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.update).toBeDefined();
      if (result.update === undefined) {
        throw new Error("Expected project settings update");
      }
      expect(result.update.pages).toBeUndefined();
      expect(
        JSON.parse(result.update.projectSettings as string).meta
      ).toMatchObject({
        agentInstructions: "Use existing components.",
      });
    }
  });

  test("persists an explicitly cleared marketplace product", async () => {
    const result = await createBuildPatchUpdate({
      build: {
        ...buildRow,
        marketplaceProduct: JSON.stringify({
          category: "sectionTemplates",
          name: "Example section",
          thumbnailAssetId: "thumbnail",
          author: "Webstudio",
          email: "hello@example.com",
          website: "",
          issues: "",
          description: "Example marketplace product",
        }),
      },
      clientVersion: 3,
      transactions: [
        transaction({
          payload: [
            {
              namespace: "marketplaceProduct",
              patches: [{ op: "replace", path: [], value: undefined }],
            },
          ],
        }),
      ],
    });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(JSON.parse(result.update?.marketplaceProduct ?? "null")).toEqual(
        {}
      );
    }
  });

  test("validates only touched props while preserving untouched props", async () => {
    const buildWithInvalidUntouchedProp = {
      ...buildRow,
      props: JSON.stringify([
        {
          id: "prop-1",
          instanceId: "body-1",
          name: "title",
          type: "string",
          value: "Old title",
        },
        {
          id: "prop-invalid",
          instanceId: "body-1",
          name: "count",
          type: "number",
          value: "invalid number",
        },
      ]),
    };

    const result = await createBuildPatchUpdate({
      build: buildWithInvalidUntouchedProp,
      clientVersion: 3,
      transactions: [transaction()],
    });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(JSON.parse(result.update?.props ?? "")).toEqual([
        {
          id: "prop-1",
          instanceId: "body-1",
          name: "title",
          type: "string",
          value: "New title",
        },
        {
          id: "prop-invalid",
          instanceId: "body-1",
          name: "count",
          type: "number",
          value: "invalid number",
        },
      ]);
    }
  });

  test("rejects invalid touched props", async () => {
    await expect(
      createBuildPatchUpdate({
        build: buildRow,
        clientVersion: 3,
        transactions: [
          transaction({
            payload: [
              {
                namespace: "props",
                patches: [
                  {
                    op: "replace",
                    path: ["prop-1", "value"],
                    value: 123,
                  },
                ],
              },
            ],
          }),
        ],
      })
    ).rejects.toThrow();
  });

  test("rejects touched props set to undefined", async () => {
    await expect(
      createBuildPatchUpdate({
        build: buildRow,
        clientVersion: 3,
        transactions: [
          transaction({
            payload: [
              {
                namespace: "props",
                patches: [
                  {
                    op: "replace",
                    path: ["prop-1"],
                    value: undefined,
                  },
                ],
              },
            ],
          }),
        ],
      })
    ).rejects.toThrow();
  });

  test("validates all props when patch replaces the props map", async () => {
    await expect(
      createBuildPatchUpdate({
        build: buildRow,
        clientVersion: 3,
        transactions: [
          transaction({
            payload: [
              {
                namespace: "props",
                patches: [
                  {
                    op: "replace",
                    path: [],
                    value: new Map([
                      [
                        "prop-invalid",
                        {
                          id: "prop-invalid",
                          instanceId: "body-1",
                          name: "count",
                          type: "number",
                          value: "invalid number",
                        },
                      ],
                    ]),
                  },
                ],
              },
            ],
          }),
        ],
      })
    ).rejects.toThrow();
  });

  test("rejects touched styles set to undefined", async () => {
    const style = {
      styleSourceId: "style-source-1",
      breakpointId: "breakpoint-1",
      property: "width",
      value: { type: "unit", value: 10, unit: "px" },
    };
    const buildWithStyle = {
      ...buildRow,
      styles: JSON.stringify([style]),
    };
    const styleKey = "style-source-1:breakpoint-1:width:";

    await expect(
      createBuildPatchUpdate({
        build: buildWithStyle,
        clientVersion: 3,
        transactions: [
          transaction({
            payload: [
              {
                namespace: "styles",
                patches: [
                  {
                    op: "replace",
                    path: [styleKey],
                    value: undefined,
                  },
                ],
              },
            ],
          }),
        ],
      })
    ).rejects.toThrow();
  });

  test("validates only touched instances while preserving untouched instances", async () => {
    const buildWithInvalidUntouchedInstance = {
      ...buildRow,
      instances: JSON.stringify([
        {
          id: "body-1",
          type: "instance",
          component: "Body",
          children: [],
        },
        {
          id: "instance-invalid",
          type: "instance",
          children: [],
        },
      ]),
    };

    const result = await createBuildPatchUpdate({
      build: buildWithInvalidUntouchedInstance,
      clientVersion: 3,
      transactions: [
        transaction({
          payload: [
            {
              namespace: "instances",
              patches: [
                {
                  op: "add",
                  path: ["body-1", "label"],
                  value: "Body label",
                },
              ],
            },
          ],
        }),
      ],
    });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(JSON.parse(result.update?.instances ?? "")).toEqual([
        {
          id: "body-1",
          type: "instance",
          component: "Body",
          label: "Body label",
          children: [],
        },
        {
          id: "instance-invalid",
          type: "instance",
          children: [],
        },
      ]);
    }
  });

  test("rejects invalid touched instances", async () => {
    await expect(
      createBuildPatchUpdate({
        build: buildRow,
        clientVersion: 3,
        transactions: [
          transaction({
            payload: [
              {
                namespace: "instances",
                patches: [
                  {
                    op: "remove",
                    path: ["body-1", "component"],
                  },
                ],
              },
            ],
          }),
        ],
      })
    ).rejects.toThrow();
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
    const assetPatch = { op: "add" as const, path: ["asset-1"], value: {} };
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
