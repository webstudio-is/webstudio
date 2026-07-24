import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { bundleVersion } from "@webstudio-is/protocol";
import type { Asset } from "@webstudio-is/sdk";
import { createAssetResourceIndex } from "@webstudio-is/asset-resource";
import { createAssetQueryResourceBody, type Resource } from "@webstudio-is/sdk";
import {
  generateRedirectsModule,
  getRequiredAssetResourceContentRefs,
  materializeAssetResourceIndexes,
  prebuild,
} from "./prebuild";
import {
  createSsgAssetResourceFetch,
  fetchSsgPublicAsset,
} from "../templates/ssg/app/asset-resource-fetch";

const originalCwd = process.cwd();
const execFileAsync = promisify(execFile);
const originalFetch = globalThis.fetch;
let tempDir: string;
let consoleInfo: ReturnType<typeof vi.spyOn>;
const rootFolderId = "root";
const elementComponent = "ws:element";
const slowPrebuildTestTimeout = 15_000;

const runGeneratedCommand = async (
  command: "react-router" | "vite" | "vike",
  args: string[]
) => {
  const env = { ...process.env };
  for (const name of Object.keys(env)) {
    if (name.startsWith("VITEST")) {
      delete env[name];
    }
  }
  env.NODE_ENV = "production";
  env.NODE_OPTIONS = "--conditions=webstudio";
  env.WEBSTUDIO_LOCAL_CLI_BOOTSTRAPPED = "1";
  await execFileAsync(join(originalCwd, `node_modules/.bin/${command}`), args, {
    cwd: tempDir,
    env,
  });
};

type Redirects = Array<{ old: string; new: string; status?: "301" | "302" }>;
type GeneratedRouteModule = {
  loader: (args: { request: Request }) => Response | Promise<Response>;
};

const importGeneratedRoute = async (path: string) => {
  await symlink(join(originalCwd, "node_modules"), "node_modules", "dir");
  return (await import(
    `${pathToFileURL(join(tempDir, path)).href}?test=${crypto.randomUUID()}`
  )) as GeneratedRouteModule;
};

const expectGeneratedRedirectFallback = async (path: string) => {
  const routeModule = await importGeneratedRoute(path);
  const redirectResponse = await routeModule.loader({
    request: new Request("https://example.com/dl.php?filename=file.pdf"),
  });
  expect(redirectResponse.status).toBe(301);
  expect(redirectResponse.headers.get("Location")).toBe("/downloads/file.pdf");

  try {
    await routeModule.loader({
      request: new Request("https://example.com/not-a-redirect"),
    });
    throw new Error("Expected unmatched request to throw a 404 response.");
  } catch (error) {
    expect(error).toBeInstanceOf(Response);
    expect((error as Response).status).toBe(404);
  }
};

const getFilePaths = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const paths = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        return getFilePaths(path);
      }
      return [path];
    })
  );
  return paths.flat();
};

const createSiteData = (
  overrides: {
    assets?: Asset[];
    pages?: Array<{
      id: string;
      name: string;
      title: string;
      path: string;
      rootInstanceId: string;
      meta: Record<string, unknown>;
      isDraft?: boolean;
    }>;
    instances?: Array<
      [
        string,
        {
          type?: "instance";
          id: string;
          component: string;
          tag?: string;
          children: Array<{ type: "id"; value: string }>;
        },
      ]
    >;
    pageMeta?: Record<string, unknown>;
    redirects?: Redirects;
  } = {}
) => {
  const pages = overrides.pages ?? [
    {
      id: "home",
      name: "Home",
      title: "Home",
      path: "",
      rootInstanceId: "root",
      meta: {},
    },
  ];

  return {
    bundleVersion,
    origin: "https://assets.example",
    projectDomain: "example.com",
    projectTitle: "Example",
    user: {
      email: "owner@example.com",
    },
    page: pages[0],
    pages,
    assets: overrides.assets ?? [
      {
        id: "asset-image",
        projectId: "project-id",
        name: "image.png",
        type: "image",
        format: "png",
        size: 1,
        meta: {
          width: 1,
          height: 1,
        },
        description: "",
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ],
    build: {
      id: "build-id",
      projectId: "project-id",
      version: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
      pages: {
        meta: {
          siteName: "Site",
          contactEmail: "",
          ...overrides.pageMeta,
        },
        compiler: {
          atomicStyles: true,
        },
        redirects: overrides.redirects ?? [
          {
            old: "/dl.php?filename=file.pdf",
            new: "/downloads/file.pdf",
          },
          {
            old: "/über",
            new: "/ueber",
            status: "302",
          },
        ],
        homePageId: pages[0].id,
        rootFolderId,
        pages,
        folders: [
          {
            id: rootFolderId,
            name: "Root",
            slug: "",
            children: pages.map((page) => page.id),
          },
        ],
      },
      props: [],
      instances: (
        overrides.instances ?? [
          [
            "root",
            {
              id: "root",
              component: "Box",
              children: [],
            },
          ],
        ]
      ).map(([id, instance]) => [id, { type: "instance", ...instance }]),
      dataSources: [],
      resources: [],
      styleSources: [],
      styleSourceSelections: [],
      styles: [],
      breakpoints: [],
    },
  };
};

const writeSiteData = async (
  siteData: ReturnType<typeof createSiteData> = createSiteData()
) => {
  await writeFile(".webstudio/data.json", JSON.stringify(siteData), "utf8");
};

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "webstudio-prebuild-"));
  process.chdir(tempDir);
  consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
  await mkdir(".webstudio", { recursive: true });
  await writeSiteData();
});

afterEach(async () => {
  consoleInfo.mockRestore();
  process.chdir(originalCwd);
  globalThis.fetch = originalFetch;
  await rm(tempDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("generateRedirectsModule", () => {
  test("generates an empty redirects data module", () => {
    expect(generateRedirectsModule(undefined)).toEqual(`
    export const redirects = [];
    `);
  });

  test("preserves redirect sources exactly as data", () => {
    const redirects = [
      {
        old: "/dl.php?filename=file.pdf",
        new: "/downloads/file.pdf",
      },
      {
        old: "/path?url=https%3A%2F%2Fexample.com%2Fa%3Fb%3Dc",
        new: "/target",
        status: "302",
      },
      {
        old: "/über",
        new: "/ueber",
      },
      {
        old: "/%E6%B8%AF%E8%81%9E",
        new: "/news",
      },
      {
        old: "/path%20with%20spaces",
        new: "/spaces",
      },
      {
        old: "/old#section",
        new: "/new#target",
      },
    ] satisfies Redirects;

    expect(generateRedirectsModule(redirects)).toEqual(`
    export const redirects = [
  {
    "old": "/dl.php?filename=file.pdf",
    "new": "/downloads/file.pdf",
    "status": 301
  },
  {
    "old": "/path?url=https%3A%2F%2Fexample.com%2Fa%3Fb%3Dc",
    "new": "/target",
    "status": "302"
  },
  {
    "old": "/über",
    "new": "/ueber",
    "status": 301
  },
  {
    "old": "/%E6%B8%AF%E8%81%9E",
    "new": "/news",
    "status": 301
  },
  {
    "old": "/path%20with%20spaces",
    "new": "/spaces",
    "status": 301
  },
  {
    "old": "/old#section",
    "new": "/new#target",
    "status": 301
  }
];
    `);
  });
});

test("requires candidate files only when an asset query can hydrate content", async () => {
  const createIndex = (query: string) =>
    createAssetResourceIndex({
      format: "webstudio-resource-index",
      version: 1,
      resourceId: "posts",
      query,
      assetRevision: `sha256:${"a".repeat(64)}`,
      documents: [
        {
          _id: "post-1",
          _type: "asset.file",
          name: "post.md",
          path: "post.md",
          key: "post",
          extension: "md",
          mimeType: "text/markdown",
          size: 10,
          revision: "post-revision",
          contentRef: "post.md",
          properties: {},
        },
      ],
    });
  const createResource = (query: string): Resource => ({
    id: "posts",
    name: "Posts",
    control: "system",
    method: "post",
    url: '"/$resources/assets/query"',
    headers: [],
    body: createAssetQueryResourceBody({
      query,
      variables: [],
    }),
  });
  const metadataQuery = "{ assets { items { id } } }";
  const contentQuery =
    "{ assets { items { id content(mode: MARKDOWN_BODY) { text } } } }";
  const metadataIndex = await createIndex(metadataQuery);
  const contentIndex = await createIndex(contentQuery);

  expect(
    getRequiredAssetResourceContentRefs({
      snapshots: [
        {
          resourceId: "posts",
          revision: metadataIndex.integrity.checksum,
          index: metadataIndex,
        },
      ],
      resources: [["posts", createResource(metadataQuery)]],
    })
  ).toEqual(new Set());
  expect(
    getRequiredAssetResourceContentRefs({
      snapshots: [
        {
          resourceId: "posts",
          revision: contentIndex.integrity.checksum,
          index: contentIndex,
        },
      ],
      resources: [["posts", createResource(contentQuery)]],
    })
  ).toEqual(new Set(["post.md"]));
});

test("materializes immutable resource indexes as public JSON with a reference-only module", async () => {
  const index = await createAssetResourceIndex({
    format: "webstudio-resource-index",
    version: 1,
    resourceId: "blog/posts",
    query: "{ assets { items { id } } }",
    assetRevision: `sha256:${"a".repeat(64)}`,
    documents: [],
  });
  await mkdir("public", { recursive: true });
  await mkdir("app/__generated__", { recursive: true });
  await mkdir("public/resource-indexes", { recursive: true });
  await writeFile(
    "public/resource-indexes/obsolete-index.json",
    "obsolete",
    "utf8"
  );

  await materializeAssetResourceIndexes({
    snapshots: [
      {
        resourceId: index.resourceId,
        revision: index.integrity.checksum,
        index,
      },
    ],
    publicDirectory: "public",
    generatedDirectory: "app/__generated__",
    deploymentId: "build-1",
  });

  const files = await getFilePaths("public/resource-indexes");
  expect(files).toHaveLength(1);
  expect(files[0]).not.toContain("obsolete-index.json");
  expect(JSON.parse(await readFile(files[0], "utf8"))).toEqual(index);
  const manifestModule = await readFile(
    "app/__generated__/$resources.asset-query-manifest.ts",
    "utf8"
  );
  expect(manifestModule).toContain('assetQueryDeploymentId = "build-1"');
  expect(manifestModule).toContain("/resource-indexes/");
  expect(manifestModule).not.toContain('"documents"');
  expect(manifestModule).not.toContain('"properties"');
  const runtimeModule = await readFile(
    "app/__generated__/$resources.asset-query-runtime.ts",
    "utf8"
  );
  expect(runtimeModule).toContain(
    'from "@webstudio-is/asset-resource/runtime"'
  );
  expect(runtimeModule).not.toContain('"documents"');
  expect(runtimeModule).not.toContain('"properties"');
});

test("executes and hydrates an asset query from SSG public files", async () => {
  const source = "# Prerendered post\n";
  const query =
    "query Post($slug: String!) { assets(where: { properties: { slug: { eq: $slug } } }, first: 1) { items { id properties { title } content(mode: FULL) { text } } } }";
  const index = await createAssetResourceIndex({
    format: "webstudio-resource-index",
    version: 1,
    resourceId: "post",
    query,
    assetRevision: `sha256:${"a".repeat(64)}`,
    documents: [
      {
        _id: "post-1",
        _type: "asset.file",
        name: "post.md",
        path: "blog/post.md",
        key: "post",
        extension: "md",
        mimeType: "text/markdown",
        size: new TextEncoder().encode(source).byteLength,
        revision: "post-revision",
        contentRef: "post.md",
        properties: { slug: "post", title: "Prerendered post" },
      },
    ],
  });
  await mkdir("public/assets", { recursive: true });
  await mkdir("app/__generated__", { recursive: true });
  await writeFile("public/assets/post.md", source, "utf8");
  await materializeAssetResourceIndexes({
    snapshots: [
      {
        resourceId: index.resourceId,
        revision: index.integrity.checksum,
        index,
      },
    ],
    publicDirectory: "public",
    generatedDirectory: "app/__generated__",
    deploymentId: "build-1",
  });
  const [indexFile] = await getFilePaths("public/resource-indexes");
  const indexPath = `/${indexFile.slice("public/".length)}`;
  await expect((await fetchSsgPublicAsset(indexPath)).json()).resolves.toEqual(
    index
  );
  await expect(
    (
      await fetchSsgPublicAsset("/assets/post.md", {
        headers: { range: `bytes=0-${source.length - 1}` },
      })
    ).text()
  ).resolves.toBe(source);
  const runtimeFetch = createSsgAssetResourceFetch({
    deploymentId: "build-1",
    manifest: [
      {
        resourceId: index.resourceId,
        revision: index.integrity.checksum,
        queryHash: index.queryHash,
        assetRevision: index.assetRevision,
        indexPath,
      },
    ],
  });

  const response = await runtimeFetch("/$resources/assets/query", {
    method: "POST",
    body: JSON.stringify({
      query,
      variables: { slug: "post" },
    }),
  });

  expect({
    status: response?.status,
    body: await response?.json(),
  }).toMatchObject({
    status: 200,
    body: {
      ok: true,
      data: {
        assets: {
          items: [
            {
              id: "post-1",
              properties: { title: "Prerendered post" },
              content: { text: source },
            },
          ],
        },
      },
    },
  });
});

describe("prebuild", () => {
  test("incrementally replaces only changed generated files", async () => {
    const siteData = createSiteData({
      pages: [
        {
          id: "home",
          name: "Home",
          title: "Home",
          path: "",
          rootInstanceId: "root",
          meta: {},
        },
        {
          id: "pricing",
          name: "Pricing",
          title: "Pricing",
          path: "/pricing",
          rootInstanceId: "root",
          meta: {},
        },
        {
          id: "about",
          name: "About",
          title: "About",
          path: "/about",
          rootInstanceId: "root",
          meta: {},
        },
      ],
    });
    await writeSiteData(siteData);
    await prebuild({
      assets: false,
      template: ["react-router"],
      preserveRouteTemplates: true,
    });
    const unchangedFile = "app/__generated__/[about]._index.tsx";
    const unchangedTime = new Date("2000-01-01T00:00:00.000Z");
    await utimes(unchangedFile, unchangedTime, unchangedTime);
    const pricingFile = "app/__generated__/[pricing]._index.tsx";
    const pricingRoute = "app/routes/[pricing]._index.tsx";
    const templateRoute = "app/routes/[robots.txt].tsx";
    await writeFile("app/routes/custom.tsx", "custom", "utf8");

    siteData.build.version += 1;
    siteData.build.pages.pages = siteData.build.pages.pages.filter(
      (page) => page.id !== "pricing"
    );
    await writeSiteData(siteData);
    await prebuild({
      assets: false,
      template: ["react-router"],
      incremental: true,
    });

    siteData.build.version += 1;
    await writeSiteData(siteData);
    await prebuild({
      assets: false,
      template: ["react-router"],
      incremental: true,
    });

    expect((await stat(unchangedFile)).mtimeMs).toBe(unchangedTime.getTime());
    await expect(
      readFile("app/__generated__/_index.tsx", "utf8")
    ).resolves.toContain(
      `export const projectVersion = ${siteData.build.version};`
    );
    await expect(readFile(pricingFile, "utf8")).rejects.toThrow("ENOENT");
    await expect(readFile(pricingRoute, "utf8")).rejects.toThrow("ENOENT");
    await expect(readFile(templateRoute, "utf8")).resolves.toContain(
      "User-agent"
    );
    await expect(readFile("app/routes/custom.tsx", "utf8")).resolves.toBe(
      "custom"
    );
  });

  test("rejects generated manifests that point outside owned output", async () => {
    const outsideFile = "outside.ts";
    await writeSiteData(createSiteData());
    await prebuild({
      assets: false,
      template: ["react-router"],
      preserveRouteTemplates: true,
    });
    await writeFile(outsideFile, "preserve", "utf8");
    await writeFile(
      ".webstudio/generated-files.json",
      JSON.stringify([outsideFile]),
      "utf8"
    );

    await expect(
      prebuild({
        assets: false,
        template: ["react-router"],
        incremental: true,
      })
    ).rejects.toThrow("Generated files manifest is invalid.");
    await expect(readFile(outsideFile, "utf8")).resolves.toBe("preserve");
  });

  test("excludes draft pages from published output", async () => {
    await writeSiteData(
      createSiteData({
        pages: [
          {
            id: "home",
            name: "Home",
            title: "Home",
            path: "",
            rootInstanceId: "root",
            meta: {},
          },
          {
            id: "published",
            name: "Published",
            title: "Published",
            path: "/published",
            rootInstanceId: "root",
            meta: {},
          },
          {
            id: "draft",
            name: "Draft",
            title: "Draft",
            path: "/draft",
            rootInstanceId: "root",
            meta: {},
            isDraft: true,
          },
        ],
      })
    );

    await prebuild({ assets: false, template: ["react-router"] });

    await expect(
      readFile("app/routes/[published]._index.tsx", "utf8")
    ).resolves.toContain("../__generated__/[published]._index");
    await expect(
      readFile("app/routes/[draft]._index.tsx", "utf8")
    ).rejects.toThrow("ENOENT");
    await expect(
      readFile("app/__generated__/[draft]._index.tsx", "utf8")
    ).rejects.toThrow("ENOENT");
    await expect(
      readFile("app/__generated__/$resources.sitemap.xml.ts", "utf8")
    ).resolves.not.toContain('"path": "/draft"');
  });

  test("generates draft routes for local verification without publishing them", async () => {
    await writeSiteData(
      createSiteData({
        pages: [
          {
            id: "home",
            name: "Home",
            title: "Home",
            path: "",
            rootInstanceId: "root",
            meta: {},
          },
          {
            id: "draft",
            name: "Draft",
            title: "Draft",
            path: "/draft",
            rootInstanceId: "root",
            meta: {},
            isDraft: true,
          },
        ],
      })
    );

    await prebuild({
      assets: false,
      template: ["react-router"],
      includeDraftPages: true,
    });

    await expect(
      readFile("app/routes/[draft]._index.tsx", "utf8")
    ).resolves.toContain("../__generated__/[draft]._index");
    await expect(
      readFile("app/__generated__/[draft]._index.tsx", "utf8")
    ).resolves.toContain('export const siteName = "Site"');
    await expect(
      readFile("app/__generated__/$resources.sitemap.xml.ts", "utf8")
    ).resolves.not.toContain('"path": "/draft"');
  });

  test("uses the local asset base in generated asset resources", async () => {
    await writeSiteData(
      createSiteData({
        assets: [
          {
            id: "asset-audio",
            projectId: "project-id",
            name: "audio.mp3",
            type: "file",
            format: "mp3",
            size: 1,
            meta: {},
            description: "",
            createdAt: "2024-01-01T00:00:00.000Z",
          },
        ],
      })
    );

    await prebuild({
      assets: false,
      template: ["defaults"],
    });

    const assetsModule = await readFile(
      "app/__generated__/$resources.assets.ts",
      "utf8"
    );
    expect(assetsModule).toContain('"url": "/assets/audio.mp3"');
    expect(assetsModule).not.toContain("/cgi/");
  });

  test("scaffolds generated files and stores redirects as data", async () => {
    await mkdir("app/__generated__", { recursive: true });
    await mkdir("app/routes", { recursive: true });
    await writeFile("app/__generated__/stale.ts", "stale", "utf8");
    await writeFile("app/routes/stale.tsx", "stale", "utf8");

    await prebuild({
      assets: false,
      template: ["defaults"],
    });

    const redirectsModule = await readFile(
      "app/__generated__/$resources.redirects.ts",
      "utf8"
    );
    expect(redirectsModule).toEqual(
      generateRedirectsModule([
        {
          old: "/dl.php?filename=file.pdf",
          new: "/downloads/file.pdf",
        },
        {
          old: "/über",
          new: "/ueber",
          status: "302",
        },
      ])
    );

    const legacyAssetsModule = await readFile(
      "app/__generated__/$resources.assets.ts",
      "utf8"
    );
    expect(legacyAssetsModule).toContain("export const assets");
    expect(legacyAssetsModule).toContain('"asset-image"');
    expect(legacyAssetsModule).toContain("image.png");
    expect(legacyAssetsModule).not.toContain("assets/query");
    expect(legacyAssetsModule).not.toContain("properties");
    await expect(
      readFile("app/__generated__/$resources.sitemap.xml.ts", "utf8")
    ).resolves.toContain('"path": "/"');
    await expect(
      readFile("app/__generated__/$resources.wsauth.server.ts", "utf8")
    ).resolves.toContain("wsauth");
    await expect(readFile(".webstudio/auth.json", "utf8")).resolves.toContain(
      "{}"
    );

    const routeTemplate = await readFile("app/routes/_index.tsx", "utf8");
    expect(routeTemplate).toContain("../__generated__/_index");
    expect(routeTemplate).toContain("../__generated__/_index.server");
    expect(routeTemplate).not.toContain("__CLIENT__");
    expect(routeTemplate).not.toContain("__SERVER__");
    await expectGeneratedRedirectFallback("app/routes/$.tsx");

    await expect(
      readFile("app/__generated__/stale.ts", "utf8")
    ).rejects.toThrow("ENOENT");
    await expect(readFile("app/routes/stale.tsx", "utf8")).rejects.toThrow(
      "ENOENT"
    );

    const generatedPaths = await getFilePaths("app");
    expect(generatedPaths).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("dl.php"),
        expect.stringContaining("filename=file.pdf"),
        expect.stringContaining("über"),
      ])
    );
  });

  test("selects react-router templates", async () => {
    await prebuild({
      assets: false,
      template: ["react-router", "react-router-vercel"],
    });

    await expect(readFile("app/routes.ts", "utf8")).resolves.toContain(
      "react-router"
    );
    await expect(readFile("app/root.tsx", "utf8")).resolves.toContain(
      "react-router"
    );
    await expect(readFile("app/routes/_index.tsx", "utf8")).resolves.toContain(
      'from "react-router"'
    );
    await expect(readFile("vite.config.ts", "utf8")).resolves.toContain(
      'process.env.WEBSTUDIO_LOCAL_CLI_BOOTSTRAPPED === "1"'
    );
    await expect(readFile("vite.config.ts", "utf8")).resolves.toContain(
      '["webstudio"]'
    );
    await expect(
      readFile("app/__generated__/$resources.redirects.ts", "utf8")
    ).resolves.toContain("/dl.php?filename=file.pdf");
    await expect(readFile("app/constants.mjs", "utf8")).resolves.toContain(
      "return `/_vercel/image?${searchParams}`"
    );
    await expect(readFile("app/routes/[_image].$.ts", "utf8")).rejects.toThrow(
      "ENOENT"
    );
    const packageJson = JSON.parse(await readFile("package.json", "utf8"));
    expect(packageJson.dependencies).not.toHaveProperty("h3");
    expect(packageJson.dependencies).not.toHaveProperty("ipx");
  });

  test("generates homepage, leaf, nested, dynamic, and 404 React Router routes", async () => {
    await writeSiteData(
      createSiteData({
        pages: [
          {
            id: "home",
            name: "Home",
            title: "Home",
            path: "",
            rootInstanceId: "root",
            meta: {},
          },
          {
            id: "pricing",
            name: "Pricing",
            title: "Pricing",
            path: "/pricing",
            rootInstanceId: "root",
            meta: {},
          },
          {
            id: "guide",
            name: "Guide",
            title: "Guide",
            path: "/docs/getting-started",
            rootInstanceId: "root",
            meta: {},
          },
          {
            id: "post",
            name: "Post",
            title: "Post",
            path: "/blog/:slug",
            rootInstanceId: "root",
            meta: {},
          },
        ],
      })
    );

    await prebuild({ assets: false, template: ["react-router"] });

    await expect(readFile("app/routes/_index.tsx", "utf8")).resolves.toContain(
      "../__generated__/_index"
    );
    await expect(
      readFile("app/routes/[pricing]._index.tsx", "utf8")
    ).resolves.toContain("../__generated__/[pricing]._index");
    await expect(
      readFile("app/routes/[docs].[getting-started]._index.tsx", "utf8")
    ).resolves.toContain("../__generated__/[docs].[getting-started]._index");
    await expect(
      readFile("app/routes/[blog].$slug._index.tsx", "utf8")
    ).resolves.toContain("../__generated__/[blog].$slug._index");
    await expectGeneratedRedirectFallback("app/routes/$.tsx");
  });

  test("generates one dynamic SSR blog route with external index and published Markdown assets", async () => {
    const source = "# Published post\n";
    const index = await createAssetResourceIndex({
      format: "webstudio-resource-index",
      version: 1,
      resourceId: "posts",
      query:
        "query Post($slug: String!) { assets(where: { properties: { slug: { eq: $slug } } }, first: 1) { items { id content(mode: MARKDOWN_BODY) { text } } } }",
      assetRevision: `sha256:${"a".repeat(64)}`,
      documents: [
        {
          _id: "post-1",
          _type: "asset.file",
          name: "post.md",
          path: "blog/post.md",
          key: "post",
          extension: "md",
          mimeType: "text/markdown",
          size: new TextEncoder().encode(source).byteLength,
          revision: "post-revision",
          contentRef: "post.md",
          properties: { slug: "post" },
        },
      ],
    });
    const siteData = {
      ...createSiteData({
        pages: [
          {
            id: "home",
            name: "Home",
            title: "Home",
            path: "",
            rootInstanceId: "root",
            meta: {},
          },
          {
            id: "post",
            name: "Post",
            title: "Post",
            path: "/blog/:slug",
            rootInstanceId: "root",
            meta: {},
          },
        ],
      }),
      assets: ["post.md", "draft.md"].map((name) => ({
        id: name,
        projectId: "project-id",
        name,
        type: "file" as const,
        format: "md",
        size: source.length,
        meta: {},
        description: "",
        createdAt: "2024-01-01T00:00:00.000Z",
      })),
      assetResourceIndexes: [
        {
          resourceId: index.resourceId,
          revision: index.integrity.checksum,
          index,
        },
      ],
    };
    await writeSiteData(
      siteData as unknown as ReturnType<typeof createSiteData>
    );
    await mkdir(".webstudio/assets", { recursive: true });
    await writeFile(".webstudio/assets/post.md", source, "utf8");
    await writeFile(".webstudio/assets/draft.md", "draft secret", "utf8");

    await prebuild({ assets: true, template: ["react-router"] });

    await expect(
      readFile("app/routes/[blog].$slug._index.tsx", "utf8")
    ).resolves.toContain("createGeneratedAssetResourceFetch");
    await expect(readFile("public/assets/post.md", "utf8")).resolves.toBe(
      source
    );
    await expect(readFile("public/assets/draft.md", "utf8")).resolves.toBe(
      "draft secret"
    );
    const manifest = await readFile(
      "app/__generated__/$resources.asset-query-manifest.ts",
      "utf8"
    );
    expect(manifest).not.toContain("Published post");
    expect(manifest).not.toContain("draft secret");
    await expect(
      readFile("app/asset-resource-fetch.ts", "utf8")
    ).rejects.toThrow("ENOENT");
    expect(
      (await getFilePaths("app/routes")).filter((path) =>
        path.includes("$slug")
      )
    ).toHaveLength(1);
    await symlink(join(originalCwd, "node_modules"), "node_modules", "dir");
    await runGeneratedCommand("react-router", ["build"]);
    const serverBundle = (
      await Promise.all(
        (
          await getFilePaths("build/server")
        )
          .filter((path) => path.endsWith(".js"))
          .map((path) => readFile(path, "utf8"))
      )
    ).join("\n");
    expect(serverBundle).not.toContain("Published post");
    expect(serverBundle).not.toContain("draft secret");
    expect(serverBundle).not.toContain("post-revision");
  }, 30_000);

  test("uses pass-through images in the base react-router template", async () => {
    await prebuild({ assets: false, template: ["react-router"] });

    const route = await readFile("app/routes/_index.tsx", "utf8");
    expect(route).toContain("$resources.asset-query-runtime");
    expect(route).not.toContain("@webstudio-is/asset-resource");
    const assetQueryRuntime = await readFile(
      "app/__generated__/$resources.asset-query-runtime.ts",
      "utf8"
    );
    expect(assetQueryRuntime).not.toContain("@webstudio-is/asset-resource");
    expect(assetQueryRuntime).toContain("=> fallback");
    await expect(readFile("app/constants.mjs", "utf8")).resolves.toContain(
      "return props.src"
    );
    await expect(readFile("app/routes/[_image].$.ts", "utf8")).rejects.toThrow(
      "ENOENT"
    );
    const packageJson = JSON.parse(await readFile("package.json", "utf8"));
    expect(packageJson.dependencies).not.toHaveProperty("h3");
    expect(packageJson.dependencies).not.toHaveProperty("ipx");
  });

  test("omits the asset query runtime from dynamic app bundles without asset queries", async () => {
    await prebuild({ assets: false, template: ["react-router"] });
    await symlink(join(originalCwd, "node_modules"), "node_modules", "dir");

    await runGeneratedCommand("react-router", ["build"]);

    const serverBundle = (
      await Promise.all(
        (
          await getFilePaths("build/server")
        )
          .filter((path) => path.endsWith(".js"))
          .map((path) => readFile(path, "utf8"))
      )
    ).join("\n");
    expect(serverBundle).not.toContain("@webstudio-is/asset-resource");
  }, 30_000);

  test("keeps IPX image optimization in the react-router Docker overlay", async () => {
    await prebuild({
      assets: false,
      template: ["react-router", "react-router-docker"],
    });

    await expect(readFile("app/constants.mjs", "utf8")).resolves.toContain(
      "return `/_image/w_${props.width},q_${props.quality}${path}`"
    );
    await expect(
      readFile("app/routes/[_image].$.ts", "utf8")
    ).resolves.toContain("createIPXH3Handler");
    const packageJson = JSON.parse(await readFile("package.json", "utf8"));
    expect(packageJson.dependencies).toMatchObject({
      h3: "^1.15.1",
      ipx: "^3.0.3",
    });
  });

  test("rejects the react-router-docker overlay without its base template", async () => {
    await expect(
      prebuild({ assets: false, template: ["react-router-docker"] })
    ).rejects.toThrow(
      'requires "react-router". Use --template react-router --template react-router-docker.'
    );
  });

  test("selects ssg templates", async () => {
    await writeSiteData(
      createSiteData({
        pages: [
          {
            id: "home",
            name: "Home",
            title: "Home",
            path: "",
            rootInstanceId: "root",
            meta: {},
          },
        ],
      })
    );

    await prebuild({
      assets: false,
      template: ["ssg"],
    });

    await expect(readFile("pages/index/+Page.tsx", "utf8")).resolves.toContain(
      "../app/__generated__/_index"
    );
    await expect(readFile("pages/index/+data.ts", "utf8")).resolves.toContain(
      "../app/__generated__/_index.server"
    );
    await expect(readFile("pages/index/+data.ts", "utf8")).resolves.toContain(
      "createSsgAssetResourceFetch"
    );
    const packageJson = JSON.parse(await readFile("package.json", "utf8"));
    expect(packageJson.dependencies).toHaveProperty(
      "@webstudio-is/asset-resource"
    );
  });

  test("prerenders dynamic SSG paths from parameterized Assets resources", async () => {
    const query =
      "query Post($slug: String!) { assets(where: { properties: { slug: { eq: $slug } } }, first: 1) { items { id properties { title } } } }";
    const index = await createAssetResourceIndex({
      format: "webstudio-resource-index",
      version: 1,
      resourceId: "post",
      query,
      assetRevision: `sha256:${"a".repeat(64)}`,
      documents: [
        {
          _id: "post-1",
          _type: "asset.file",
          name: "post.md",
          path: "blog/post.md",
          key: "post",
          extension: "md",
          mimeType: "text/markdown",
          size: 1,
          revision: "post-revision",
          contentRef: "post.md",
          properties: { slug: "hello-world", title: "Hello" },
        },
      ],
    });
    const siteData = {
      ...createSiteData({
        pages: [
          {
            id: "home",
            name: "Home",
            title: "Home",
            path: "",
            rootInstanceId: "home-root",
            meta: {},
          },
          {
            id: "post",
            name: "Post",
            title: "Post",
            path: "/blog/:slug",
            rootInstanceId: "post-root",
            meta: {},
          },
        ],
        instances: [
          ["home-root", { id: "home-root", component: "Box", children: [] }],
          ["post-root", { id: "post-root", component: "Box", children: [] }],
        ],
      }),
      assetResourceIndexes: [
        {
          resourceId: index.resourceId,
          revision: index.integrity.checksum,
          index,
        },
      ],
    };
    siteData.build.resources = [
      [
        "post",
        {
          id: "post",
          name: "Post",
          control: "system",
          method: "post",
          url: '"/$resources/assets/query"',
          headers: [],
          body: createAssetQueryResourceBody({
            query,
            variables: [{ name: "slug", value: "system.params.slug" }],
          }),
        },
      ],
    ] as never;
    siteData.build.dataSources = [
      [
        "post-data",
        {
          id: "post-data",
          type: "resource",
          name: "post",
          resourceId: "post",
          scopeInstanceId: "post-root",
        },
      ],
    ] as never;
    await writeSiteData(siteData);

    await prebuild({ assets: false, template: ["ssg"] });
    await expect(
      readFile("pages/blog/@slug/+onBeforePrerenderStart.ts", "utf8")
    ).resolves.toContain("/blog/hello-world");
    await symlink(join(originalCwd, "node_modules"), "node_modules", "dir");
    await runGeneratedCommand("vite", ["build"]);
    await runGeneratedCommand("vike", ["prerender"]);
    await expect(
      readFile("dist/client/blog/hello-world/index.html", "utf8")
    ).resolves.toContain("<!DOCTYPE html>");
  }, 30_000);

  test("prerenders SSG pages with asset query data", async () => {
    const query = "{ assets(first: 10) { items { properties { title } } } }";
    const index = await createAssetResourceIndex({
      format: "webstudio-resource-index",
      version: 1,
      resourceId: "posts",
      query,
      assetRevision: `sha256:${"a".repeat(64)}`,
      documents: [
        {
          _id: "post-1",
          _type: "asset.file",
          name: "post.md",
          path: "blog/post.md",
          key: "post",
          extension: "md",
          mimeType: "text/markdown",
          size: 1,
          revision: "post-revision",
          contentRef: "post.md",
          properties: { title: "Prerendered post" },
        },
      ],
    });
    const siteData = {
      ...createSiteData(),
      assetResourceIndexes: [
        {
          resourceId: index.resourceId,
          revision: index.integrity.checksum,
          index,
        },
      ],
    };
    siteData.build.resources = [
      [
        "posts",
        {
          id: "posts",
          name: "Posts",
          control: "system",
          method: "post",
          url: '"/$resources/assets/query"',
          headers: [],
          body: createAssetQueryResourceBody({
            query,
            variables: [],
          }),
        },
      ],
    ] as never;
    siteData.build.dataSources = [
      [
        "posts-data",
        {
          id: "posts-data",
          type: "resource",
          name: "posts",
          resourceId: "posts",
          scopeInstanceId: "root",
        },
      ],
    ] as never;
    await writeSiteData(
      siteData as unknown as ReturnType<typeof createSiteData>
    );
    await prebuild({ assets: false, template: ["ssg"] });
    await symlink(join(originalCwd, "node_modules"), "node_modules", "dir");
    const pageModule = (await import(
      `${
        pathToFileURL(join(tempDir, "pages/index/+data.ts")).href
      }?test=${crypto.randomUUID()}`
    )) as {
      data: (context: {
        urlOriginal: string;
        headers: Record<string, string>;
        routeParams: Record<string, string>;
      }) => Promise<{ resources: Record<string, unknown> }>;
    };

    const pageData = await pageModule.data({
      urlOriginal: "/",
      headers: { host: "example.com" },
      routeParams: {},
    });

    expect(pageData.resources).toMatchObject({
      Posts: {
        ok: true,
        status: 200,
        data: {
          ok: true,
          data: {
            assets: {
              items: [{ properties: { title: "Prerendered post" } }],
            },
          },
        },
      },
    });
    await runGeneratedCommand("vite", ["build"]);
    await runGeneratedCommand("vike", ["prerender"]);
    await expect(readFile("dist/client/index.html", "utf8")).resolves.toContain(
      "<!DOCTYPE html>"
    );
  }, 30_000);

  test("generates html, xml, and text document routes", async () => {
    await writeSiteData(
      createSiteData({
        pages: [
          {
            id: "home",
            name: "Home",
            title: "Home",
            path: "",
            rootInstanceId: "root",
            meta: {},
          },
          {
            id: "feed",
            name: "Feed",
            title: "Feed",
            path: "/feed.xml",
            rootInstanceId: "xml-root",
            meta: {
              documentType: "xml",
            },
          },
          {
            id: "robots",
            name: "Robots",
            title: "Robots",
            path: "/robots.txt",
            rootInstanceId: "root",
            meta: {
              documentType: "text",
            },
          },
        ],
        instances: [
          [
            "root",
            {
              id: "root",
              component: "Box",
              children: [],
            },
          ],
          [
            "xml-root",
            {
              id: "xml-root",
              component: "Box",
              children: [{ type: "id", value: "xml-feed" }],
            },
          ],
          [
            "xml-feed",
            {
              id: "xml-feed",
              component: elementComponent,
              tag: "rss",
              children: [],
            },
          ],
        ],
      })
    );

    await prebuild({
      assets: false,
      template: ["defaults"],
    });

    await expect(readFile("app/routes/_index.tsx", "utf8")).resolves.toContain(
      "useLoaderData"
    );
    await expect(
      readFile("app/routes/[feed.xml]._index.tsx", "utf8")
    ).resolves.toContain("renderToString");
    await expect(
      readFile("app/routes/[robots.txt]._index.tsx", "utf8")
    ).resolves.toContain("Content-Type");
  });

  test("generates custom code only for the home page", async () => {
    await writeSiteData(
      createSiteData({
        pageMeta: {
          code: '<script src="/custom.js"></script><style>.x{color:red}</style>',
        },
        pages: [
          {
            id: "home",
            name: "Home",
            title: "Home",
            path: "",
            rootInstanceId: "root",
            meta: {},
          },
          {
            id: "about",
            name: "About",
            title: "About",
            path: "/about",
            rootInstanceId: "root",
            meta: {},
          },
        ],
      })
    );

    await prebuild({
      assets: false,
      template: ["defaults"],
    });

    await expect(
      readFile("app/__generated__/_index.tsx", "utf8")
    ).resolves.toContain("CustomCode");
    await expect(
      readFile("app/__generated__/[about]._index.tsx", "utf8")
    ).resolves.not.toContain("CustomCode");
  });

  test(
    "downloads assets only when requested by prebuild",
    async () => {
      const fetch = vi.fn(async () => ({
        ok: false,
        statusText: "Not Found",
      }));
      globalThis.fetch = fetch as unknown as typeof globalThis.fetch;
      const consoleWarn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await prebuild({
        assets: false,
        template: ["defaults"],
      });
      expect(fetch).not.toHaveBeenCalled();

      await prebuild({
        assets: true,
        template: ["defaults"],
      });
      expect(fetch).toHaveBeenCalledWith(
        "https://assets.example/cgi/image/image.png?format=raw"
      );
      expect(consoleWarn).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining("Error materializing file image.png")
      );
    },
    slowPrebuildTestTimeout
  );

  test("uses synced asset files before downloading during prebuild", async () => {
    await mkdir(".webstudio/assets", { recursive: true });
    await writeFile(".webstudio/assets/image.png", "synced", "utf8");
    const fetch = vi.fn();
    globalThis.fetch = fetch;

    await prebuild({
      assets: true,
      template: ["defaults"],
    });

    await expect(readFile("public/assets/image.png", "utf8")).resolves.toBe(
      "synced"
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  test("merges package and tsconfig from every template", async () => {
    const localTemplate = join(tempDir, "local-template");
    await mkdir(localTemplate, { recursive: true });
    await writeFile(
      join(localTemplate, "package.json"),
      JSON.stringify({
        scripts: {
          local: "echo local",
        },
        dependencies: {
          "local-package": "1.0.0",
        },
      }),
      "utf8"
    );
    await writeFile(
      join(localTemplate, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          strict: false,
          paths: {
            "~local/*": ["./local/*"],
          },
        },
      }),
      "utf8"
    );
    await writeFile(
      "package.json",
      JSON.stringify({
        scripts: {
          existing: "echo existing",
        },
        dependencies: {
          existing: "1.0.0",
        },
      }),
      "utf8"
    );
    await writeFile(
      "tsconfig.json",
      JSON.stringify({
        compilerOptions: {
          strict: true,
          paths: {
            "~existing/*": ["./existing/*"],
          },
        },
      }),
      "utf8"
    );

    await prebuild({
      assets: false,
      template: ["defaults", localTemplate],
    });

    const packageJson = JSON.parse(await readFile("package.json", "utf8"));
    expect(packageJson.scripts.existing).toEqual("echo existing");
    expect(packageJson.scripts.local).toEqual("echo local");
    expect(packageJson.dependencies.existing).toEqual("1.0.0");
    expect(packageJson.dependencies["local-package"]).toEqual("1.0.0");

    const tsconfig = JSON.parse(await readFile("tsconfig.json", "utf8"));
    expect(tsconfig.compilerOptions.strict).toEqual(false);
    expect(tsconfig.compilerOptions.paths).toEqual({
      "~existing/*": ["./existing/*"],
      "~local/*": ["./local/*"],
    });
  });

  test("throws when project bundle is missing", async () => {
    await rm(".webstudio/data.json", { force: true });

    await expect(
      prebuild({
        assets: false,
        template: ["defaults"],
      })
    ).rejects.toThrow("Project bundle is missing");
  });

  test("throws when project bundle is invalid", async () => {
    await writeFile(".webstudio/data.json", JSON.stringify({ assets: [] }));

    await expect(
      prebuild({
        assets: false,
        template: ["defaults"],
      })
    ).rejects.toThrow(
      "Project bundle is invalid, please make sure the project is synced. Invalid fields: page: Required"
    );
  });
});
