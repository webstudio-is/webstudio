import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { build } from "esbuild";
import {
  createStructuredAssetQueryResourceBody,
  encodeDataVariableId,
  encodeDataSourceVariable,
} from "@webstudio-is/sdk";
import {
  createAssetIndex,
  createCanonicalAssetFileEntry,
} from "@webstudio-is/content-engine/compiler";
import { bundleVersion } from "@webstudio-is/protocol";
import {
  createImageAssetFixture,
  createPublishedProjectBundleFixture,
} from "@webstudio-is/protocol/fixtures";
import { createFileIfNotExists, isFileExists } from "../fs-utils";
import { resolveApiConnection } from "../api-connection";
import { sync, defaultSyncDependencies } from "./sync";
import { apiCompatibilityHeaders } from "./api";
import { materializeManagedAgents } from "../managed-agents";
import { prebuild } from "../prebuild";

const originalCwd = process.cwd();
let tempDir: string;
const indicator = {
  start: vi.fn(),
  message: vi.fn(),
  stop: vi.fn(),
};
const loadProjectBundleByBuildId = vi.fn();
const loadProjectBundleByProjectId = vi.fn();
const loadCurrentProjectBundle = vi.fn();
const downloadAssetFiles = vi.fn();
const dependencies = {
  createFileIfNotExists,
  downloadAssetFiles,
  isFileExists,
  loadProjectBundleByBuildId,
  loadProjectBundleByProjectId,
  loadCurrentProjectBundle,
  readFile,
  resolveApiConnection,
  spinner: () => indicator,
  writeFile,
  materializeManagedAgents,
};

type ProjectBundleFixtureOptions = Parameters<
  typeof createPublishedProjectBundleFixture
>[0];

const createProjectBundle = (data: ProjectBundleFixtureOptions = {}) =>
  createPublishedProjectBundleFixture(data);

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "webstudio-sync-"));
  process.chdir(tempDir);
  loadProjectBundleByBuildId.mockResolvedValue(createProjectBundle());
  loadProjectBundleByProjectId.mockResolvedValue(createProjectBundle());
  loadCurrentProjectBundle.mockResolvedValue(createProjectBundle());
  downloadAssetFiles.mockResolvedValue(undefined);
  indicator.start.mockClear();
  indicator.message.mockClear();
  indicator.stop.mockClear();
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
  vi.clearAllMocks();
});

test("writes current data version after synchronizing from the API", async () => {
  loadProjectBundleByBuildId.mockResolvedValue(
    createProjectBundle({ bundleVersion: "bundle-old" })
  );

  await sync(
    {
      authToken: "token-1",
      buildId: "build-1",
      origin: "https://example.com",
    },
    dependencies
  );

  const data = JSON.parse(await readFile(".webstudio/data.json", "utf8"));

  expect(data).toMatchObject({
    build: { id: "build-1" },
    origin: "https://example.com",
    bundleVersion,
  });
  expect(indicator.stop).toHaveBeenCalledWith(
    "Project bundle synchronized successfully (AGENTS.md: unchanged). Next: webstudio build"
  );
});

test("materializes project agent instructions during sync", async () => {
  loadProjectBundleByBuildId.mockResolvedValue(
    createProjectBundle({
      build: {
        projectSettings: {
          meta: { agentInstructions: "Use existing design tokens." },
          compiler: {},
        },
      },
    })
  );

  await sync(
    {
      authToken: "token-1",
      buildId: "build-1",
      origin: "https://example.com",
    },
    dependencies
  );

  expect(await readFile("AGENTS.md", "utf8")).toContain(
    "Use existing design tokens."
  );
  expect(indicator.stop).toHaveBeenCalledWith(
    "Project bundle synchronized successfully (AGENTS.md: created). Next: webstudio build"
  );
});

test("reports a user-owned AGENTS.md conflict without overwriting it", async () => {
  await writeFile("AGENTS.md", "# User-owned\n", "utf8");
  loadProjectBundleByBuildId.mockResolvedValue(
    createProjectBundle({
      build: {
        projectSettings: {
          meta: { agentInstructions: "Use existing design tokens." },
          compiler: {},
        },
      },
    })
  );

  await sync(
    {
      authToken: "token-1",
      buildId: "build-1",
      origin: "https://example.com",
    },
    dependencies
  );

  expect(await readFile("AGENTS.md", "utf8")).toBe("# User-owned\n");
  expect(indicator.stop).toHaveBeenCalledWith(
    expect.stringContaining("AGENTS.md blocked by user-owned file")
  );
});

test("adds current bundle version when synchronizing data from old API", async () => {
  loadProjectBundleByBuildId.mockResolvedValue(
    createProjectBundle({
      bundleVersion: undefined,
      build: {
        styles: [
          [
            "style-1",
            {
              breakpointId: "breakpoint-1",
              styleSourceId: "style-source-1",
              property: "display",
              value: { type: "keyword", value: "block" },
            },
          ],
        ],
      },
    })
  );

  await sync(
    {
      authToken: "token-1",
      buildId: "build-1",
      origin: "https://example.com",
    },
    dependencies
  );

  const data = await readFile(".webstudio/data.json", "utf8");

  expect(JSON.parse(data)).toMatchObject({ bundleVersion });
  expect(data.startsWith(`{\n  "bundleVersion":`)).toBe(true);
  expect(data.indexOf(`"build"`)).toBeLessThan(data.indexOf(`"page"`));
  expect(data.indexOf(`"styleSourceId"`)).toBeLessThan(
    data.indexOf(`"breakpointId"`)
  );
});

test("downloads project bundle asset files into local project bundle", async () => {
  const assets = [createImageAssetFixture()];
  loadProjectBundleByBuildId.mockResolvedValue(createProjectBundle({ assets }));

  await sync(
    {
      authToken: "token-1",
      buildId: "build-1",
      origin: "https://example.com",
    },
    dependencies
  );

  expect(downloadAssetFiles).toHaveBeenCalledWith({
    assets,
    origin: "https://example.com",
  });
  expect(indicator.message).toHaveBeenCalledWith("Downloading 1 asset files");
});

test.each([
  {
    name: "hosted",
    deployment: { destination: "saas" as const, domains: [] },
  },
  {
    name: "SSG",
    deployment: {
      destination: "static" as const,
      name: "site.zip",
      assetsDomain: "https://assets.example.com",
      templates: ["ssg" as const],
    },
  },
])(
  "$name publish sync compiles required MDX articles",
  async ({ deployment }) => {
    const source = "# Published from the runner";
    const article = {
      ...createImageAssetFixture(),
      id: "article",
      name: "article.mdx",
      type: "file" as const,
      format: "mdx",
      size: new TextEncoder().encode(source).byteLength,
      meta: {},
    };
    const image = createImageAssetFixture();
    loadProjectBundleByBuildId.mockResolvedValue(
      createProjectBundle({
        assets: [article, image],
        build: {
          deployment,
          instances: [
            [
              "root",
              {
                type: "instance",
                id: "root",
                component: "Box",
                children: [{ type: "id", value: "content" }],
              },
            ],
            [
              "content",
              {
                type: "instance",
                id: "content",
                component: "ws:block",
                children: [{ type: "id", value: "templates" }],
              },
            ],
            [
              "templates",
              {
                type: "instance",
                id: "templates",
                component: "ws:block-template",
                children: [],
              },
            ],
          ],
          props: [
            [
              "article-source",
              {
                id: "article-source",
                instanceId: "content",
                name: "src",
                type: "asset",
                value: article.id,
              },
            ],
          ],
        },
      })
    );
    downloadAssetFiles.mockImplementation(async ({ assets }) => {
      await mkdir(".webstudio/assets", { recursive: true });
      await Promise.all(
        assets.map((asset: { id: string; name: string }) =>
          writeFile(
            `.webstudio/assets/${asset.name}`,
            asset.id === article.id ? source : "image"
          )
        )
      );
    });

    await sync(
      {
        authToken: "token-1",
        buildId: "build-1",
        origin: "https://example.com",
      },
      dependencies
    );

    const data = JSON.parse(await readFile(".webstudio/data.json", "utf8"));
    expect(downloadAssetFiles).toHaveBeenCalledWith({
      assets: [article, image],
      origin: "https://example.com",
    });
    expect(data.assetIndex.documents).toContainEqual(
      expect.objectContaining({ _id: article.id, extension: "mdx" })
    );
    expect(Object.values(data.assetIndex.contents)).toContain(source);

    await prebuild({
      assets: false,
      template: [deployment.destination === "static" ? "ssg" : "react-router"],
    });
    const generatedPage = await readFile(
      "app/__generated__/_index.tsx",
      "utf8"
    );
    expect(generatedPage).toContain("Published from the runner");
  }
);

test("hosted sync compiles all MDX assets reachable from a mutable project variable", async () => {
  const article = {
    ...createImageAssetFixture(),
    id: "article",
    name: "article.mdx",
    type: "file" as const,
    format: "mdx",
    size: new TextEncoder().encode("# Current project variable value")
      .byteLength,
    meta: {},
  };
  const updatedArticle = {
    ...createImageAssetFixture(),
    id: "updated-article",
    name: "updated-article.mdx",
    type: "file" as const,
    format: "mdx",
    size: new TextEncoder().encode("# Updated project variable value")
      .byteLength,
    meta: {},
  };
  const articles = [article, updatedArticle];
  const sources = new Map([
    [article.id, "# Current project variable value"],
    [updatedArticle.id, "# Updated project variable value"],
  ]);
  loadProjectBundleByBuildId.mockResolvedValue(
    createProjectBundle({
      assets: articles,
      build: {
        deployment: { destination: "saas", domains: [] },
        instances: [
          [
            "root",
            {
              type: "instance",
              id: "root",
              component: "Box",
              children: [{ type: "id", value: "content" }],
            },
          ],
          [
            "content",
            {
              type: "instance",
              id: "content",
              component: "ws:block",
              children: [{ type: "id", value: "templates" }],
            },
          ],
          [
            "templates",
            {
              type: "instance",
              id: "templates",
              component: "ws:block-template",
              children: [],
            },
          ],
        ],
        props: [
          [
            "src",
            {
              id: "src",
              instanceId: "content",
              name: "src",
              type: "expression",
              value: encodeDataVariableId("article-source"),
            },
          ],
        ],
        dataSources: [
          [
            "article-source",
            {
              id: "article-source",
              type: "variable",
              scopeInstanceId: "content",
              name: "articleSource",
              value: { type: "string", value: article.id },
            },
          ],
        ],
      },
    })
  );
  downloadAssetFiles.mockImplementation(async ({ assets }) => {
    await mkdir(".webstudio/assets", { recursive: true });
    await Promise.all(
      assets.map((asset) =>
        writeFile(
          `.webstudio/assets/${asset.name}`,
          sources.get(asset.id) ?? ""
        )
      )
    );
  });

  await sync(
    {
      authToken: "token-1",
      buildId: "build-1",
      origin: "https://example.com",
    },
    dependencies
  );

  expect(downloadAssetFiles).toHaveBeenCalledWith({
    assets: expect.arrayContaining([article, updatedArticle]),
    origin: "https://example.com",
  });
  const data = JSON.parse(await readFile(".webstudio/data.json", "utf8"));
  for (const [id, source] of sources) {
    expect(data.assetIndex.documents).toContainEqual(
      expect.objectContaining({ _id: id, extension: "mdx" })
    );
    expect(Object.values(data.assetIndex.contents)).toContain(source);
  }

  await prebuild({ assets: false, template: ["react-router"] });
  const generatedPage = await readFile("app/__generated__/_index.tsx", "utf8");
  expect(generatedPage).toContain("Current project variable value");
  expect(generatedPage).toContain("Updated project variable value");
});

test("hosted sync compiles metadata-only dynamic MDX into a server-rendered page", async () => {
  const source =
    "---\nslug: post\ntitle: Article title\n---\n# Published article body";
  const article = {
    ...createImageAssetFixture(),
    id: "article",
    name: "article.mdx",
    type: "file" as const,
    format: "mdx",
    size: new TextEncoder().encode(source).byteLength,
    meta: {},
  };
  const project = createProjectBundle({
    assets: [article],
    build: {
      deployment: { destination: "saas", domains: [] },
      instances: [
        [
          "root",
          {
            id: "root",
            type: "instance",
            component: "Box",
            children: [{ type: "id", value: "content" }],
          },
        ],
        [
          "content",
          {
            id: "content",
            type: "instance",
            component: "ws:block",
            children: [
              { type: "id", value: "title" },
              { type: "id", value: "templates" },
              { type: "id", value: "body" },
            ],
          },
        ],
        [
          "body",
          {
            id: "body",
            type: "instance",
            component: "ws:content-block-body",
            children: [],
          },
        ],
        [
          "title",
          {
            id: "title",
            type: "instance",
            component: "Heading",
            children: [
              {
                type: "expression",
                value: `${encodeDataSourceVariable("document")}.frontmatter.title`,
              },
            ],
          },
        ],
        [
          "templates",
          {
            id: "templates",
            type: "instance",
            component: "ws:block-template",
            children: [],
          },
        ],
      ],
      props: [
        [
          "src",
          {
            id: "src",
            instanceId: "content",
            name: "src",
            type: "expression",
            value: `${encodeDataSourceVariable("article-data")}.data.id`,
          },
        ],
        [
          "document",
          {
            id: "document",
            instanceId: "content",
            name: "document",
            type: "parameter",
            value: "document",
          },
        ],
      ],
      dataSources: [
        [
          "article-data",
          {
            id: "article-data",
            type: "resource",
            name: "article",
            scopeInstanceId: "root",
            resourceId: "article-query",
          },
        ],
        [
          "document",
          {
            id: "document",
            type: "parameter",
            name: "document",
            scopeInstanceId: "content",
          },
        ],
      ],
      resources: [
        [
          "article-query",
          {
            id: "article-query",
            name: "Article",
            control: "system",
            method: "post",
            url: '"/$resources/assets"',
            headers: [],
            body: createStructuredAssetQueryResourceBody({
              result: "one",
              limit: "1",
              offset: "0",
              where: {
                field: ["properties", "slug"],
                operator: "eq",
                value: "$ws$system.params.slug",
              },
              sort: [],
              output: { mode: "all", includeMetadata: true },
              content: { mode: "none" },
            }),
          },
        ],
      ],
    },
  });
  project.assetIndex = await createAssetIndex({
    projectId: project.build.projectId,
    entries: [
      createCanonicalAssetFileEntry({
        projectId: project.build.projectId,
        document: {
          _id: article.id,
          _type: "asset.file",
          name: article.name,
          path: article.name,
          key: "article",
          extension: "mdx",
          mimeType: "text/mdx",
          size: article.size,
          revision: "article-revision",
          contentRef: article.name,
          properties: { slug: "post", title: "Article title" },
        },
      }),
    ],
  });
  loadProjectBundleByBuildId.mockResolvedValue(project);
  downloadAssetFiles.mockImplementation(async () => {
    await mkdir(".webstudio/assets", { recursive: true });
    await writeFile(".webstudio/assets/article.mdx", source);
  });
  await sync(
    { authToken: "token", buildId: "build-1", origin: "https://example.com" },
    dependencies
  );
  await prebuild({ assets: false, template: ["react-router"] });
  // Execute the generated resource graph and server-render its actual React page.
  await build({
    stdin: {
      contents: `
      import React from "react";
      import { renderToString } from "react-dom/server";
      import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
      import { loadResources } from "@webstudio-is/sdk/runtime";
      import { Page } from "./app/__generated__/_index";
      import { getResources } from "./app/__generated__/_index.server";
      import { createGeneratedAssetResourceFetch } from "./app/__generated__/$resources.asset-query-runtime";
      (async () => {
        const system = { params: { slug: "post" }, search: {}, origin: "https://example.com", pathname: "/post" };
        const resourceFetch = await createGeneratedAssetResourceFetch({ request: new Request("https://example.com/post"), context: {}, fallback: fetch });
        const resources = await loadResources(resourceFetch, getResources({system}).data);
        console.log(renderToString(<ReactSdkContext.Provider value={{resources, assetBaseUrl: "/", imageLoader: ({src}) => src, breakpoints: [], onError: (error) => {throw error} }}><Page system={system} /></ReactSdkContext.Provider>));
      })().catch((error) => { console.error(error); process.exitCode = 1; });
    `,
      loader: "tsx",
      resolveDir: tempDir,
    },
    outfile: join(tempDir, "render.cjs"),
    bundle: true,
    platform: "node",
    format: "cjs",
    jsx: "automatic",
    conditions: ["webstudio"],
    nodePaths: [join(originalCwd, "node_modules")],
  });
  const { stdout } = await promisify(execFile)(process.execPath, [
    join(tempDir, "render.cjs"),
  ]);
  expect(stdout).toContain("Article title");
  expect(stdout).toContain("Published article body");
}, 30_000);

test("hosted sync keeps article bodies remote without MDX Content Blocks", async () => {
  const image = createImageAssetFixture();
  const articles = ["md", "mdx"].map((format) => ({
    ...image,
    id: format,
    name: `article.${format}`,
    format,
    type: "file" as const,
    meta: {},
  }));
  const project = createProjectBundle({
    assets: [...articles, image],
    build: { deployment: { destination: "saas", domains: [] } },
  });
  project.assetIndex = await createAssetIndex({
    projectId: project.build.projectId,
    entries: [],
  });
  loadProjectBundleByBuildId.mockResolvedValue(project);
  await sync(
    { authToken: "token", buildId: "build-1", origin: "https://example.com" },
    dependencies
  );
  expect(downloadAssetFiles).toHaveBeenCalledWith({
    assets: [image],
    origin: "https://example.com",
  });
  const data = JSON.parse(await readFile(".webstudio/data.json", "utf8"));
  expect(data.assetIndex).toEqual(project.assetIndex);
});

test("sends linked share token when synchronizing by build id", async () => {
  const resolveApiConnection = vi.fn(async () => ({
    authToken: "share-token",
    origin: "https://example.com",
    projectId: "project-id",
  }));

  await sync(
    {
      buildId: "build-1",
    },
    {
      ...dependencies,
      resolveApiConnection,
    }
  );

  expect(loadProjectBundleByBuildId).toHaveBeenCalledWith({
    buildId: "build-1",
    authToken: "share-token",
    origin: "https://example.com",
    headers: apiCompatibilityHeaders,
    contentIndex: "client",
  });
});

test("syncs current editable data without requiring a published project", async () => {
  loadProjectBundleByProjectId.mockRejectedValue(
    Object.assign(new Error("Not published"), {
      data: { code: "NOT_FOUND", webstudioCode: "PROJECT_NOT_PUBLISHED" },
    })
  );
  const resolveApiConnection = vi.fn(async () => ({
    authToken: "share-token",
    origin: "https://example.com",
    projectId: "project-id",
  }));

  const current = createProjectBundle({
    build: { version: 438 },
    assets: [createImageAssetFixture()],
  });
  loadCurrentProjectBundle.mockResolvedValue(current);
  await sync({}, { ...dependencies, resolveApiConnection });
  expect(loadProjectBundleByProjectId).not.toHaveBeenCalled();
  expect(loadCurrentProjectBundle).toHaveBeenCalledWith({
    authToken: "share-token",
    origin: "https://example.com",
    projectId: "project-id",
    headers: apiCompatibilityHeaders,
  });
  const data = JSON.parse(await readFile(".webstudio/data.json", "utf8"));
  expect(data.build.version).toBe(438);
  expect(data.assets).toEqual(current.assets);
});

test("explains unpublished project bundle errors when synchronizing by build id", async () => {
  loadProjectBundleByBuildId.mockRejectedValue(
    Object.assign(new Error("Not published"), {
      data: { code: "NOT_FOUND", webstudioCode: "PROJECT_NOT_PUBLISHED" },
    })
  );

  await expect(
    sync(
      {
        authToken: "token-1",
        buildId: "build-1",
        origin: "https://example.com",
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expect(indicator.stop).toHaveBeenCalledWith(
    [
      "The selected build cannot be exported.",
      "Run `webstudio sync` without --buildId to export the current saved project without publishing.",
    ].join("\n"),
    2
  );
});

test("does not write local data when synchronized asset download fails", async () => {
  const assets = [createImageAssetFixture()];
  loadProjectBundleByBuildId.mockResolvedValue(createProjectBundle({ assets }));
  downloadAssetFiles.mockRejectedValue(new Error("download failed"));

  await expect(
    sync(
      {
        authToken: "token-1",
        buildId: "build-1",
        origin: "https://example.com",
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  await expect(access(".webstudio/data.json")).rejects.toThrow();
  expect(indicator.stop).toHaveBeenCalledWith("download failed", 2);
});

test("throws handled error when local project config is missing", async () => {
  await expect(
    sync(
      {},
      {
        ...dependencies,
        readFile: vi.fn(async () => "{}") as unknown as typeof readFile,
      }
    )
  ).rejects.toThrow("Handled CLI error");

  expect(indicator.stop).toHaveBeenCalledWith(
    "Local config file is not found. Please make sure current directory is a webstudio project",
    2
  );
});

test("repeated sync preserves current build metadata and file formats without publishing", async () => {
  const file = {
    ...createImageAssetFixture(),
    type: "file" as const,
    name: "post.mdx",
    filename: "post",
    format: "mdx",
    meta: {},
  };
  const current = createProjectBundle({
    assets: [file],
    build: {
      version: 438,
      createdAt: "2026-07-30T23:21:20.362Z",
      updatedAt: "2026-09-01T21:44:30.648Z",
    },
  });
  const maps = [
    "breakpoints",
    "styles",
    "styleSources",
    "styleSourceSelections",
    "props",
    "instances",
    "dataSources",
    "resources",
  ] as const;
  const rawBuild = {
    ...current.build,
    ...Object.fromEntries(
      maps.map((key) => [key, current.build[key].map(([, value]) => value)])
    ),
    assets: current.assets,
    assetFolders: [],
    project: {
      id: current.build.projectId,
      title: current.projectTitle,
      domain: current.projectDomain,
    },
  };
  const requests: string[] = [];
  const tokens: Array<string | string[] | undefined> = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    requests.push(url.pathname);
    if (url.pathname === "/cgi/asset/post.mdx") {
      response.setHeader("content-type", "text/mdx");
      response.end("# Post");
      return;
    }
    tokens.push(request.headers["x-auth-token"]);
    response.setHeader("content-type", "application/json");
    if (url.pathname !== "/trpc/build.loadData") {
      response.writeHead(404);
      response.end(JSON.stringify({ error: "unexpected endpoint" }));
      return;
    }
    response.end(JSON.stringify([{ result: { data: rawBuild } }]));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Missing test server address");
    }
    const connection = {
      origin: `http://127.0.0.1:${address.port}`,
      projectId: current.build.projectId,
      authToken: "source-token",
    };
    const realDependencies = {
      ...defaultSyncDependencies,
      resolveApiConnection: async () => connection,
      spinner: () => indicator,
    };
    await sync({}, realDependencies);
    const first = await readFile(".webstudio/data.json", "utf8");
    await sync({}, realDependencies);
    expect(await readFile(".webstudio/data.json", "utf8")).toBe(first);
    expect(JSON.parse(first)).toMatchObject({
      build: current.build,
      projectTitle: current.projectTitle,
      projectDomain: current.projectDomain,
      assets: [file],
    });
    expect(await readFile(".webstudio/assets/post.mdx", "utf8")).toBe("# Post");
    expect(requests).toEqual([
      "/trpc/build.loadData",
      "/cgi/asset/post.mdx",
      "/trpc/build.loadData",
    ]);
    expect(tokens).toEqual(["source-token", "source-token"]);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});
