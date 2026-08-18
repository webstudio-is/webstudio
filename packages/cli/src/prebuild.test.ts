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
import {
  defaultTreeAdapter,
  parse as parseHtml,
  type DefaultTreeAdapterMap,
} from "parse5";
import { build } from "esbuild";
import { loadConfigFromFile } from "vite";
import { bundleVersion } from "@webstudio-is/protocol";
import type { Asset, Instance, Prop } from "@webstudio-is/sdk";
import {
  createDocumentGraph,
  type AssetFileDocument,
} from "@webstudio-is/content-engine";
import {
  createAssetIndex,
  createCanonicalAssetFileEntry,
  createContentRuntimeArtifact,
} from "@webstudio-is/content-engine/compiler";
import { createPublishedAssetResourceFetch } from "@webstudio-is/content-engine/runtime";
import {
  createStructuredAssetQueryResourceBody,
  encodeDataSourceVariable,
  SYSTEM_VARIABLE_ID,
  type Resource,
} from "@webstudio-is/sdk";
import {
  generateRedirectsModule,
  getAssetResourcePrerenderPaths,
  materializeAssetIndex,
  prebuild,
} from "./prebuild";

const createSsgAssetResourceFetch = (options: {
  deploymentId: string;
  artifact: Parameters<typeof createContentRuntimeArtifact>[0];
  runtimeAssets: Parameters<
    typeof createPublishedAssetResourceFetch
  >[0]["runtimeAssets"];
}) =>
  createPublishedAssetResourceFetch({
    ...options,
    artifact: createContentRuntimeArtifact(options.artifact),
    baseUrl: "https://webstudio.local",
  });

const originalCwd = process.cwd();
const execFileAsync = promisify(execFile);
const originalFetch = globalThis.fetch;
let tempDir: string;
let consoleInfo: ReturnType<typeof vi.spyOn>;
const rootFolderId = "root";
const elementComponent = "ws:element";
const slowPrebuildTestTimeout = 15_000;

const runGeneratedCommand = async (
  command: "react-router" | "tsc" | "vite" | "vike",
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

const linkPackagedPreviewDependencies = async () => {
  const sourceNodeModules = join(originalCwd, "node_modules");
  const targetNodeModules = join(tempDir, "node_modules");
  const webstudioScope = "@webstudio-is";
  const routerPackage = "sdk-components-react-router";

  await mkdir(targetNodeModules, { recursive: true });
  for (const entry of await readdir(sourceNodeModules)) {
    if (entry === webstudioScope) {
      continue;
    }
    await symlink(
      join(sourceNodeModules, entry),
      join(targetNodeModules, entry),
      "dir"
    );
  }

  const targetScope = join(targetNodeModules, webstudioScope);
  await mkdir(targetScope, { recursive: true });
  for (const entry of await readdir(join(sourceNodeModules, webstudioScope))) {
    if (entry === routerPackage) {
      continue;
    }
    await symlink(
      join(sourceNodeModules, webstudioScope, entry),
      join(targetScope, entry),
      "dir"
    );
  }

  const sourcePackage = join(originalCwd, "..", "sdk-components-react-router");
  const targetPackage = join(targetScope, routerPackage);
  await mkdir(join(targetPackage, "lib"), { recursive: true });
  const packageJson = JSON.parse(
    await readFile(join(sourcePackage, "package.json"), "utf8")
  ) as { exports: { ".": Record<string, string> } };
  delete packageJson.exports["."].webstudio;
  await writeFile(
    join(targetPackage, "package.json"),
    JSON.stringify(packageJson)
  );
  await build({
    entryPoints: [join(sourcePackage, "src", "components.ts")],
    outfile: join(targetPackage, "lib", "components.js"),
    bundle: true,
    format: "esm",
    packages: "external",
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

const getImportSources = async (source: string) => {
  const result = await build({
    stdin: { contents: source, loader: "tsx" },
    bundle: false,
    format: "esm",
    metafile: true,
    write: false,
  });
  return Object.values(result.metafile.outputs).flatMap((output) =>
    output.imports.map(({ path }) => path)
  );
};

const findElementsByTagName = (
  node: DefaultTreeAdapterMap["node"],
  tagName: string
): DefaultTreeAdapterMap["element"][] => {
  const elements: DefaultTreeAdapterMap["element"][] = [];
  if (defaultTreeAdapter.isElementNode(node) && node.tagName === tagName) {
    elements.push(node);
  }
  if ("childNodes" in node) {
    for (const child of node.childNodes) {
      elements.push(...findElementsByTagName(child, tagName));
    }
  }
  return elements;
};

const getTextContent = (node: DefaultTreeAdapterMap["node"]): string => {
  if (defaultTreeAdapter.isTextNode(node)) {
    return node.value;
  }
  if ("childNodes" in node) {
    return node.childNodes.map(getTextContent).join("");
  }
  return "";
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
    instances?: Array<[string, Omit<Instance, "type">]>;
    props?: Array<[string, Prop]>;
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
      props: overrides.props ?? [],
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

const createCodeTextSiteData = (
  selections: Array<{
    id: string;
    code?: string;
    language?: string | { type: "expression"; value: string };
    theme?: string | { type: "expression"; value: string };
    lang?: string;
    children?: Instance["children"];
  }>
) => {
  const instances: Array<[string, Omit<Instance, "type">]> = [
    [
      "root",
      {
        id: "root",
        component: "Box",
        children: selections.map(({ id }) => ({ type: "id", value: id })),
      },
    ],
  ];
  const props: Array<[string, Prop]> = [];
  for (const selection of selections) {
    instances.push([
      selection.id,
      {
        id: selection.id,
        component: "CodeText",
        children: selection.children ?? [],
      },
    ]);
    for (const [name, value] of [
      ["code", selection.code],
      ["language", selection.language],
      ["theme", selection.theme],
      ["lang", selection.lang],
    ] as const) {
      if (value === undefined) {
        continue;
      }
      const id = `${selection.id}-${name}`;
      props.push([
        id,
        {
          id,
          instanceId: selection.id,
          name,
          ...(typeof value === "string"
            ? { type: "string" as const, value }
            : value),
        },
      ]);
    }
  }
  return createSiteData({ instances, props });
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

const indexedDocument: AssetFileDocument = {
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
  properties: { slug: "post", title: "Prerendered post" },
};

const createAssetForIndexedDocument = (document: AssetFileDocument): Asset => ({
  id: document._id,
  projectId: "project-1",
  name: document.contentRef,
  type: "file",
  format: document.extension,
  size: document.size,
  meta: {},
  createdAt: "2026-01-01T00:00:00.000Z",
});

const createTestAssetIndex = (
  documents: AssetFileDocument | AssetFileDocument[] = indexedDocument,
  contents: Record<string, string> = {}
) =>
  createAssetIndex({
    projectId: "project-1",
    entries: (Array.isArray(documents) ? documents : [documents]).map(
      (document) => ({
        ...createCanonicalAssetFileEntry({
          projectId: "project-1",
          document,
        }),
        content: contents[document.contentRef],
      })
    ),
  });

const createQueryResource = (
  content: "none" | "full" | "markdown-body-ref" = "none"
): Resource => ({
  id: "posts",
  name: "Posts",
  control: "system",
  method: "post",
  url: '"/$resources/assets"',
  headers: [],
  body: createStructuredAssetQueryResourceBody({
    where: { all: [] },
    sort: [],
    limit: "100",
    offset: "0",
    output: { mode: "all", includeMetadata: true },
    content: { mode: content },
  }),
});

test("embeds one shared content database in a server module", async () => {
  const index = await createTestAssetIndex();
  await mkdir("public", { recursive: true });
  await mkdir("app/__generated__", { recursive: true });

  await materializeAssetIndex({
    index,
    runtimeAssets: { "post-1": { url: "/assets/post.md" } },
    includeDocumentRuntimeAssets: false,
    generatedDirectory: "app/__generated__",
    deploymentId: "build-1",
  });

  await expect(stat("public/assets/db")).rejects.toMatchObject({
    code: "ENOENT",
  });
  const manifestModule = await readFile(
    "app/__generated__/$resources.asset-query-manifest.ts",
    "utf8"
  );
  expect(manifestModule).toContain('assetQueryDeploymentId = "build-1"');
  expect(manifestModule).toContain('"documents"');
  expect(manifestModule).toContain('"properties"');
  expect(manifestModule).not.toContain('"fieldCatalog"');
  expect(manifestModule).not.toContain('"database"');
  expect(manifestModule).not.toContain('"integrity"');
  const runtimeModule = await readFile(
    "app/__generated__/$resources.asset-query-runtime.ts",
    "utf8"
  );
  expect(runtimeModule).toContain('from "./$resources.asset-query-vendor.js"');
  expect(runtimeModule).toContain("assetQueryDatabase");
  await expect(
    stat("app/__generated__/$resources.asset-query-vendor.js")
  ).resolves.toBeDefined();
});

test("rejects a corrupted content database before generating runtime files", async () => {
  const index = await createTestAssetIndex();
  const corrupted = {
    ...index,
    documents: index.documents.map((document) => ({
      ...document,
      name: `${document.name}-corrupted`,
    })),
  };
  await mkdir("app/__generated__", { recursive: true });

  await expect(
    materializeAssetIndex({
      index: corrupted,
      runtimeAssets: { "post-1": { url: "/assets/post.md" } },
      includeDocumentRuntimeAssets: false,
      generatedDirectory: "app/__generated__",
      deploymentId: "build-1",
    })
  ).rejects.toThrow("Content artifact checksum is invalid");
  await expect(
    stat("app/__generated__/$resources.asset-query-vendor.js")
  ).rejects.toMatchObject({ code: "ENOENT" });
});

test("does not require URLs for documents that do not use runtime asset fields", async () => {
  const index = await createTestAssetIndex();
  await mkdir("app/__generated__", { recursive: true });

  await materializeAssetIndex({
    index,
    runtimeAssets: {},
    includeDocumentRuntimeAssets: false,
    generatedDirectory: "app/__generated__",
    deploymentId: "build-1",
  });
  const runtimeModule = await readFile(
    "app/__generated__/$resources.asset-query-runtime.ts",
    "utf8"
  );
  expect(runtimeModule).toContain("const runtimeAssets = {};");
});

test("embeds document runtime data when a query uses runtime fields", async () => {
  const index = await createTestAssetIndex();
  await mkdir("app/__generated__", { recursive: true });

  await materializeAssetIndex({
    index,
    runtimeAssets: { "post-1": { url: "/assets/post.md" } },
    includeDocumentRuntimeAssets: true,
    generatedDirectory: "app/__generated__",
    deploymentId: "build-1",
  });

  await expect(
    readFile("app/__generated__/$resources.asset-query-runtime.ts", "utf8")
  ).resolves.toContain('"post-1"');
});

test("rejects missing document runtime data when a query uses runtime fields", async () => {
  const index = await createTestAssetIndex();
  await mkdir("app/__generated__", { recursive: true });

  await expect(
    materializeAssetIndex({
      index,
      runtimeAssets: {},
      includeDocumentRuntimeAssets: true,
      generatedDirectory: "app/__generated__",
      deploymentId: "build-1",
    })
  ).rejects.toThrow("Published asset runtime data is unavailable for post-1");
});

test("rejects a content database without a referenced published asset", async () => {
  const index = await createAssetIndex({
    projectId: "project-1",
    entries: [
      {
        ...createCanonicalAssetFileEntry({
          projectId: "project-1",
          document: indexedDocument,
        }),
        content: "# Post",
      },
    ],
    assetReferences: {
      "post.md": [{ start: 0, end: 1, assetId: "image-1" }],
    },
  });
  await mkdir("app/__generated__", { recursive: true });

  await expect(
    materializeAssetIndex({
      index,
      runtimeAssets: { "post-1": { url: "/assets/post.md" } },
      includeDocumentRuntimeAssets: false,
      generatedDirectory: "app/__generated__",
      deploymentId: "build-1",
    })
  ).rejects.toThrow(
    "Published referenced asset URL is unavailable for image-1"
  );
});

test("executes and hydrates an asset query from an embedded SSG database", async () => {
  const source = "# Prerendered post\n";
  const index = await createTestAssetIndex(
    {
      ...indexedDocument,
      size: new TextEncoder().encode(source).byteLength,
    },
    { "post.md": source }
  );
  const runtimeFetch = createSsgAssetResourceFetch({
    deploymentId: "build-1",
    artifact: index,
    runtimeAssets: { "post-1": { url: "/assets/post.md" } },
  });

  const response = await runtimeFetch("/$resources/assets", {
    method: "POST",
    body: JSON.stringify({
      query: {
        where: {
          all: [
            {
              field: ["properties", "slug"],
              operator: "eq",
              value: "post",
            },
          ],
        },
        limit: 1,
        output: { mode: "all", includeMetadata: true },
        content: { mode: "full" },
      },
    }),
  });

  expect({
    status: response?.status,
    body: await response?.json(),
  }).toMatchObject({
    status: 200,
    body: {
      items: [
        {
          id: "post-1",
          properties: { title: "Prerendered post" },
          content: { text: source },
        },
      ],
    },
  });
});

test("hydrates encoded filenames from an embedded SSG database", async () => {
  const contentRef = "post!-你好.md";
  const source = "# Encoded filename\n";
  const index = await createTestAssetIndex(
    {
      ...indexedDocument,
      contentRef,
      size: new TextEncoder().encode(source).byteLength,
    },
    { [contentRef]: source }
  );
  const runtimeFetch = createSsgAssetResourceFetch({
    deploymentId: "build-encoded",
    artifact: index,
    runtimeAssets: { "post-1": { url: `/assets/${contentRef}` } },
  });

  const response = await runtimeFetch("/$resources/assets", {
    method: "POST",
    body: JSON.stringify({
      query: {
        where: { all: [{ field: ["id"], operator: "eq", value: "post-1" }] },
        limit: 1,
        content: { mode: "full" },
      },
    }),
  });

  expect(response?.status).toBe(200);
  await expect(response?.json()).resolves.toMatchObject({
    items: [{ content: { text: source } }],
  });
});

describe("prebuild", () => {
  test("imports only configured Code Text language and theme assets", async () => {
    await writeSiteData(
      createCodeTextSiteData([
        {
          id: "code-1",
          code: "const answer = 42;",
          language: "javascript",
          theme: "github-light",
        },
        {
          id: "code-2",
          code: "const answer = 42;",
          language: "javascript",
          theme: "nord",
        },
      ])
    );

    await prebuild({ assets: false, template: ["react-router"] });

    const generatedPage = await readFile(
      "app/__generated__/_index.tsx",
      "utf8"
    );
    const importSources = await getImportSources(generatedPage);
    expect(
      importSources.filter((source) => source === "@shikijs/langs/javascript")
    ).toHaveLength(1);
    expect(importSources).toEqual(
      expect.arrayContaining([
        "@shikijs/themes/github-light",
        "@shikijs/themes/nord",
        "@webstudio-is/sdk-components-react/code-text",
      ])
    );
    expect(importSources).not.toContain("@shikijs/langs/css");
    expect(importSources).not.toContain("@shikijs/themes/dracula");
  });

  test("generates lazy loaders for bound selections", async () => {
    await writeSiteData(
      createCodeTextSiteData([
        {
          id: "code-1",
          code: "const answer = 42;",
          language: { type: "expression", value: '"javascript"' },
          theme: { type: "expression", value: '"github-light"' },
        },
      ])
    );

    await prebuild({ assets: false, template: ["react-router"] });

    const generatedPage = await readFile(
      "app/__generated__/_index.tsx",
      "utf8"
    );
    const importSources = await getImportSources(generatedPage);
    expect(importSources).toEqual(
      expect.arrayContaining(["shiki/langs", "shiki/themes"])
    );
    expect(importSources).not.toContain("@shikijs/langs/javascript");
    expect(importSources).not.toContain("@shikijs/themes/github-light");
    expect(generatedPage).not.toContain("import.meta.env.SSR");
    expect(generatedPage).not.toContain("await Promise.all");
    expect(generatedPage).toContain("suspense: true");
    expect(generatedPage).toContain("loader?.().then");
  });

  test("prerenders configured and legacy Code Text in SSG output", async () => {
    await writeSiteData(
      createCodeTextSiteData([
        {
          id: "code-highlighted",
          code: "const answer = 42;",
          language: "javascript",
          theme: "github-light",
        },
        {
          id: "code-plaintext",
          code: "plain <value>",
          language: "plaintext",
          theme: "nord",
        },
        {
          id: "code-legacy",
          lang: "en",
          children: [{ type: "text", value: "legacy <code>" }],
        },
      ])
    );

    await prebuild({ assets: false, template: ["ssg"] });

    const generatedPage = await readFile(
      "app/__generated__/_index.tsx",
      "utf8"
    );
    const importSources = await getImportSources(generatedPage);
    expect(importSources).toEqual(
      expect.arrayContaining([
        "@shikijs/langs/javascript",
        "@shikijs/themes/github-light",
        "@shikijs/themes/nord",
      ])
    );
    expect(importSources).not.toContain("@shikijs/langs/plaintext");
    expect(importSources).not.toContain("@shikijs/langs/css");
    expect(importSources).not.toContain("@shikijs/themes/dracula");
    expect(
      JSON.parse(await readFile("package.json", "utf8")).dependencies
    ).toMatchObject({
      "@shikijs/langs": "4.4.1",
      "@shikijs/themes": "4.4.1",
      shiki: "4.4.1",
    });

    await symlink(join(originalCwd, "node_modules"), "node_modules", "dir");
    await runGeneratedCommand("vite", ["build"]);
    await runGeneratedCommand("vike", ["prerender"]);

    const html = parseHtml(await readFile("dist/client/index.html", "utf8"));
    const codeElements = findElementsByTagName(html, "code");
    const [highlightedCode, plaintextCode, legacyCode] = codeElements;
    if (
      highlightedCode === undefined ||
      plaintextCode === undefined ||
      legacyCode === undefined
    ) {
      throw new Error("Expected three prerendered Code Text elements");
    }
    expect(
      Object.fromEntries(
        highlightedCode.attrs.map(({ name, value }) => [name, value])
      )
    ).toMatchObject({
      class: "w-code-text",
    });
    expect(
      Object.fromEntries(
        highlightedCode.attrs.map(({ name, value }) => [name, value])
      )
    ).not.toHaveProperty("tabindex");
    expect(
      findElementsByTagName(highlightedCode, "span").length
    ).toBeGreaterThan(0);
    expect(getTextContent(highlightedCode)).toBe("const answer = 42;");

    expect(
      Object.fromEntries(
        plaintextCode.attrs.map(({ name, value }) => [name, value])
      )
    ).toMatchObject({
      class: "w-code-text",
      style: expect.stringContaining(
        "--w-code-text-theme-background:#2e3440ff"
      ),
    });
    expect(getTextContent(plaintextCode)).toBe("plain <value>");

    expect(
      Object.fromEntries(
        legacyCode.attrs.map(({ name, value }) => [name, value])
      )
    ).toMatchObject({ class: "w-code-text", lang: "en" });
    expect(findElementsByTagName(legacyCode, "span")).toHaveLength(0);
    expect(getTextContent(legacyCode)).toBe("legacy <code>");
  }, 30_000);

  test("prerenders bound Code Text while keeping catalog chunks lazy", async () => {
    await writeSiteData(
      createCodeTextSiteData([
        {
          id: "code-bound",
          code: "const answer = 42;",
          language: { type: "expression", value: '"javascript"' },
          theme: { type: "expression", value: '"github-light"' },
        },
      ])
    );

    await prebuild({ assets: false, template: ["ssg"] });
    await symlink(join(originalCwd, "node_modules"), "node_modules", "dir");
    await runGeneratedCommand("vite", ["build"]);
    await runGeneratedCommand("vike", ["prerender"]);

    const htmlSource = await readFile("dist/client/index.html", "utf8");
    expect(htmlSource).toMatch(/^<!DOCTYPE html><html/);
    const html = parseHtml(htmlSource);
    const [codeElement] = findElementsByTagName(html, "code");
    if (codeElement === undefined) {
      throw new Error("Expected a prerendered Code Text element");
    }
    expect(findElementsByTagName(codeElement, "span").length).toBeGreaterThan(
      0
    );
    expect(getTextContent(codeElement)).toBe("const answer = 42;");

    const clientPaths = await getFilePaths("dist/client");
    const catalogChunks = clientPaths.filter(
      (path) => path.includes("/chunks/") && path.endsWith(".js")
    );
    expect(catalogChunks.length).toBeGreaterThan(100);
    const referencedChunks = catalogChunks.filter((chunk) => {
      const filename = chunk.split("/").at(-1);
      return filename !== undefined && htmlSource.includes(filename);
    });
    expect(referencedChunks).toHaveLength(1);
  }, 60_000);

  test("emits the identity marker only for local previews", async () => {
    await prebuild({
      assets: false,
      template: ["react-router"],
      previewIdentity: true,
    });

    await expect(
      readFile("public/__webstudio/preview.json", "utf8")
    ).resolves.toBe(JSON.stringify({ projectId: "project-id", version: 1 }));
  });

  test("does not add the local preview marker to deployable builds", async () => {
    await prebuild({
      assets: false,
      template: ["react-router"],
      preserveRouteTemplates: true,
    });

    await expect(
      readFile("public/__webstudio/preview.json", "utf8")
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

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

  test(
    "types an empty generated sitemap",
    async () => {
      await writeSiteData(
        createSiteData({
          pages: [
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
      });
      await writeFile(
        "sitemap-typecheck.ts",
        `import { sitemap } from "./app/__generated__/$resources.sitemap.xml";
sitemap.map((page) => page.path);`
      );
      await runGeneratedCommand("tsc", [
        "--ignoreConfig",
        "--noEmit",
        "--strict",
        "--skipLibCheck",
        "--moduleResolution",
        "bundler",
        "--module",
        "esnext",
        "--target",
        "es2022",
        "sitemap-typecheck.ts",
      ]);
    },
    slowPrebuildTestTimeout
  );

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

    const assetsModule = await readFile(
      "app/__generated__/$resources.assets.ts",
      "utf8"
    );
    expect(assetsModule).toContain("export const assets");
    expect(assetsModule).toContain('"asset-image"');
    expect(assetsModule).toContain("image.png");
    expect(assetsModule).not.toContain("assets/query");
    expect(assetsModule).not.toContain("properties");
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
    await expect(readFile("vite.config.ts", "utf8")).resolves.toContain(
      'noExternal: ["nanoid"]'
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
    expect(packageJson.engines).toEqual({ node: ">=22.12.0" });
    expect(packageJson.devEngines).toEqual({
      runtime: {
        name: "node",
        version: ">=22.12.0",
        onFail: "error",
      },
    });
    await expect(readFile(".npmrc", "utf8")).resolves.toContain(
      "engine-strict=true"
    );
    expect(packageJson.dependencies).not.toHaveProperty(
      "@webstudio-is/asset-resource"
    );
    expect(packageJson.dependencies).not.toHaveProperty(
      "@webstudio-is/content-engine"
    );
    expect(packageJson.dependencies).not.toHaveProperty("h3");
    expect(packageJson.dependencies).not.toHaveProperty("ipx");
    expect(packageJson.dependencies).not.toHaveProperty(
      "@webstudio-is/content-engine"
    );
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

  test("builds a generated dynamic route with the packaged React Router SDK", async () => {
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
    await linkPackagedPreviewDependencies();
    const loadedConfig = await loadConfigFromFile(
      { command: "build", mode: "production" },
      join(tempDir, "vite.config.ts")
    );
    expect(loadedConfig?.config.resolve?.conditions).toContain("import");
    expect(loadedConfig?.config.ssr?.resolve?.conditions).toContain("import");
    await runGeneratedCommand("react-router", ["build"]);

    await expect(
      getFilePaths(join(tempDir, "build", "server"))
    ).resolves.not.toHaveLength(0);
  }, 30_000);

  test("preserves an authored catch-all page when redirects are configured", async () => {
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
            id: "not-found",
            name: "Not found",
            title: "Not found",
            path: "/*",
            rootInstanceId: "root",
            meta: { status: "404" },
          },
        ],
      })
    );

    await prebuild({
      assets: false,
      template: ["react-router"],
      preserveRouteTemplates: true,
    });
    await prebuild({
      assets: false,
      template: ["react-router"],
      incremental: true,
    });

    const route = await readFile("app/routes/$.tsx", "utf8");
    expect(route).toContain("../__generated__/$");
    expect(route).toContain("../__generated__/$.server");
    expect(route).not.toContain('new Response("Not Found"');
    await expect(
      readFile("app/__generated__/$.server.tsx", "utf8")
    ).resolves.toContain("status: 404");
  });

  test("ignores the catch-all fallback when generating an SSG site", async () => {
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
            id: "not-found",
            name: "Not found",
            title: "Not found",
            path: "/*",
            rootInstanceId: "root",
            meta: {},
          },
        ],
      })
    );

    await expect(
      prebuild({ assets: false, template: ["ssg"] })
    ).resolves.toBeUndefined();
    await expect(readFile("pages/index/+Page.tsx", "utf8")).resolves.toContain(
      "Page"
    );
    await expect(readFile("pages/*/+Page.tsx", "utf8")).rejects.toThrow(
      "ENOENT"
    );
  });

  test("generates one dynamic SSR blog route with an embedded content database", async () => {
    const source = "# Published post\n";
    const index = await createTestAssetIndex(
      {
        ...indexedDocument,
        path: "blog/post.md",
        size: new TextEncoder().encode(source).byteLength,
        properties: { slug: "post" },
      },
      { "post.md": source }
    );
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
      assetIndex: index,
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
    expect(manifest).toContain("Published post");
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
    expect(serverBundle).toContain("Published post");
    expect(serverBundle).not.toContain("draft secret");
    expect(serverBundle).toContain("post-revision");
    const clientBundle = (
      await Promise.all(
        (
          await getFilePaths("build/client")
        )
          .filter((path) => path.endsWith(".js"))
          .map((path) => readFile(path, "utf8"))
      )
    ).join("\n");
    expect(clientBundle).not.toContain("Published post");
    expect(clientBundle).not.toContain("post-revision");
  }, 30_000);

  test("embeds the deployment database when asset downloads are disabled", async () => {
    const index = await createTestAssetIndex();
    const siteData = {
      ...createSiteData({
        assets: [
          createAssetForIndexedDocument(indexedDocument),
          createAssetForIndexedDocument({
            ...indexedDocument,
            _id: "unrelated-asset",
            name: "unrelated.md",
            path: "unrelated.md",
            key: "unrelated",
            contentRef: "unrelated.md",
          }),
        ],
      }),
      assetIndex: index,
    };
    siteData.build.resources = [["posts", createQueryResource()]] as never;
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

    await prebuild({
      assets: false,
      template: ["react-router"],
      preserveRouteTemplates: true,
    });

    await expect(
      readFile("app/__generated__/$resources.asset-query-manifest.ts", "utf8")
    ).resolves.toContain(index.integrity.checksum);
    const runtimeModule = await readFile(
      "app/__generated__/$resources.asset-query-runtime.ts",
      "utf8"
    );
    expect(runtimeModule).not.toContain('"post-1"');
    expect(runtimeModule).not.toContain("unrelated-asset");
    expect(runtimeModule).not.toContain('$resources.assets"');
    const packageJson = JSON.parse(await readFile("package.json", "utf8"));
    expect(packageJson.dependencies).not.toHaveProperty(
      "@webstudio-is/content-engine"
    );
    await expect(
      stat("app/__generated__/$resources.asset-query-vendor.js")
    ).resolves.toBeDefined();

    await writeSiteData();
    await prebuild({
      assets: false,
      incremental: true,
      template: ["react-router"],
    });
    const withoutQuery = JSON.parse(await readFile("package.json", "utf8"));
    expect(withoutQuery.dependencies).not.toHaveProperty(
      "@webstudio-is/content-engine"
    );
    await expect(
      stat("app/__generated__/$resources.asset-query-vendor.js")
    ).rejects.toThrow("ENOENT");
  });

  test("loads deferred SaaS document content from the asset proxy", async () => {
    const index = await createAssetIndex({
      projectId: "project-1",
      entries: [
        createCanonicalAssetFileEntry({
          projectId: "project-1",
          document: indexedDocument,
        }),
      ],
      documentGraph: createDocumentGraph({
        nodes: [
          {
            id: indexedDocument._id,
            revision: indexedDocument.revision,
            contentRef: indexedDocument.contentRef,
            format: "markdown",
          },
        ],
        edges: [],
      }),
    });
    const baseSiteData = createSiteData({
      assets: [createAssetForIndexedDocument(indexedDocument)],
    });
    const siteData = {
      ...baseSiteData,
      assetIndex: index,
      build: {
        ...baseSiteData.build,
        deployment: {
          destination: "saas" as const,
          domains: ["example"],
          assetsDomain: "example",
          excludeWstdDomainFromSearch: false,
        },
        resources: [["posts", createQueryResource("markdown-body-ref")]],
        dataSources: [
          [
            "posts-data",
            {
              id: "posts-data",
              type: "resource" as const,
              name: "posts",
              resourceId: "posts",
              scopeInstanceId: "root",
            },
          ],
        ],
      },
    };
    await writeSiteData(
      siteData as unknown as ReturnType<typeof createSiteData>
    );

    await prebuild({
      assets: false,
      template: ["react-router"],
      preserveRouteTemplates: true,
    });

    const runtimeModule = await readFile(
      "app/__generated__/$resources.asset-query-runtime.ts",
      "utf8"
    );
    expect(runtimeModule).toContain(
      '"url":"https://assets.example/cgi/asset/post.md?format=raw"'
    );
    expect(runtimeModule).not.toContain('"url":"/assets/post.md"');

    await mkdir(".webstudio/assets", { recursive: true });
    await writeFile(".webstudio/assets/post.md", "# Post\n", "utf8");
    await prebuild({
      assets: true,
      template: ["react-router"],
      preserveRouteTemplates: true,
    });

    const materializedRuntimeModule = await readFile(
      "app/__generated__/$resources.asset-query-runtime.ts",
      "utf8"
    );
    expect(materializedRuntimeModule).toContain('"url":"/assets/post.md"');
    expect(materializedRuntimeModule).not.toContain(
      '"url":"https://assets.example/cgi/asset/post.md?format=raw"'
    );
  });

  test("uses pass-through images in the base react-router template", async () => {
    await prebuild({ assets: false, template: ["react-router"] });

    const route = await readFile("app/routes/_index.tsx", "utf8");
    expect(route).toContain("$resources.asset-query-runtime");
    expect(route).not.toContain("@webstudio-is/content-engine");
    const assetQueryRuntime = await readFile(
      "app/__generated__/$resources.asset-query-runtime.ts",
      "utf8"
    );
    expect(assetQueryRuntime).not.toContain("@webstudio-is/content-engine");
    expect(assetQueryRuntime).toContain("=> fallback");
    await expect(
      readFile("app/__generated__/$resources.asset-query-manifest.ts", "utf8")
    ).resolves.not.toContain("@webstudio-is/content-engine");
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

  test("does not modify a project-owned content-engine dependency", async () => {
    await prebuild({
      assets: false,
      template: ["react-router"],
      preserveRouteTemplates: true,
    });
    const packageJson = JSON.parse(await readFile("package.json", "utf8"));
    packageJson.dependencies["@webstudio-is/content-engine"] = "custom-version";
    await writeFile("package.json", JSON.stringify(packageJson), "utf8");

    await prebuild({
      assets: false,
      incremental: true,
      template: ["react-router"],
    });

    const preserved = JSON.parse(await readFile("package.json", "utf8"));
    expect(preserved.dependencies).toHaveProperty(
      "@webstudio-is/content-engine",
      "custom-version"
    );
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
    expect(serverBundle).not.toContain("@webstudio-is/content-engine");
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
    await expect(
      readFile("app/asset-resource-fetch.ts", "utf8")
    ).resolves.not.toContain("@webstudio-is/content-engine");
    const packageJson = JSON.parse(await readFile("package.json", "utf8"));
    expect(packageJson.dependencies).not.toHaveProperty(
      "@webstudio-is/content-engine"
    );
    expect(packageJson.scripts.build).not.toContain(
      "cleanup-derived-assets.mjs"
    );
  });

  test("ignores dynamic SSG pages without enumerable Assets query paths", async () => {
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

    await expect(
      prebuild({ assets: false, template: ["ssg"] })
    ).resolves.toBeUndefined();
    await expect(readFile("pages/index/+Page.tsx", "utf8")).resolves.toContain(
      "Page"
    );
    await expect(
      readFile("pages/blog/@slug/+Page.tsx", "utf8")
    ).rejects.toThrow("ENOENT");
  });

  test("prerenders dynamic SSG paths from parameterized Assets resources", async () => {
    const documents = [
      {
        ...indexedDocument,
        path: "blog/post.md",
        size: 1,
        properties: { slug: "hello-world", title: "Hello", draft: false },
      },
      {
        ...indexedDocument,
        _id: "draft-post",
        name: "draft.md",
        path: "blog/draft.md",
        key: "draft",
        size: 1,
        revision: "draft-revision",
        contentRef: "draft.md",
        properties: { slug: "draft-post", title: "Draft", draft: true },
      },
    ];
    const index = await createTestAssetIndex(documents);
    const siteData = {
      ...createSiteData({
        assets: documents.map(createAssetForIndexedDocument),
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
      assetIndex: index,
    };
    siteData.build.resources = [
      [
        "post",
        {
          id: "post",
          name: "Post",
          control: "system",
          method: "post",
          url: '"/$resources/assets"',
          headers: [],
          body: createStructuredAssetQueryResourceBody({
            where: {
              all: [
                {
                  field: ["properties", "draft"],
                  operator: "ne",
                  value: "true",
                },
                {
                  field: ["properties", "slug"],
                  operator: "eq",
                  value: "system.params.slug",
                },
              ],
            },
            sort: [],
            limit: "1",
            offset: "0",
            output: { mode: "all", includeMetadata: true },
            content: { mode: "none" },
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
    await expect(
      readFile("pages/blog/@slug/+onBeforePrerenderStart.ts", "utf8")
    ).resolves.not.toContain("/blog/draft-post");
    const sitemap = await readFile(
      "app/__generated__/$resources.sitemap.xml.ts",
      "utf8"
    );
    expect(sitemap).toContain('"path": "/"');
    expect(sitemap).not.toContain('"path": "/blog/hello-world"');
    expect(sitemap).not.toContain('"path": "/blog/draft-post"');
    await symlink(join(originalCwd, "node_modules"), "node_modules", "dir");
    await runGeneratedCommand("vite", ["build"]);
    await runGeneratedCommand("vike", ["prerender"]);
    await expect(
      readFile("dist/client/blog/hello-world/index.html", "utf8")
    ).resolves.toContain("<!DOCTYPE html>");
    const staticRuntimeOutput = (
      await Promise.all(
        (
          await getFilePaths("dist/client")
        )
          .filter((path) => path.endsWith(".js") || path.endsWith(".json"))
          .map((path) => readFile(path, "utf8"))
      )
    ).join("\n");
    expect(staticRuntimeOutput).not.toContain(index.integrity.checksum);
  }, 30_000);

  test("does not prerender dynamic Assets paths that cannot match string route params", async () => {
    const index = await createTestAssetIndex([
      {
        ...indexedDocument,
        properties: { slug: 123 },
      },
      {
        ...indexedDocument,
        _id: "boolean-slug",
        revision: "boolean-revision",
        properties: { slug: true },
      },
    ]);
    const resource = createQueryResource();
    resource.body = createStructuredAssetQueryResourceBody({
      where: {
        all: [
          {
            field: ["properties", "slug"],
            operator: "eq",
            value: "system.params.slug",
          },
        ],
      },
      sort: [],
      limit: "1",
      offset: "0",
      output: { mode: "all", includeMetadata: true },
      content: { mode: "none" },
    });

    expect(
      getAssetResourcePrerenderPaths({
        pagePath: "/blog/:slug",
        resources: [["post", resource]],
        index,
      })
    ).toEqual([]);
  });

  test("uses JavaScript literals when filtering prerender candidates", async () => {
    const index = await createTestAssetIndex({
      ...indexedDocument,
      properties: { slug: "hello-world", status: "draft" },
    });
    const resource = createQueryResource();
    resource.body = createStructuredAssetQueryResourceBody({
      where: {
        all: [
          {
            field: ["properties", "status"],
            operator: "eq",
            value: "'published'",
          },
          {
            field: ["properties", "slug"],
            operator: "eq",
            value: "system.params.slug",
          },
        ],
      },
      sort: [],
      limit: "1",
      offset: "0",
      output: { mode: "all", includeMetadata: true },
      content: { mode: "none" },
    });

    expect(
      getAssetResourcePrerenderPaths({
        pagePath: "/blog/:slug",
        resources: [["post", resource]],
        index,
      })
    ).toEqual([]);
  });

  test("prerenders canonical and alternative asset routes from any groups", async () => {
    const index = await createTestAssetIndex({
      ...indexedDocument,
      properties: {
        slug: "hello-world",
        id: "post-123",
        aliases: ["original-title"],
        draft: false,
      },
    });
    const resource = createQueryResource();
    resource.body = createStructuredAssetQueryResourceBody({
      where: {
        all: [
          {
            field: ["properties", "draft"],
            operator: "ne",
            value: "true",
          },
          {
            any: [
              {
                field: ["properties", "slug"],
                operator: "eq",
                value: "system.params.identifier",
              },
              {
                field: ["properties", "id"],
                operator: "eq",
                value: "system.params.identifier",
              },
              {
                field: ["properties", "aliases"],
                operator: "contains",
                value: "system.params.identifier",
              },
            ],
          },
        ],
      },
      sort: [],
      limit: "1",
      offset: "0",
      output: { mode: "all", includeMetadata: true },
      content: { mode: "none" },
    });

    expect(
      getAssetResourcePrerenderPaths({
        pagePath: "/blog/:identifier",
        resources: [["post", resource]],
        index,
        requireCompleteEnumeration: true,
      })
    ).toEqual(["/blog/hello-world", "/blog/original-title", "/blog/post-123"]);
  });

  test("prerenders multi-parameter routes from one Assets query", async () => {
    const index = await createTestAssetIndex([
      {
        ...indexedDocument,
        properties: { category: "news", slug: "hello-world" },
      },
      {
        ...indexedDocument,
        _id: "other-post",
        revision: "other-revision",
        properties: { category: "guides", slug: "getting-started" },
      },
    ]);
    const resource = createQueryResource();
    resource.body = createStructuredAssetQueryResourceBody({
      where: {
        all: [
          {
            field: ["properties", "category"],
            operator: "eq",
            value: "system.params.category",
          },
          {
            field: ["properties", "slug"],
            operator: "eq",
            value: "system.params.slug",
          },
        ],
      },
      sort: [],
      limit: "1",
      offset: "0",
      output: { mode: "all", includeMetadata: true },
      content: { mode: "none" },
    });

    expect(
      getAssetResourcePrerenderPaths({
        pagePath: "/blog/:category/:slug",
        resources: [["post", resource]],
        index,
        requireCompleteEnumeration: true,
      })
    ).toEqual(["/blog/guides/getting-started", "/blog/news/hello-world"]);
  });

  test("rejects multi-parameter SSG routes split across Assets queries", async () => {
    const index = await createTestAssetIndex({
      ...indexedDocument,
      properties: { category: "news", slug: "hello-world" },
    });
    const createParameterResource = (parameter: "category" | "slug") => {
      const resource = createQueryResource();
      resource.body = createStructuredAssetQueryResourceBody({
        where: {
          all: [
            {
              field: ["properties", parameter],
              operator: "eq",
              value: `system.params.${parameter}`,
            },
          ],
        },
        sort: [],
        limit: "1",
        offset: "0",
        output: { mode: "all", includeMetadata: true },
        content: { mode: "none" },
      });
      return resource;
    };

    expect(() =>
      getAssetResourcePrerenderPaths({
        pagePath: "/blog/:category/:slug",
        resources: [
          ["category", createParameterResource("category")],
          ["slug", createParameterResource("slug")],
        ],
        index,
        requireCompleteEnumeration: true,
      })
    ).toThrow(
      "Dynamic SSG route parameters must be completely enumerated by one Assets query"
    );
  });

  test("ignores Assets queries unrelated to dynamic SSG route parameters", async () => {
    const index = await createTestAssetIndex({
      ...indexedDocument,
      properties: { slug: "hello-world", draft: false },
    });
    const resource = createQueryResource();
    resource.body = createStructuredAssetQueryResourceBody({
      where: {
        all: [
          {
            field: ["properties", "draft"],
            operator: "eq",
            value: "false",
          },
        ],
      },
      sort: [],
      limit: "20",
      offset: "0",
      output: { mode: "all", includeMetadata: true },
      content: { mode: "none" },
    });

    expect(
      getAssetResourcePrerenderPaths({
        pagePath: "/blog/:slug",
        resources: [["posts", resource]],
        index,
        requireCompleteEnumeration: true,
      })
    ).toEqual([]);
  });

  test("prerenders asset routes bound with optional member expressions", async () => {
    const index = await createTestAssetIndex({
      ...indexedDocument,
      properties: { slug: "hello-world" },
    });
    const resource = createQueryResource();
    resource.body = createStructuredAssetQueryResourceBody({
      where: {
        all: [
          {
            field: ["properties", "slug"],
            operator: "eq",
            value: 'system?.params?.["slug"]',
          },
        ],
      },
      sort: [],
      limit: "1",
      offset: "0",
      output: { mode: "all", includeMetadata: true },
      content: { mode: "none" },
    });

    expect(
      getAssetResourcePrerenderPaths({
        pagePath: "/blog/:slug",
        resources: [["post", resource]],
        index,
      })
    ).toEqual(["/blog/hello-world"]);
  });

  test("prerenders asset routes bound with the persisted system variable", async () => {
    const index = await createTestAssetIndex({
      ...indexedDocument,
      properties: { slug: "hello-world" },
    });
    const resource = createQueryResource();
    resource.body = createStructuredAssetQueryResourceBody({
      where: {
        all: [
          {
            field: ["properties", "slug"],
            operator: "eq",
            value: `${encodeDataSourceVariable(SYSTEM_VARIABLE_ID)}.params.slug`,
          },
        ],
      },
      sort: [],
      limit: "1",
      offset: "0",
      output: { mode: "all", includeMetadata: true },
      content: { mode: "none" },
    });

    expect(
      getAssetResourcePrerenderPaths({
        pagePath: "/blog/:slug",
        resources: [["post", resource]],
        index,
      })
    ).toEqual(["/blog/hello-world"]);
  });

  test("deduplicates collection routes matched by multiple assets", async () => {
    const index = await createTestAssetIndex([
      { ...indexedDocument, properties: { slug: "shared" } },
      {
        ...indexedDocument,
        _id: "other-post",
        revision: "other-revision",
        properties: { slug: "shared" },
      },
    ]);
    const resource = createQueryResource();
    resource.body = createStructuredAssetQueryResourceBody({
      where: {
        all: [
          {
            field: ["properties", "slug"],
            operator: "eq",
            value: "system.params.slug",
          },
        ],
      },
      sort: [],
      limit: "1",
      offset: "0",
      output: { mode: "all", includeMetadata: true },
      content: { mode: "none" },
    });

    expect(
      getAssetResourcePrerenderPaths({
        pagePath: "/blog/:slug",
        resources: [["post", resource]],
        index,
      })
    ).toEqual(["/blog/shared"]);
  });

  test("rejects SSG filters whose route values cannot be completely enumerated", async () => {
    const index = await createTestAssetIndex({
      ...indexedDocument,
      properties: { slug: "hello-world" },
    });
    const resource = createQueryResource();
    resource.body = createStructuredAssetQueryResourceBody({
      where: {
        all: [
          {
            field: ["properties", "slug"],
            operator: "startsWith",
            value: "system.params.slug",
          },
        ],
      },
      sort: [],
      limit: "20",
      offset: "0",
      output: { mode: "all", includeMetadata: true },
      content: { mode: "none" },
    });

    expect(() =>
      getAssetResourcePrerenderPaths({
        pagePath: "/blog/:slug",
        resources: [["posts", resource]],
        index,
        requireCompleteEnumeration: true,
      })
    ).toThrow('route parameter "slug" cannot be completely enumerated');
  });

  test("rejects SSG route parameters unconstrained by an alternative query branch", async () => {
    const index = await createTestAssetIndex({
      ...indexedDocument,
      properties: { slug: "hello-world", draft: false },
    });
    const resource = createQueryResource();
    resource.body = createStructuredAssetQueryResourceBody({
      where: {
        any: [
          {
            field: ["properties", "slug"],
            operator: "eq",
            value: "system.params.slug",
          },
          {
            field: ["properties", "draft"],
            operator: "eq",
            value: "false",
          },
        ],
      },
      sort: [],
      limit: "20",
      offset: "0",
      output: { mode: "all", includeMetadata: true },
      content: { mode: "none" },
    });

    expect(() =>
      getAssetResourcePrerenderPaths({
        pagePath: "/blog/:slug",
        resources: [["posts", resource]],
        index,
        requireCompleteEnumeration: true,
      })
    ).toThrow('route parameter "slug" cannot be completely enumerated');
  });

  test("prerenders SSG pages with asset query data", async () => {
    const document = {
      ...indexedDocument,
      path: "blog/post.md",
      size: 1,
      properties: { title: "Prerendered post" },
    };
    const index = await createTestAssetIndex(document);
    const siteData = {
      ...createSiteData({
        assets: [createAssetForIndexedDocument(document)],
      }),
      assetIndex: index,
    };
    siteData.build.resources = [
      [
        "posts",
        {
          id: "posts",
          name: "Posts",
          control: "system",
          method: "post",
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
          "post-1": {
            id: "post-1",
            properties: { title: "Prerendered post" },
          },
        },
        meta: { totalCount: 1, hasMore: false },
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
