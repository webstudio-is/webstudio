import { expect, test, vi } from "vitest";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "@remix-run/server-runtime";
import type { Client } from "@webstudio-is/postgrest/index.server";
import type { Asset } from "@webstudio-is/sdk";
import { loader } from "../routes/rest.page-copy.content";
import { createPageCopyContentAction } from "./page-copy-content-route.server";
import {
  getGrantedAssetRevisions,
  isCurrentPageCopyGrant,
} from "./page-copy-grant.server";

const source = {
  projectId: "source",
  pageId: "page",
  assetIds: ["image"],
  buildId: "build",
  version: 8,
  purpose: "webstudio.page-copy.read.v2" as const,
  exp: 2_000_000_000,
};

const routeArgs = (request: Request) => ({ request, params: {}, context: {} });

test("answers a credentialless JSON grant preflight", () => {
  const response = loader(
    routeArgs(
      new Request("https://source.example/rest/page-copy/content", {
        method: "OPTIONS",
        headers: {
          origin: "https://destination.example",
          "access-control-request-method": "POST",
          "access-control-request-headers": "content-type",
        },
      })
    ) as LoaderFunctionArgs
  );
  expect(response.status).toBe(204);
  expect(response.headers.get("access-control-allow-origin")).toBe("*");
  expect(response.headers.get("access-control-allow-methods")).toBe("POST");
  expect(response.headers.get("access-control-allow-headers")).toBe(
    "Content-Type"
  );
  expect(response.headers.has("access-control-allow-credentials")).toBe(false);
});

test.each(["manifest", "asset"] as const)(
  "rejects stale grant %s requests before accessing files",
  async (kind) => {
    const current = { id: "build", version: 9 };
    const maybeSingle = vi.fn(async () => ({ data: current, error: null }));
    const query = {
      select: () => query,
      eq: () => query,
      is: () => query,
      order: () => query,
      limit: () => query,
      maybeSingle,
    };
    const client = { from: () => query } as unknown as Client;
    const folders = [
      {
        id: "images",
        projectId: "source",
        name: "Images",
        createdAt: "2026-11-17T00:00:00.000Z",
      },
    ];
    const loadAssets = vi.fn(
      async (): Promise<Asset[]> => [
        {
          id: "image",
          projectId: "source",
          name: "image.png",
          folderId: "images",
          format: "png",
          type: "image",
          size: 1,
          createdAt: "2026-11-17T00:00:00.000Z",
          description: null,
          meta: { width: 10, height: 10 },
        },
      ]
    );
    const readFile = vi.fn(async () => ({
      data: (async function* () {
        yield new Uint8Array([1]);
      })(),
    }));
    const scopedRevisions = getGrantedAssetRevisions(
      await loadAssets(),
      folders
    );
    loadAssets.mockClear();
    const action = createPageCopyContentAction({
      readGrant: async (grant) =>
        grant === "scoped-grant"
          ? { ...source, assetRevisions: scopedRevisions }
          : undefined,
      isCurrent: isCurrentPageCopyGrant,
      getClient: () => client,
      loadAssets,
      loadFolders: async () => folders,
      getStorageScope: () => "source-scope",
      readFile,
    });
    const request = (grant: string, expectedName = "image.png") =>
      new Request("https://source.example/rest/page-copy/content", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "account=ignored",
        },
        body: JSON.stringify({
          grant,
          kind,
          assetId: "image",
          expectedName,
        }),
      });
    const invalid = await action(
      routeArgs(request("wrong-grant")) as ActionFunctionArgs
    );
    expect(invalid.status).toBe(403);
    expect(maybeSingle).not.toHaveBeenCalled();
    const response = await action(
      routeArgs(request("scoped-grant")) as ActionFunctionArgs
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ code: "PAGE_COPY_SOURCE_STALE" });
    expect(loadAssets).not.toHaveBeenCalled();
    expect(readFile).not.toHaveBeenCalled();

    current.version = source.version;
    const [asset] = await loadAssets();
    loadAssets.mockResolvedValueOnce([
      { ...asset, name: "different-file.png" },
    ]);
    const staleAsset = await action(
      routeArgs(
        request("scoped-grant", "different-file.png")
      ) as ActionFunctionArgs
    );
    expect(staleAsset.status).toBe(409);
    expect(readFile).not.toHaveBeenCalled();
    folders[0].name = "Moved images";
    const stalePath = await action(
      routeArgs(request("scoped-grant")) as ActionFunctionArgs
    );
    expect(stalePath.status).toBe(409);
    expect(readFile).not.toHaveBeenCalled();
    folders[0].name = "Images";
    if (kind === "manifest") {
      const valid = await action(
        routeArgs(request("scoped-grant")) as ActionFunctionArgs
      );
      expect(valid.status).toBe(200);
      expect(await valid.json()).toMatchObject({
        source: { buildId: "build", version: 8 },
      });
    }
  }
);

test("the Vite development server passes only the page-copy preflight to its route", async () => {
  const { createServer } = await import("vite");
  const { builderDevCors } = await import("../../dev/cors");
  const server = await createServer({
    configFile: false,
    server: {
      cors: builderDevCors as never,
      host: "127.0.0.1",
      port: 0,
      hmr: false,
    },
    optimizeDeps: { noDiscovery: true },
    plugins: [
      {
        name: "test-grant-preflight",
        configureServer(server) {
          return () =>
            server.middlewares.use((request, response, next) => {
              if (
                request.method !== "OPTIONS" ||
                request.url !== "/rest/page-copy/content"
              ) {
                next();
                return;
              }
              const reply = loader({
                params: {},
                context: {},
                request: new Request(
                  "http://localhost/rest/page-copy/content",
                  {
                    method: "OPTIONS",
                  }
                ),
              });
              response
                .writeHead(reply.status, Object.fromEntries(reply.headers))
                .end();
            });
        },
      },
    ],
  });
  try {
    await server.listen();
    const address = server.httpServer?.address();
    if (typeof address !== "object" || address === null) {
      throw new Error("Vite test server did not bind an HTTP port");
    }
    const options = {
      method: "OPTIONS",
      headers: {
        origin: "https://destination.example",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
    };
    const port = address.port;
    const allowed = await fetch(
      `http://127.0.0.1:${port}/rest/page-copy/content`,
      options
    );
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("access-control-allow-origin")).toBe("*");
    expect(allowed.headers.has("access-control-allow-credentials")).toBe(false);
    const denied = await fetch(
      `http://127.0.0.1:${port}/rest/page-copy/destination`,
      options
    );
    expect(denied.status).toBe(405);
  } finally {
    await server.close();
  }
});

test("renewal derives all 500 Asset IDs from the verified old grant", async () => {
  const { createPageCopyGrantAction } =
    await import("./page-copy-grant-route.server");
  const { createDefaultPages } = await import("@webstudio-is/project-build");
  const assets = Array.from(
    { length: 500 },
    (_, index): Asset => ({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      projectId: source.projectId,
      name: `image-${index}.png`,
      format: "png",
      type: "image",
      size: 1,
      createdAt: "2026-11-17T00:00:00.000Z",
      description: null,
      meta: { width: 10, height: 10 },
    })
  );
  const grant = "x".repeat(68 * 1024);
  const loadAssets = vi.fn(async () => assets);
  const assetRevisions = getGrantedAssetRevisions(assets, []);
  const readRenewal = vi.fn(async () => ({
    ...source,
    assetIds: assets.map(({ id }) => id),
    assetRevisions,
  }));
  const action = createPageCopyGrantAction({
    authorize: async () => ({ postgrest: { client: {} } }) as never,
    checkCsrf: async () => undefined,
    getStorageScope: () => "source-scope",
    readRenewal,
    loadAssets,
    loadFolders: async () => [],
    loadBuild: async () =>
      ({
        id: source.buildId,
        version: source.version,
        pages: createDefaultPages({
          homePageId: source.pageId,
          rootInstanceId: "body",
        }),
      }) as never,
    signGrant: async () => "fresh-grant",
  });
  const result = await action(
    routeArgs(
      new Request("https://source.example/rest/page-copy/grant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "sec-fetch-site": "same-origin",
        },
        body: JSON.stringify({
          projectId: source.projectId,
          pageId: source.pageId,
          renewGrant: grant,
        }),
      })
    ) as ActionFunctionArgs
  );

  expect(result.status).toBe(200);
  expect(await result.json()).toMatchObject({
    grant: "fresh-grant",
    version: source.version,
  });
  expect(readRenewal).toHaveBeenCalledWith(grant);
  expect(loadAssets).toHaveBeenCalledWith(
    source.projectId,
    {},
    assets.map(({ id }) => id)
  );
});
