import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createBuilderStateFromSnapshot } from "@webstudio-is/project-build/state";
import { createBuilderStateFreshness } from "@webstudio-is/project-build/state";
import { builderNamespaces } from "@webstudio-is/project-build/contracts";
import { createStructuredAssetQueryResourceBody } from "@webstudio-is/sdk";
import {
  createLocalProjectBundleFromSessionSnapshot,
  createCliProjectRestorePointStorage,
  createCliProjectSessionStorage,
  createCliProjectSessionTransport,
  createIssueReportFailure,
  addIssueReportRuntime,
  getCliServerApiContract,
  getCliProjectSessionFile,
  getCliProjectRestorePointsFile,
  getSupportedPublicApiOperations,
  loadCliProjectSessionAssetIndex,
  writeCliProjectSessionPreviewDataFile,
} from "./project-session";

test("adds anonymous local runtime metadata only to issue reports", () => {
  const report = { title: "test: Report transport" };
  const runtime = {
    cliVersion: "1.2.3",
    nodeVersion: "22.14.0",
    os: "linux",
    osVersion: "6",
    architecture: "arm64",
    executionMode: "mcp" as const,
    apiContractVersion: "public-api:client",
    bundleVersion: "bundle:client",
    recentFailure: {
      tool: "preview.start",
      code: "PROJECT_BUNDLE_INVALID",
      issues: [
        {
          path: ["assets", "0", "type"],
          code: "invalid_value",
          constraint: "one of supported asset types",
        },
      ],
    },
  };

  expect(addIssueReportRuntime("report-issue", report, runtime)).toEqual({
    ...report,
    runtime,
  });
  expect(addIssueReportRuntime("audit", report, runtime)).toBe(report);
});

test("keeps only anonymous structured fields from the latest tool failure", () => {
  const error = Object.assign(new Error("Asset customer-logo.png is invalid"), {
    code: "PROJECT_BUNDLE_INVALID",
    issues: [
      {
        path: ["assets", "0", "type"],
        code: "invalid_value",
        message: "Customer-specific value is unsupported",
        constraint: "one of supported asset types",
        detail: "Asset customer-logo.png belongs to project-123",
      },
    ],
  });

  expect(createIssueReportFailure("preview.start", error)).toEqual({
    tool: "preview.start",
    code: "PROJECT_BUNDLE_INVALID",
    issues: [
      {
        path: [],
        code: "invalid_value",
        constraint: "one of supported asset types",
      },
    ],
  });

  expect(
    createIssueReportFailure("unknown", {
      code: "dynamic-code",
      issues: error.issues,
    })
  ).toEqual({
    tool: "unknown",
    code: "MCP_TOOL_FAILED",
  });

  expect(
    createIssueReportFailure("insert-fragment", {
      code: "INVALID_INPUT",
      issues: [
        {
          path: ["fragment"],
          code: "invalid_webstudio_jsx",
          message: "Fragment contains private project content",
          constraint: "valid_webstudio_jsx_syntax",
          detail: "Unexpected token near customer data",
        },
      ],
    })
  ).toEqual({
    tool: "insert-fragment",
    code: "INVALID_INPUT",
    issues: [
      {
        path: [],
        code: "invalid_webstudio_jsx",
        constraint: "valid_webstudio_jsx_syntax",
      },
    ],
  });

  const sensitiveKey = "customer-secret-key";
  const serialized = JSON.stringify(
    createIssueReportFailure("update-styles", {
      code: "INVALID_INPUT",
      issues: [
        {
          path: ["updates", "0", sensitiveKey],
          code: "invalid_type",
          message: "Expected string",
          constraint: "type:string",
        },
      ],
    })
  );
  expect(serialized).not.toContain(sensitiveKey);
  expect(JSON.parse(serialized).issues[0].path).toEqual([]);
});

test("scopes project session files for explicitly selected projects", () => {
  expect(getCliProjectSessionFile("/workspace", "project/a")).toBe(
    "/workspace/.webstudio/projects/project%2Fa/project-session.json"
  );
  expect(getCliProjectSessionFile("/workspace")).toBe(
    "/workspace/.webstudio/project-session.json"
  );
  expect(getCliProjectRestorePointsFile("/workspace", "project/a")).toBe(
    "/workspace/.webstudio/projects/project%2Fa/restore-points.json"
  );
});

const temporaryDirectories: string[] = [];
const previewConnection = {
  projectId: "project",
  origin: "https://example.com",
  authToken: "token",
};

const createAssetPreviewSnapshot = (contentSize = 0) => {
  const resource = {
    id: "posts",
    name: "Posts",
    control: "system" as const,
    method: "post" as const,
    url: '"/$resources/assets"',
    headers: [],
    body: createStructuredAssetQueryResourceBody({
      where: { all: [] },
      sort: [],
      limit: "10",
      offset: "0",
      output: { mode: "all", includeMetadata: true },
      content: { mode: "none" },
    }),
  };
  return {
    projectId: "project",
    state: {
      resources: new Map([[resource.id, resource]]),
      props: new Map([
        ["prop", { id: "prop", type: "resource", value: resource.id }],
      ]),
      assets: new Map([
        [
          "post",
          {
            id: "post",
            projectId: "project",
            type: "file",
            name: "post_hash.md",
            filename: "post",
            size: contentSize,
            description: null,
            createdAt: "2026-07-27T00:00:00.000Z",
            format: "md",
            meta: {},
          },
        ],
      ]),
      assetFolders: new Map(),
    },
  } as never;
};

test("skips the preview index without configured Assets resources", async () => {
  await expect(
    loadCliProjectSessionAssetIndex(
      { projectId: "project", state: { resources: new Map() } } as never,
      previewConnection
    )
  ).resolves.toBeUndefined();
});

test("downloads preview index assets when the local directory is missing", async () => {
  const projectDirectory = await createTemporaryDirectory();
  const assetsDirectory = join(projectDirectory, "assets");
  const content = "---\ntitle: Hello\n---\nBody";
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(content))
  );

  await expect(
    loadCliProjectSessionAssetIndex(
      createAssetPreviewSnapshot(content.length),
      previewConnection,
      assetsDirectory
    )
  ).resolves.toMatchObject({
    documents: [{ _id: "post", properties: { title: "Hello" } }],
  });
  await expect(
    readFile(join(assetsDirectory, "post_hash.md"), "utf8")
  ).resolves.toBe(content);
});

test("explains how to recover when preview assets cannot be downloaded", async () => {
  const projectDirectory = await createTemporaryDirectory();
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () => new Response("", { status: 404, statusText: "Not Found" })
    )
  );
  await expect(
    loadCliProjectSessionAssetIndex(
      createAssetPreviewSnapshot(),
      previewConnection,
      join(projectDirectory, "assets")
    )
  ).rejects.toMatchObject({
    code: "PREVIEW_ASSET_DOWNLOAD_FAILED",
    message:
      "Could not download assets required for preview. Restore network and project asset access, then retry preview.start.",
  });
});

const createTemporaryDirectory = async () => {
  const directory = await mkdtemp(join(tmpdir(), "webstudio-session-"));
  temporaryDirectories.push(directory);
  return directory;
};

afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe("cli project session storage", () => {
  test.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid restore point retention %s",
    (maxPoints) => {
      expect(() =>
        createCliProjectRestorePointStorage("restore-points.json", maxPoints)
      ).toThrow("Restore point retention must be a positive integer");
    }
  );

  test("persists named restore points and hydrates Map namespaces", async () => {
    const directory = await createTemporaryDirectory();
    const storage = createCliProjectRestorePointStorage(
      join(directory, ".webstudio", "restore-points.json")
    );
    const state = createBuilderStateFromSnapshot({
      instances: [
        [
          "body",
          { type: "instance", id: "body", component: "Body", children: [] },
        ],
      ],
    });
    const snapshot = {
      projectId: "project-1",
      buildId: "build-1",
      version: 3,
      state,
      freshness: createBuilderStateFreshness({ state, version: 3 }),
      compatibilityVersion: "test",
      compatibility: {
        sessionVersion: "test",
        runtimeContractVersion: "test-runtime",
        projectSchemaVersion: "test-schema",
      },
    };

    const created = await storage.create("Before redesign", snapshot);
    expect(await storage.list()).toEqual([created]);
    expect((await storage.get(created.id))?.state.instances).toBeInstanceOf(
      Map
    );

    const concurrentNames = Array.from(
      { length: 20 },
      (_, index) => `Concurrent ${index}`
    );
    const secondStorage = createCliProjectRestorePointStorage(
      join(directory, ".webstudio", "restore-points.json")
    );
    await Promise.all(
      concurrentNames.map((name, index) =>
        (index % 2 === 0 ? storage : secondStorage).create(name, snapshot)
      )
    );
    const retained = await storage.list();
    expect(retained).toHaveLength(20);
    expect(retained.map((point) => point.name).sort()).toEqual(
      concurrentNames.sort()
    );

    expect(await storage.delete(retained[0].id)).toBe(true);
    expect(await storage.delete(retained[0].id)).toBe(false);
    expect(await storage.list()).toHaveLength(19);
  });

  test("persists session state without the Web Crypto global", async () => {
    vi.stubGlobal("crypto", undefined);
    const directory = await createTemporaryDirectory();
    const state = createBuilderStateFromSnapshot({});
    const snapshot = {
      projectId: "project-1",
      buildId: "build-1",
      version: 1,
      state,
      freshness: createBuilderStateFreshness({ state, version: 1 }),
      compatibilityVersion: "test",
      compatibility: {
        sessionVersion: "test",
        runtimeContractVersion: "test-runtime",
        projectSchemaVersion: "test-schema",
      },
    };

    await expect(
      createCliProjectSessionStorage(
        join(directory, ".webstudio", "project-session.json")
      ).save(snapshot, {})
    ).resolves.toEqual({ revision: expect.any(String) });
    await expect(
      createCliProjectRestorePointStorage(
        join(directory, ".webstudio", "restore-points.json")
      ).create("Before mutation", snapshot)
    ).resolves.toEqual(expect.objectContaining({ id: expect.any(String) }));
  });

  test("persists builder state snapshots as JSON and checks revisions", async () => {
    const directory = await createTemporaryDirectory();
    const path = join(directory, ".webstudio", "project-session.json");
    const storage = createCliProjectSessionStorage(path);
    const state = createBuilderStateFromSnapshot({
      pages: {
        homePageId: "home",
        rootFolderId: "root",
        pages: new Map([
          [
            "home",
            {
              id: "home",
              name: "Home",
              path: "",
              title: "Home",
              rootInstanceId: "body",
              meta: {},
            },
          ],
        ]),
        folders: new Map([
          ["root", { id: "root", name: "Root", slug: "", children: ["home"] }],
        ]),
      },
      instances: [
        [
          "body",
          { type: "instance", id: "body", component: "Body", children: [] },
        ],
      ],
    });

    const first = await storage.save(
      {
        projectId: "project-1",
        buildId: "build-1",
        version: 1,
        state,
        freshness: createBuilderStateFreshness({ state, version: 1 }),
        compatibilityVersion: "test",
        compatibility: {
          sessionVersion: "test",
          runtimeContractVersion: "test-runtime",
          projectSchemaVersion: "test-schema",
        },
      },
      {}
    );

    const persisted = await storage.load();
    expect(persisted?.state.pages?.pages.has("home")).toBe(true);
    expect(persisted?.state.instances?.has("body")).toBe(true);
    const saved = JSON.parse(await readFile(path, "utf-8"));

    expect(saved.state.pages.pages).toEqual([
      {
        id: "home",
        name: "Home",
        path: "",
        title: "Home",
        rootInstanceId: "body",
        meta: {},
      },
    ]);
    expect(saved.state.pages.folders).toEqual([
      { id: "root", name: "Root", slug: "", children: ["home"] },
    ]);
    expect(saved.state.instances).toEqual([
      [
        "body",
        { type: "instance", id: "body", component: "Body", children: [] },
      ],
    ]);

    await expect(
      storage.save(
        {
          ...persisted!,
          version: 2,
        },
        { expectedRevision: "stale" }
      )
    ).rejects.toThrow("changed on disk");

    await expect(
      storage.save(
        {
          ...persisted!,
          version: 2,
        },
        { expectedRevision: first?.revision }
      )
    ).resolves.toEqual({ revision: expect.any(String) });
  });
});

describe("CLI/server operation contract", () => {
  const connection = {
    projectId: "project-1",
    origin: "https://example.com",
    authToken: "token",
  };

  test("uses the server operation catalog to hide unsupported server-only operations", async () => {
    const contract = await getCliServerApiContract(connection, async () => ({
      apiContract: {
        version: "public-api:server",
        operationIds: ["auth.me"],
      },
    }));

    expect(contract).toMatchObject({
      serverVersion: "public-api:server",
      negotiated: true,
    });
    expect(contract.supportedOperationIds.has("auth.me")).toBe(true);
    expect(
      getSupportedPublicApiOperations(contract).some(
        (operation) => operation.id === "auth.me"
      )
    ).toBe(true);
    expect(
      getSupportedPublicApiOperations(contract).some(
        (operation) => operation.serverOnly && operation.id !== "auth.me"
      )
    ).toBe(false);
  });

  test("keeps established local operations on legacy servers but hides new routed operations", async () => {
    const contract = await getCliServerApiContract(connection, async () => ({
      canView: true,
    }));
    const operations = getSupportedPublicApiOperations(contract);

    expect(contract.negotiated).toBe(false);
    expect(
      operations.some((operation) => operation.command === "list-pages")
    ).toBe(true);
    expect(
      operations.some((operation) => operation.command === "insert-component")
    ).toBe(false);
    expect(
      operations.some((operation) => operation.command === "insert-fragment")
    ).toBe(false);
    expect(operations.some((operation) => operation.serverOnly)).toBe(false);
  });
});

const previewMarketplaceProduct = {
  category: "pageTemplates" as const,
  name: "Session template",
  thumbnailAssetId: "asset-1",
  author: "Webstudio",
  email: "hello@example.com",
  website: "https://example.com",
  issues: "",
  description: "A reusable project-session template.",
};

const createPreviewSessionSnapshot = () => {
  const state = createBuilderStateFromSnapshot({
    marketplaceProduct: previewMarketplaceProduct,
    pages: {
      homePageId: "home",
      rootFolderId: "root",
      meta: { siteName: "Session Site" },
      pages: new Map([
        [
          "home",
          {
            id: "home",
            name: "Home",
            path: "",
            title: "Home",
            rootInstanceId: "body",
            meta: {},
          },
        ],
        [
          "design-system",
          {
            id: "design-system",
            name: "Design System",
            path: "/design-system",
            title: "Design System",
            rootInstanceId: "design-system-body",
            meta: {},
          },
        ],
      ]),
      folders: new Map([
        [
          "root",
          {
            id: "root",
            name: "Root",
            slug: "",
            children: ["home", "design-system"],
          },
        ],
      ]),
    },
    instances: [
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [
            { type: "id", value: "header" },
            { type: "id", value: "main" },
            { type: "id", value: "footer" },
          ],
        },
      ],
      [
        "header",
        {
          type: "instance",
          id: "header",
          component: "Box",
          children: [],
        },
      ],
      [
        "main",
        { type: "instance", id: "main", component: "Box", children: [] },
      ],
      [
        "footer",
        {
          type: "instance",
          id: "footer",
          component: "Box",
          children: [],
        },
      ],
      [
        "design-system-body",
        {
          type: "instance",
          id: "design-system-body",
          component: "Body",
          children: [],
        },
      ],
    ],
    assetFolders: [
      [
        "asset-folder",
        {
          id: "asset-folder",
          projectId: "project",
          name: "Images",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    ],
    props: [],
    styles: [],
    styleSources: [],
    styleSourceSelections: [],
    dataSources: [],
    resources: [],
    assets: [],
    breakpoints: [],
  });
  return {
    projectId: "project",
    buildId: "build",
    version: 7,
    state,
    freshness: createBuilderStateFreshness({ state, version: 7 }),
    compatibilityVersion: "test",
    compatibility: {
      sessionVersion: "test",
      runtimeContractVersion: "test-runtime",
      projectSchemaVersion: "test-schema",
    },
  };
};

test("creates preview bundle from complete project session snapshot", async () => {
  const snapshot = createPreviewSessionSnapshot();
  const assetIndex = { marker: "derived-index" } as never;
  const bundle = createLocalProjectBundleFromSessionSnapshot(snapshot, {
    origin: "https://assets.example.com",
    assetIndex,
  });

  expect(bundle.origin).toBe("https://assets.example.com");
  expect(bundle.assetIndex).toBe(assetIndex);
  expect(bundle.projectTitle).toBe("Session Site");
  expect(bundle.page.id).toBe("home");
  expect(bundle.pages.map((page) => page.path)).toEqual(["", "/design-system"]);
  expect(bundle.build.pages.pages).toEqual(bundle.pages);
  expect(bundle.build.instances.map(([id]) => id)).toEqual([
    "body",
    "header",
    "main",
    "footer",
    "design-system-body",
  ]);
  expect(bundle.build.marketplaceProduct).toEqual(previewMarketplaceProduct);
  expect(bundle.assetFolders).toEqual([
    expect.objectContaining({ id: "asset-folder", name: "Images" }),
  ]);

  const directory = await createTemporaryDirectory();
  const path = join(directory, "data.json");
  const ensureNamespaces = vi.fn(async () => snapshot);
  await writeCliProjectSessionPreviewDataFile({
    session: { ensureNamespaces },
    connection: {
      projectId: "project",
      origin: "https://assets.example.com",
      authToken: "token",
    },
    path,
    assetsDirectory: directory,
  });

  expect(ensureNamespaces).toHaveBeenCalledWith(builderNamespaces);
  const written = JSON.parse(await readFile(path, "utf8")) as {
    build: {
      instances: Array<[string, { children: Array<{ value: string }> }]>;
      styles: unknown[];
    };
  };
  expect(
    written.build.instances[0]?.[1].children.map(({ value }) => value)
  ).toEqual(["header", "main", "footer"]);
  expect(written.build.styles).toEqual([]);
});

test("rejects incomplete project session snapshots before preview generation", () => {
  const snapshot = createPreviewSessionSnapshot();
  snapshot.state.styles = undefined;

  expect(() => createLocalProjectBundleFromSessionSnapshot(snapshot)).toThrow(
    "Project session is missing preview data: styles"
  );
});

describe("cli project session transport", () => {
  test("preserves JSON gateway status when mapping remote error codes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify([
              {
                error: {
                  message: "Gateway Timeout",
                  code: -32603,
                  data: {
                    code: "INTERNAL_SERVER_ERROR",
                    httpStatus: 504,
                    path: "builderApi.apply-patch",
                  },
                },
              },
            ]),
            {
              status: 504,
              headers: { "content-type": "application/json" },
            }
          )
      )
    );
    const transport = createCliProjectSessionTransport({
      connection: {
        projectId: "project-1",
        origin: "https://example.com",
        authToken: "token",
      },
    });

    await expect(
      transport.commitPatch({
        projectId: "project-1",
        buildId: "build-1",
        baseVersion: 1,
        transactions: [],
      })
    ).rejects.toMatchObject({
      name: "INTERNAL_SERVER_ERROR",
      code: "INTERNAL_SERVER_ERROR",
      cause: {
        data: {
          code: "INTERNAL_SERVER_ERROR",
          httpStatus: 504,
        },
      },
    });
  });

  test("adapts public API build snapshots into project-session state", async () => {
    const transport = createCliProjectSessionTransport({
      connection: {
        projectId: "project-1",
        origin: "https://example.com",
        authToken: "token",
      },
      getBuildSnapshot: async (input) => {
        expect(input.include).toEqual([
          "pages",
          "folders",
          "instances",
          "projectSettings",
        ]);
        return {
          projectId: "project-1",
          buildId: "build-1",
          version: 1,
          pages: [
            {
              id: "home",
              name: "Home",
              path: "",
              title: "Home",
              rootInstanceId: "body",
              meta: {},
            },
          ],
          pageTemplates: [
            {
              id: "template-1",
              name: "Landing",
              title: "Landing",
              rootInstanceId: "template-body",
              meta: {},
            },
          ],
          homePageId: "home",
          rootFolderId: "root",
          meta: { siteName: "Acme" },
          compiler: { atomicStyles: true },
          redirects: [{ old: "/old", new: "/new", status: "301" }],
          projectSettings: {
            meta: { siteName: "Canonical Acme" },
            compiler: { atomicStyles: false },
          },
          folders: [
            {
              id: "root",
              name: "Root",
              slug: "",
              children: ["home"],
            },
          ],
          instances: [
            {
              type: "instance",
              id: "body",
              component: "Body",
              children: [],
            },
          ],
        };
      },
    });

    const snapshot = await transport.fetchNamespaces({
      projectId: "project-1",
      namespaces: ["pages", "instances", "projectSettings"],
    });

    expect(snapshot.state.pages?.pages.get("home")?.name).toBe("Home");
    expect(snapshot.state.pages?.pageTemplates?.get("template-1")?.name).toBe(
      "Landing"
    );
    expect(snapshot.state.pages?.meta).toBeUndefined();
    expect(snapshot.state.pages?.compiler).toBeUndefined();
    expect(snapshot.state.pages?.redirects).toEqual([
      { old: "/old", new: "/new", status: "301" },
    ]);
    expect(snapshot.state.pages?.folders.get("root")?.children).toEqual([
      "home",
    ]);
    expect(snapshot.state.instances?.get("body")?.component).toBe("Body");
    expect(snapshot.state.projectSettings).toEqual({
      meta: { siteName: "Canonical Acme" },
      compiler: { atomicStyles: false },
    });
  });

  test("falls back to legacy page settings when the server rejects projectSettings", async () => {
    const includes: unknown[] = [];
    const transport = createCliProjectSessionTransport({
      connection: {
        projectId: "project-1",
        origin: "https://example.com",
        authToken: "token",
      },
      getBuildSnapshot: async (input) => {
        includes.push(input.include);
        if (input.include?.includes("projectSettings")) {
          throw new Error(
            'invalid_enum_value: received "projectSettings", expected one of pages|folders'
          );
        }
        return {
          projectId: "project-1",
          buildId: "build-1",
          version: 1,
          pages: [
            {
              id: "home",
              name: "Home",
              path: "",
              title: "Home",
              rootInstanceId: "body",
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
          homePageId: "home",
          rootFolderId: "root",
          meta: { siteName: "Legacy Acme" },
          compiler: { atomicStyles: true },
        };
      },
    });

    const snapshot = await transport.fetchNamespaces({
      projectId: "project-1",
      namespaces: ["projectSettings"],
    });

    expect(includes).toEqual([["projectSettings"], ["pages", "folders"]]);
    expect(snapshot.state.projectSettings).toEqual({
      meta: { siteName: "Legacy Acme" },
      compiler: { atomicStyles: true },
    });
  });

  test("does not hide unrelated snapshot errors", async () => {
    const getBuildSnapshot = vi.fn(async () => {
      throw new Error("Network unavailable");
    });
    const transport = createCliProjectSessionTransport({
      connection: {
        projectId: "project-1",
        origin: "https://example.com",
        authToken: "token",
      },
      getBuildSnapshot,
    });

    await expect(
      transport.fetchNamespaces({
        projectId: "project-1",
        namespaces: ["projectSettings"],
      })
    ).rejects.toThrow("Network unavailable");
    expect(getBuildSnapshot).toHaveBeenCalledTimes(1);
  });

  test("adapts injected permission reader to project session transport", async () => {
    const transport = createCliProjectSessionTransport({
      connection: {
        projectId: "project-1",
        origin: "https://example.com",
        authToken: "token",
      },
      getPermissions: async (input) => {
        expect(input).toEqual({ projectId: "project-1" });
        return {
          canView: true,
          canEdit: false,
          canBuild: false,
          canAdmin: false,
          canUseApi: true,
        };
      },
    });

    await expect(
      transport.getPermissions?.({ projectId: "project-1" })
    ).resolves.toEqual({
      canView: true,
      canEdit: false,
      canBuild: false,
      canAdmin: false,
      canUseApi: true,
    });
  });

  test("reports transport compatibility metadata", async () => {
    const transport = createCliProjectSessionTransport({
      connection: {
        projectId: "project-1",
        origin: "https://example.com",
        authToken: "token",
        headers: { "x-webstudio-client-version": "1.2.3" },
      },
    });

    await expect(
      transport.getCompatibility?.({ projectId: "project-1" })
    ).resolves.toEqual(
      expect.objectContaining({
        sessionVersion: "cli-project-session-v1",
        apiCompatibilityVersion: "1.2.3",
      })
    );
  });

  test("keeps configured project id for default server operation transport", async () => {
    let requestBody = "";
    let requestUrl = "";
    const fetch = vi.fn(async (request: URL | RequestInfo) => {
      if (request instanceof Request) {
        requestUrl = request.url;
        requestBody = await request.clone().text();
      } else {
        requestUrl = String(request);
      }
      return new Response(
        JSON.stringify([
          {
            result: {
              data: {
                id: "project-1",
                buildId: "build-1",
                version: 1,
              },
            },
          },
        ]),
        { headers: { "content-type": "application/json" } }
      );
    });
    vi.stubGlobal("fetch", fetch);
    const transport = createCliProjectSessionTransport({
      connection: {
        projectId: "project-1",
        origin: "https://example.com",
        authToken: "token",
      },
    });

    await transport.executeServerOperation?.({
      operationId: "projects.get",
      input: { projectId: "other-project" },
    });

    const requestText = `${requestUrl}\n${requestBody}`;
    expect(requestText).toContain("project-1");
    expect(requestText).not.toContain("other-project");
  });

  test("adds anonymous runtime metadata to issue report requests", async () => {
    let requestBody = "";
    const fetch = vi.fn(
      async (request: URL | RequestInfo, init?: RequestInit) => {
        if (request instanceof Request) {
          requestBody = await request.clone().text();
        } else if (typeof init?.body === "string") {
          requestBody = init.body;
        }
        return new Response(
          JSON.stringify([
            {
              result: {
                data: {
                  status: "created",
                  issueNumber: 1,
                  issueUrl: "https://example.com/issues/1",
                },
              },
            },
          ]),
          { headers: { "content-type": "application/json" } }
        );
      }
    );
    vi.stubGlobal("fetch", fetch);
    const transport = createCliProjectSessionTransport({
      connection: {
        projectId: "project-1",
        origin: "https://example.com",
        authToken: "token",
      },
    });

    await transport.executeServerOperation?.({
      operationId: "reports.issue",
      input: {
        trigger: "user-requested",
        category: "tool-failure",
        deduplicationKey: "report-runtime",
        title: "fix: Include report runtime",
        agent: {
          client: "Codex",
          model: "test-model",
          reasoningEffort: "medium",
        },
        report: {
          userStory: "Use issue reporting.",
          summary: "Runtime metadata was omitted.",
          attemptedWorkflow: ["Submit an issue report."],
          expectedBehavior: "The report includes runtime metadata.",
          actualResult: "The report omitted runtime metadata.",
          recoveryAttempts: ["Inspect the created issue."],
          userImpact: "The report is harder to diagnose.",
          technicalContext: "The CLI transport submitted the report.",
          acceptanceCriteria: ["The report includes runtime metadata."],
        },
      },
    });

    const body = JSON.parse(requestBody) as {
      0: { runtime?: Record<string, unknown> };
    };
    expect(body[0].runtime).toEqual({
      cliVersion: expect.any(String),
      nodeVersion: process.versions.node,
      os: process.platform,
      osVersion: expect.any(String),
      architecture: process.arch,
      executionMode: "mcp",
      apiContractVersion: expect.any(String),
      bundleVersion: expect.any(String),
    });
  });
});
