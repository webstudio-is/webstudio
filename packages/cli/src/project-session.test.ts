import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createBuilderStateFromSnapshot } from "@webstudio-is/project-build/state/adapters";
import { createBuilderStateFreshness } from "@webstudio-is/project-build/state/freshness";
import {
  createCliProjectSessionStorage,
  createCliProjectSessionTransport,
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

describe("cli project session transport", () => {
  test("adapts public API build snapshots into project-session state", async () => {
    const transport = createCliProjectSessionTransport({
      connection: {
        projectId: "project-1",
        origin: "https://example.com",
        authToken: "token",
      },
      getBuildSnapshot: async (input) => {
        expect(input.include).toEqual(["pages", "folders", "instances"]);
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
          homePageId: "home",
          rootFolderId: "root",
          meta: { siteName: "Acme" },
          compiler: { atomicStyles: true },
          redirects: [{ old: "/old", new: "/new", status: "301" }],
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
      namespaces: ["pages", "instances"],
    });

    expect(snapshot.state.pages?.pages.get("home")?.name).toBe("Home");
    expect(snapshot.state.pages?.meta).toEqual({ siteName: "Acme" });
    expect(snapshot.state.pages?.compiler).toEqual({ atomicStyles: true });
    expect(snapshot.state.pages?.redirects).toEqual([
      { old: "/old", new: "/new", status: "301" },
    ]);
    expect(snapshot.state.pages?.folders.get("root")?.children).toEqual([
      "home",
    ]);
    expect(snapshot.state.instances?.get("body")?.component).toBe("Body");
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
