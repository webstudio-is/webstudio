import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createBuilderStateFromSnapshot } from "@webstudio-is/project-build/state";
import { createBuilderStateFreshness } from "@webstudio-is/project-build/state";
import {
  createLocalProjectBundleFromSessionSnapshot,
  createCliProjectSessionStorage,
  createCliProjectSessionTransport,
  getCliServerApiContract,
  getSupportedPublicApiOperations,
} from "./project-session";

const temporaryDirectories: string[] = [];

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

test("creates preview bundle from project session snapshot", () => {
  const marketplaceProduct = {
    category: "pageTemplates" as const,
    name: "Session template",
    thumbnailAssetId: "asset-1",
    author: "Webstudio",
    email: "hello@example.com",
    website: "https://example.com",
    issues: "",
    description: "A reusable project-session template.",
  };
  const state = createBuilderStateFromSnapshot({
    marketplaceProduct,
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
        { type: "instance", id: "body", component: "Body", children: [] },
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
  });

  const bundle = createLocalProjectBundleFromSessionSnapshot(
    {
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
    },
    { origin: "https://assets.example.com" }
  );

  expect(bundle.origin).toBe("https://assets.example.com");
  expect(bundle.projectTitle).toBe("Session Site");
  expect(bundle.page.id).toBe("home");
  expect(bundle.pages.map((page) => page.path)).toEqual(["", "/design-system"]);
  expect(bundle.build.pages.pages).toEqual(bundle.pages);
  expect(bundle.build.instances.map(([id]) => id)).toEqual([
    "body",
    "design-system-body",
  ]);
  expect(bundle.build.marketplaceProduct).toEqual(marketplaceProduct);
});

describe("cli project session transport", () => {
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
});
