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
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:http";
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
import { contentEngineLimits } from "@webstudio-is/content-engine/limits";
import { createPublishedAssetResourceFetch } from "@webstudio-is/content-engine/runtime";
import {
  createStructuredAssetQueryResourceBody,
  encodeDataSourceVariable,
  encodeDataVariableId,
  SYSTEM_VARIABLE_ID,
  type Resource,
  type ResourceRequest,
} from "@webstudio-is/sdk";
import { generateRemixRoute, showAttribute } from "@webstudio-is/react-sdk";
import { submitManagedForm } from "@webstudio-is/sdk-components-react";
import {
  formBotFieldName,
  formIdFieldName,
  getManagedFormFailure,
  managedFormArrayNamesFieldName,
  managedFormIdFieldName,
  managedFormRequestParamName,
} from "@webstudio-is/sdk/runtime";
import { createProtectedResourceFetch } from "@webstudio-is/sdk/protected-resource-fetch";
import {
  generateRedirectsModule,
  getAssetResourcePrerenderPaths,
  materializeAssetIndex,
  prebuild,
} from "./prebuild";
import { generateResponseHeadersModule } from "./response-headers";

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
  command: "react-router" | "remix" | "tsc" | "vite" | "vike",
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
  vi.unstubAllGlobals();
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
  test("generates a private Email binding adapter only for Cloudflare sites", async () => {
    await prebuild({
      assets: false,
      template: ["react-router", "react-router-cloudflare"],
    });
    const cloudflareAdapter = await readFile(
      "app/__generated__/$resources.managed-form-fetch.server.ts",
      "utf8"
    );
    expect(cloudflareAdapter).toContain("cloudflare?.env;");
    expect(cloudflareAdapter).toContain("env?.EMAIL_SERVICE;");
    expect(cloudflareAdapter).toContain(
      "createCloudflareManagedFormEmailSender"
    );
    expect(cloudflareAdapter).toContain("EMAIL_SERVICE_URL");
    expect(cloudflareAdapter).toContain("TRPC_SERVER_API_TOKEN");
    expect(cloudflareAdapter).toContain(
      "createCloudflareManagedFormEmailSenderWithUrl"
    );
    expect(cloudflareAdapter.indexOf("EMAIL_SERVICE_URL")).toBeLessThan(
      cloudflareAdapter.indexOf("EMAIL_SERVICE;")
    );
    expect(cloudflareAdapter).toContain("service, formData, projectId");

    await prebuild({ assets: false, template: ["react-router"] });
    const nodeAdapter = await readFile(
      "app/__generated__/$resources.managed-form-fetch.server.ts",
      "utf8"
    );
    expect(nodeAdapter).toContain(
      "createManagedFormEmailSender = (_input: { context: unknown; formData: FormData; projectId: string }) => undefined"
    );
    expect(nodeAdapter).not.toContain("EMAIL_SERVICE");
  });

  test("publishes configured file-input attributes", async () => {
    await writeSiteData(
      createSiteData({
        instances: [
          [
            "root",
            {
              id: "root",
              component: "NativeForm",
              children: [{ type: "id", value: "upload" }],
            },
          ],
          [
            "upload",
            {
              id: "upload",
              component: "ws:element",
              tag: "input",
              children: [],
            },
          ],
        ],
        props: [
          ...(["type", "name", "accept"] as const).map(
            (name) =>
              [
                name,
                {
                  id: name,
                  instanceId: "upload",
                  name,
                  type: "string" as const,
                  value:
                    name === "type"
                      ? "file"
                      : name === "name"
                        ? "attachments"
                        : "image/*,.pdf",
                },
              ] as [string, Prop]
          ),
          ...(["required", "multiple"] as const).map(
            (name) =>
              [
                name,
                {
                  id: name,
                  instanceId: "upload",
                  name,
                  type: "boolean" as const,
                  value: true,
                },
              ] as [string, Prop]
          ),
        ],
      })
    );

    await prebuild({ assets: false, template: ["react-router"] });

    const page = await readFile("app/__generated__/_index.tsx", "utf8");
    expect(page).toContain('type={"file"}');
    expect(page).toContain('name={"attachments"}');
    expect(page).toContain('accept={"image/*,.pdf"}');
    expect(page).toContain("required={true}");
    expect(page).toContain("multiple={true}");
  });

  test("preserves the legacy Contact recipients without a separate Form confirmation", async () => {
    const siteData = createSiteData({
      pageMeta: {
        contactEmail: '"Team, West" <team@example.com>',
        emailSender: "Owner <owner@example.com>",
        emailSubject: "New request",
        emailBody: "Thanks for contacting us.",
        emailConfirmationSubject: "Received",
        emailConfirmationBody: "We received your request.",
      },
    });
    await writeSiteData(siteData);
    await prebuild({
      assets: false,
      template: ["react-router"],
      preserveRouteTemplates: true,
    });
    const generated = await readFile(
      "app/__generated__/_index.server.tsx",
      "utf8"
    );
    expect(generated).toContain(
      'export const contactEmail = "\\"Team, West\\" <team@example.com>"'
    );
    expect(generated).not.toContain("export const emailDefaults");
  });
  test("rejects Assets queries without a content database without changing generated files", async () => {
    const siteData = createSiteData();
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
    await writeSiteData(siteData);
    const existingFiles = [
      "app/routes/_index.tsx",
      "app/__generated__/index.ts",
    ];
    for (const file of existingFiles) {
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, "previous build");
    }

    await expect(
      prebuild({ assets: false, template: ["defaults"] })
    ).rejects.toThrow(
      "Assets queries require a content database. Sync the project again before building."
    );
    for (const file of existingFiles) {
      await expect(readFile(file, "utf8")).resolves.toBe("previous build");
    }
  });

  test("publishes custom headers and refreshes them on incremental builds", async () => {
    const projectSettings = {
      meta: {
        customHeaders: [
          {
            name: "Content-Security-Policy",
            value: "frame-ancestors https://example.com",
          },
          { name: "X-Frame-Options", value: "DENY" },
        ],
      },
      compiler: {},
    };
    const data = createSiteData();
    const bundle = { ...data, build: { ...data.build, projectSettings } };
    await writeFile(".webstudio/data.json", JSON.stringify(bundle));
    await prebuild({
      assets: false,
      template: ["defaults"],
      preserveRouteTemplates: true,
    });
    const file = "app/__generated__/$resources.headers.server.ts";
    await expect(readFile(file, "utf8")).resolves.toBe(
      generateResponseHeadersModule(projectSettings)
    );

    bundle.build.projectSettings.meta.customHeaders = [];
    await writeFile(".webstudio/data.json", JSON.stringify(bundle));
    await prebuild({
      assets: false,
      template: ["defaults"],
      incremental: true,
    });
    await expect(readFile(file, "utf8")).resolves.toBe(
      generateResponseHeadersModule()
    );
  });

  test.each(["defaults", "react-router", "ssg"])(
    "does not scaffold a default root favicon with the %s template",
    async (template) => {
      await writeSiteData(
        createSiteData({ pageMeta: { faviconAssetId: "asset-image" } })
      );
      await prebuild({ assets: false, template: [template] });

      await expect(stat("public/favicon.ico")).rejects.toMatchObject({
        code: "ENOENT",
      });
      await expect(
        readFile("app/__generated__/_index.tsx", "utf8")
      ).resolves.toContain('"image.png"');
      const headPath =
        template === "ssg" ? "pages/index/+Head.tsx" : "app/routes/_index.tsx";
      await expect(readFile(headPath, "utf8")).resolves.toContain(
        template === "ssg" ? 'rel="icon"' : 'rel: "icon"'
      );
    }
  );

  test.each([true, false, undefined])(
    "requires direct MDX source content (available: %s)",
    async (hasSource) => {
      const source = "# Published from MDX";
      const article: AssetFileDocument = {
        ...indexedDocument,
        _id: "article",
        name: "article.mdx",
        path: "article.mdx",
        key: "article",
        extension: "mdx",
        mimeType: "text/mdx",
        size: new TextEncoder().encode(source).byteLength,
        revision: "article-revision",
        contentRef: "article.mdx",
        properties: {},
      };
      const siteData = createSiteData({
        assets: [createAssetForIndexedDocument(article)],
        instances: [
          [
            "root",
            {
              id: "root",
              component: "Box",
              children: [{ type: "id", value: "content" }],
            },
          ],
          [
            "content",
            {
              id: "content",
              component: "ws:block",
              children: [{ type: "id", value: "content-templates" }],
            },
          ],
          [
            "content-templates",
            {
              id: "content-templates",
              component: "ws:block-template",
              children: [],
            },
          ],
        ],
        props: [
          [
            "content-src",
            {
              id: "content-src",
              instanceId: "content",
              name: "src",
              type: "asset",
              value: "article",
            },
          ],
        ],
      });
      const siteDataWithIndex = {
        ...siteData,
        assetIndex:
          hasSource === undefined
            ? undefined
            : await createTestAssetIndex(
                article,
                hasSource
                  ? {
                      "article.mdx": source,
                    }
                  : {}
              ),
      };
      await writeSiteData(siteDataWithIndex);

      if (!hasSource) {
        await expect(
          prebuild({ assets: false, template: ["react-router"] })
        ).rejects.toThrow(
          hasSource === undefined
            ? "require a content database"
            : 'Published MDX Asset "article" could not be loaded'
        );
        return;
      }

      await prebuild({ assets: false, template: ["react-router"] });

      const generatedPage = await readFile(
        "app/__generated__/_index.tsx",
        "utf8"
      );
      expect(generatedPage).toContain("Published from MDX");
      expect(generatedPage).not.toContain("fetch(");
    }
  );

  test("materializes Content Blocks introduced by an MDX template", async () => {
    const outerSource = '<ws.element ws:name="Nested" />';
    const innerSource = "# Nested published content";
    const createMdxDocument = (
      id: string,
      source: string
    ): AssetFileDocument => ({
      ...indexedDocument,
      _id: id,
      name: `${id}.mdx`,
      path: `${id}.mdx`,
      key: id,
      extension: "mdx",
      mimeType: "text/mdx",
      size: new TextEncoder().encode(source).byteLength,
      revision: `${id}-revision`,
      contentRef: `${id}.mdx`,
      properties: {},
    });
    const outer = createMdxDocument("outer", outerSource);
    const inner = createMdxDocument("inner", innerSource);
    const siteData = createSiteData({
      assets: [outer, inner].map(createAssetForIndexedDocument),
      instances: [
        [
          "root",
          {
            id: "root",
            component: "Box",
            children: [{ type: "id", value: "outer-block" }],
          },
        ],
        [
          "outer-block",
          {
            id: "outer-block",
            component: "ws:block",
            children: [{ type: "id", value: "templates" }],
          },
        ],
        [
          "templates",
          {
            id: "templates",
            component: "ws:block-template",
            children: [{ type: "id", value: "nested-block" }],
          },
        ],
        [
          "nested-block",
          {
            id: "nested-block",
            component: "ws:block",
            label: "Nested",
            children: [{ type: "id", value: "nested-templates" }],
          },
        ],
        [
          "nested-templates",
          {
            id: "nested-templates",
            component: "ws:block-template",
            children: [],
          },
        ],
      ],
      props: [
        [
          "outer-source",
          {
            id: "outer-source",
            instanceId: "outer-block",
            name: "src",
            type: "asset",
            value: "outer",
          },
        ],
        [
          "inner-source",
          {
            id: "inner-source",
            instanceId: "nested-block",
            name: "src",
            type: "asset",
            value: "inner",
          },
        ],
      ],
    });
    const siteDataWithIndex = {
      ...siteData,
      assetIndex: await createTestAssetIndex([outer, inner], {
        "outer.mdx": outerSource,
        "inner.mdx": innerSource,
      }),
    };
    await writeSiteData(siteDataWithIndex);

    await prebuild({ assets: false, template: ["react-router"] });

    await expect(
      readFile("app/__generated__/_index.tsx", "utf8")
    ).resolves.toContain("Nested published content");
  });

  test("warns and stops excessive published Content Block expansion", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const source = "# Published";
    const article: AssetFileDocument = {
      ...indexedDocument,
      _id: "article",
      name: "article.mdx",
      path: "article.mdx",
      key: "article",
      extension: "mdx",
      mimeType: "text/mdx",
      size: new TextEncoder().encode(source).byteLength,
      revision: "article-revision",
      contentRef: "article.mdx",
      properties: {},
    };
    const blockIds = Array.from(
      { length: contentEngineLimits.candidateDocuments + 1 },
      (_, index) => `content-${index}`
    );
    const siteData = createSiteData({
      assets: [createAssetForIndexedDocument(article)],
      instances: [
        [
          "root",
          {
            id: "root",
            component: "Box",
            children: blockIds.map((value) => ({ type: "id", value })),
          },
        ],
        ...blockIds.map(
          (id) =>
            [id, { id, component: "ws:block", children: [] }] as [
              string,
              Omit<Instance, "type">,
            ]
        ),
      ],
      props: blockIds.map((instanceId) => [
        `${instanceId}-source`,
        {
          id: `${instanceId}-source`,
          instanceId,
          name: "src",
          type: "asset",
          value: "article",
        },
      ]),
    });
    const siteDataWithIndex = {
      ...siteData,
      assetIndex: await createTestAssetIndex(article, {
        "article.mdx": source,
      }),
    };
    await writeSiteData(siteDataWithIndex);

    await prebuild({ assets: false, template: ["react-router"] });

    expect(
      warn.mock.calls
        .map(([message]) => JSON.parse(String(message)))
        .find(
          ({ message }) =>
            message ===
            "Published MDX Content Block count exceeds the safe limit"
        )
    ).toMatchObject({
      type: "webstudio-build-warning",
      feature: "content-block-mdx",
      code: "invalid-mdx",
      severity: "error",
    });
  });

  test("materializes finite dynamic MDX candidates without publishing unrelated files", async () => {
    const createDocument = (
      id: string,
      extension: "json" | "mdx",
      properties?: Record<string, string>
    ): AssetFileDocument => ({
      ...indexedDocument,
      _id: id,
      name: `${id}.${extension}`,
      path: `${id}.${extension}`,
      key: id,
      extension,
      mimeType: extension === "mdx" ? "text/mdx" : "application/json",
      revision: `${id}-revision`,
      contentRef: `${id}.${extension}`,
      properties: properties ?? {},
    });
    const post = createDocument("post", "json", {
      category: "published",
      mdx: "article",
    });
    const privatePost = createDocument("private-post", "json", {
      category: "private",
      mdx: "private",
    });
    const article = createDocument("article", "mdx");
    const privateArticle = createDocument("private", "mdx");
    const documents = [post, privatePost, article, privateArticle];
    const sourceExpression = `${encodeDataSourceVariable(
      "posts-data"
    )}.data.properties.mdx`;
    const siteData = createSiteData({
      assets: [
        ...documents.map(createAssetForIndexedDocument),
        {
          id: "dynamic-background",
          projectId: "project-1",
          name: "dynamic.png",
          type: "image",
          format: "png",
          size: 1,
          meta: { width: 1, height: 1 },
          description: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      instances: [
        [
          "root",
          {
            id: "root",
            component: "Box",
            children: [{ type: "id", value: "content" }],
          },
        ],
        [
          "content",
          {
            id: "content",
            component: "ws:block",
            children: [{ type: "id", value: "templates" }],
          },
        ],
        [
          "templates",
          {
            id: "templates",
            component: "ws:block-template",
            children: [{ type: "id", value: "dynamic-card" }],
          },
        ],
        [
          "dynamic-card",
          {
            id: "dynamic-card",
            component: "ws:element",
            tag: "section",
            label: "Dynamic card",
            children: [],
          },
        ],
      ],
      props: [
        [
          "content-src",
          {
            id: "content-src",
            instanceId: "content",
            name: "src",
            type: "expression",
            value: sourceExpression,
          },
        ],
      ],
    });
    siteData.build.dataSources = [
      [
        "posts-data",
        {
          type: "resource",
          id: "posts-data",
          scopeInstanceId: "root",
          name: "posts",
          resourceId: "posts",
        },
      ],
    ] as never;
    siteData.build.resources = [
      [
        "posts",
        {
          ...createQueryResource(),
          body: createStructuredAssetQueryResourceBody({
            where: {
              all: [
                {
                  field: ["properties", "category"],
                  operator: "eq",
                  value: '"published"',
                },
              ],
            },
            sort: [],
            limit: "100",
            offset: "0",
            output: { mode: "all", includeMetadata: true },
            content: { mode: "none" },
          }),
        },
      ],
    ] as never;
    siteData.build.styleSources = [
      ["dynamic-style", { type: "local", id: "dynamic-style" }],
    ] as never;
    siteData.build.styleSourceSelections = [
      [
        "dynamic-card",
        { instanceId: "dynamic-card", values: ["dynamic-style"] },
      ],
    ] as never;
    siteData.build.breakpoints = [["base", { id: "base", label: "" }]] as never;
    siteData.build.styles = [
      [
        "dynamic-background-style",
        {
          styleSourceId: "dynamic-style",
          breakpointId: "base",
          property: "backgroundImage",
          value: {
            type: "layers",
            value: [
              {
                type: "image",
                value: { type: "asset", value: "dynamic-background" },
              },
            ],
          },
        },
      ],
    ] as never;
    const siteDataWithIndex = {
      ...siteData,
      assetIndex: await createTestAssetIndex(documents, {
        "article.mdx":
          '# Public article\n\n<ws.element ws:name="Dynamic card" />',
        "private.mdx": "# Private article",
      }),
    };
    await writeSiteData(siteDataWithIndex);

    await prebuild({ assets: false, template: ["react-router"] });

    const generatedPage = await readFile(
      "app/__generated__/_index.tsx",
      "utf8"
    );
    expect(generatedPage).toContain("Public article");
    expect(generatedPage).not.toContain("Private article");
    expect(generatedPage).toContain('=== "article"');
    expect(generatedPage).toContain("<section");
    expect(generatedPage).not.toContain('"dynamic.png"');
  });

  test("rejects a dynamic MDX source without a content database", async () => {
    const siteData = createSiteData({
      instances: [
        [
          "root",
          {
            id: "root",
            component: "Box",
            children: [{ type: "id", value: "content" }],
          },
        ],
        ["content", { id: "content", component: "ws:block", children: [] }],
      ],
      props: [
        [
          "content-src",
          {
            id: "content-src",
            instanceId: "content",
            name: "src",
            type: "expression",
            value: "post.body",
          },
        ],
      ],
    });
    await writeSiteData(siteData);

    await expect(
      prebuild({ assets: false, template: ["react-router"] })
    ).rejects.toThrow("require a content database");
  });

  test("excludes resources in statically hidden subtrees", async () => {
    const siteData = createSiteData({
      instances: [
        [
          "root",
          {
            id: "root",
            component: "Body",
            children: [
              { type: "id", value: "hidden" },
              { type: "id", value: "visible" },
              { type: "id", value: "dynamic" },
            ],
          },
        ],
        [
          "hidden",
          {
            id: "hidden",
            component: "Box",
            children: [{ type: "id", value: "hidden-child" }],
          },
        ],
        [
          "hidden-child",
          { id: "hidden-child", component: "Box", children: [] },
        ],
        ["visible", { id: "visible", component: "Box", children: [] }],
        ["dynamic", { id: "dynamic", component: "Box", children: [] }],
      ],
      props: [
        [
          "hidden-show",
          {
            id: "hidden-show",
            instanceId: "hidden",
            name: showAttribute,
            type: "boolean",
            value: false,
          },
        ],
        [
          "dynamic-show",
          {
            id: "dynamic-show",
            instanceId: "dynamic",
            name: showAttribute,
            type: "expression",
            value: "false",
          },
        ],
      ],
    });
    const resourceNames = ["hidden", "hidden-child", "visible", "dynamic"];
    siteData.build.dataSources = resourceNames.map((name) => [
      `${name}-data-source`,
      {
        id: `${name}-data-source`,
        scopeInstanceId: name,
        type: "resource",
        name,
        resourceId: `${name}-resource`,
      },
    ]) as never;
    siteData.build.resources = resourceNames.map((name) => [
      `${name}-resource`,
      {
        id: `${name}-resource`,
        name,
        url: JSON.stringify(`https://example.com/${name}`),
        method: "get",
        headers: [],
      },
    ]) as never;
    await writeSiteData(siteData);

    await prebuild({
      assets: false,
      template: ["react-router"],
      preserveRouteTemplates: true,
    });

    const generatedServer = await readFile(
      "app/__generated__/_index.server.tsx",
      "utf8"
    );
    expect(generatedServer).not.toContain("https://example.com/hidden");
    expect(generatedServer).not.toContain("https://example.com/hidden-child");
    expect(generatedServer).toContain("https://example.com/visible");
    expect(generatedServer).toContain("https://example.com/dynamic");
  });

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
    expect(findElementsByTagName(legacyCode, "span").length).toBeGreaterThan(0);
    expect(getTextContent(legacyCode)).toBe("legacy <code>");
  }, 60_000);

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
    expect(assetsModule).toContain("export const assetUrlsByPath");
    expect(assetsModule).toContain('"/audio.mp3": "/assets/audio.mp3"');
    expect(assetsModule).not.toContain("/cgi/");

    const route = await readFile("app/routes/_index.tsx", "utf8");
    expect(route).toContain("assetUrlsByPath");
    expect(route).toContain("assetUrlsByPath,");
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

  test.each(["mdx", "md"])(
    "fetches a synced %s asset over HTTP in a dynamic SSR build",
    async (extension) => {
      const source = "# Published post\n";
      const name = `post.${extension}`;
      const index = await createTestAssetIndex({
        ...indexedDocument,
        name,
        path: `blog/${name}`,
        extension,
        mimeType: extension === "mdx" ? "text/mdx" : "text/markdown",
        contentRef: name,
        size: new TextEncoder().encode(source).byteLength,
        properties: { slug: "post" },
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
        assets: [
          {
            id: "post-1",
            projectId: "project-id",
            name,
            type: "file" as const,
            format: extension,
            size: source.length,
            meta: {},
            description: "",
            createdAt: "2024-01-01T00:00:00.000Z",
          },
          {
            id: "draft",
            projectId: "project-id",
            name: `draft.${extension}`,
            type: "file" as const,
            format: extension,
            size: source.length,
            meta: {},
            description: "",
            createdAt: "2024-01-01T00:00:00.000Z",
          },
        ],
        assetIndex: index,
      };
      siteData.build.resources = [
        ["posts", createQueryResource("full")],
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
      await mkdir(".webstudio/assets", { recursive: true });
      await writeFile(`.webstudio/assets/${name}`, source, "utf8");
      await writeFile(
        `.webstudio/assets/draft.${extension}`,
        "draft secret",
        "utf8"
      );

      await prebuild({
        assets: true,
        template: ["react-router"],
      });

      await expect(
        readFile("app/routes/[blog].$slug._index.tsx", "utf8")
      ).resolves.toContain("createGeneratedAssetResourceFetch");
      await expect(readFile(`public/assets/${name}`, "utf8")).resolves.toBe(
        source
      );
      await expect(
        readFile(`public/assets/draft.${extension}`, "utf8")
      ).resolves.toBe("draft secret");
      const manifest = await readFile(
        "app/__generated__/$resources.asset-query-manifest.ts",
        "utf8"
      );
      expect(manifest).not.toContain("Published post");
      expect(manifest).not.toContain('"contents"');
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

      // Exercise the generated runtime against real locally served assets.
      // The preview/Vite server supplies the same public files in normal use.
      const runtimeBundle = await build({
        entryPoints: [
          join(tempDir, "app/__generated__/$resources.asset-query-runtime.ts"),
        ],
        bundle: true,
        format: "esm",
        platform: "node",
        write: false,
      });
      const runtime = await import(
        /* @vite-ignore */
        `data:text/javascript;base64,${Buffer.from(
          runtimeBundle.outputFiles[0].text
        ).toString("base64")}`
      );
      const requestedPaths: string[] = [];
      const server = createServer((request, response) => {
        requestedPaths.push(request.url ?? "");
        if (request.url !== `/assets/${name}`) {
          response.writeHead(404).end();
          return;
        }
        void readFile(join(tempDir, "build/client/assets", name)).then(
          (bytes) => response.end(bytes),
          () => response.writeHead(404).end()
        );
      });
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve)
      );
      try {
        const address = server.address();
        if (address === null || typeof address === "string") {
          throw new Error("Expected a local TCP server");
        }
        const origin = `http://127.0.0.1:${address.port}`;
        const generatedFetch = await runtime.createGeneratedAssetResourceFetch({
          request: new Request(`${origin}/blog/post`),
          context: {},
          fallback: originalFetch,
        });
        const response = await generatedFetch("/$resources/assets", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            query: {
              content: { mode: "full" },
              output: { mode: "all", includeMetadata: true },
            },
          }),
        });
        const data = await response.json();
        expect(response.status, JSON.stringify(data)).toBe(200);
        expect(data).toMatchObject({
          items: [{ id: "post-1", content: { text: source } }],
        });
        expect(requestedPaths).toEqual([`/assets/${name}`]);
      } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve()))
        );
      }
    },
    30_000
  );

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
    await mkdir(".webstudio/assets", { recursive: true });
    await writeFile(".webstudio/assets/post.md", "local post body\n", "utf8");

    await prebuild({
      assets: false,
      template: ["react-router"],
      preserveRouteTemplates: true,
    });

    await expect(
      readFile("app/__generated__/$resources.asset-query-manifest.ts", "utf8")
    ).resolves.toContain(index.integrity.checksum);
    await expect(
      readFile("app/__generated__/$resources.asset-query-manifest.ts", "utf8")
    ).resolves.not.toContain("local post body");
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

  test.each(["production", "staging"] as const)(
    "keeps deferred published asset proxy URLs deployment-relative (%s)",
    async (target) => {
      const index = await createAssetIndex({
        projectId: "project-1",
        entries: [
          {
            ...createCanonicalAssetFileEntry({
              projectId: "project-1",
              document: indexedDocument,
            }),
            content: "# Indexed post body\n",
          },
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
        origin: "https://p-project-1.apps.webstudio.is",
        assetIndex: index,
        build: {
          ...baseSiteData.build,
          deployment: {
            destination: "saas" as const,
            target,
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
      const manifest = await readFile(
        "app/__generated__/$resources.asset-query-manifest.ts",
        "utf8"
      );
      expect(manifest).not.toContain("# Indexed post body");
      expect(runtimeModule).toContain('"url":"/cgi/asset/post.md?format=raw"');
      expect(runtimeModule).not.toContain("sourceUrl");
      expect(runtimeModule).not.toContain(
        "https://p-project-1.apps.webstudio.is/cgi/asset/"
      );
      expect(runtimeModule).not.toContain('"url":"/assets/post.md"');
      const assetsModule = await readFile(
        "app/__generated__/$resources.assets.ts",
        "utf8"
      );
      expect(assetsModule).toContain(
        '"/post.md": "/cgi/asset/post.md?format=raw"'
      );
      expect(assetsModule).not.toContain(
        "https://p-project-1.apps.webstudio.is/cgi/asset/"
      );

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
      const materializedManifest = await readFile(
        "app/__generated__/$resources.asset-query-manifest.ts",
        "utf8"
      );
      expect(materializedManifest).not.toContain("# Indexed post body");
      expect(materializedManifest).not.toContain('"contents"');
      expect(materializedRuntimeModule).toContain('"url":"/assets/post.md"');
      expect(materializedRuntimeModule).not.toContain("sourceUrl");
      expect(materializedRuntimeModule).not.toContain(
        '"url":"https://assets.example/cgi/asset/post.md?format=raw"'
      );
      const materializedAssetsModule = await readFile(
        "app/__generated__/$resources.assets.ts",
        "utf8"
      );
      expect(materializedAssetsModule).toContain(
        '"/post.md": "/assets/post.md"'
      );
    }
  );

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

  test.each(["defaults", "react-router"])(
    "uses page params and all query values in a managed Form Resource (%s)",
    async (template) => {
      const system = encodeDataSourceVariable(SYSTEM_VARIABLE_ID);
      const siteData = createSiteData({
        pages: [
          {
            id: "product",
            name: "Product",
            title: "Product",
            path: "/products/:slug",
            rootInstanceId: "root",
            meta: {},
          },
        ],
        instances: [
          ["root", { id: "root", component: "NativeForm", children: [] }],
        ],
        props: [
          [
            "submission",
            {
              id: "submission",
              instanceId: "root",
              name: "submission",
              type: "json",
              value: { destinations: ["destination"] },
            },
          ],
        ],
      });
      siteData.build.dataSources = [
        [
          SYSTEM_VARIABLE_ID,
          { id: SYSTEM_VARIABLE_ID, name: "system", type: "parameter" },
        ],
        [
          "destination",
          {
            id: "destination",
            name: "Destination",
            type: "resource",
            resourceId: "submit",
            scopeInstanceId: "root",
          },
        ],
      ] as never;
      siteData.build.resources = [
        [
          "submit",
          {
            id: "submit",
            name: "Submit",
            method: "post",
            url: `"https://receiver.example/" + ${system}.params.slug + "?source=" + ${system}.search.source`,
            headers: [
              { name: "X-Selected", value: `${system}.searchAll.tag[0]` },
            ],
            body: `{ slug: ${system}.params.slug, tags: ${system}.searchAll.tag }`,
          },
        ],
      ] as never;
      await writeSiteData(siteData);
      await prebuild({ assets: false, template: [template] });
      await writeFile(
        join(
          tempDir,
          "app/__generated__/$resources.managed-form-fetch.server.ts"
        ),
        "export const createManagedFormEmailSender = () => undefined;\nexport const validateManagedFormEmail = () => undefined;\nexport const createManagedFormResourceFetch = () => globalThis.__testManagedFormFetch;\n"
      );
      await symlink(join(originalCwd, "node_modules"), "node_modules", "dir");
      await build({
        stdin: {
          contents:
            'export { action } from "./app/routes/[products].$slug._index"',
          resolveDir: tempDir,
        },
        outfile: join(tempDir, "managed-action.mjs"),
        bundle: true,
        platform: "node",
        format: "esm",
        packages: "external",
        loader: { ".css": "text" },
      });
      const { action } = await import(
        pathToFileURL(join(tempDir, "managed-action.mjs")).href
      );
      const received: Array<{
        url: string;
        selected: string | null;
        body: unknown;
      }> = [];
      vi.stubGlobal(
        "__testManagedFormFetch",
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          const request = new Request(input, init);
          received.push({
            url: request.url,
            selected: request.headers.get("X-Selected"),
            body: await request.json(),
          });
          return Response.json({ accepted: true });
        })
      );
      const form = new FormData();
      form.set(managedFormIdFieldName, "root");
      form.set(formBotFieldName, "brave");
      form.set(managedFormArrayNamesFieldName, "[]");
      form.set("message", "Hello");
      await expect(
        action({
          request: new Request(
            `https://example.com/products/chair?source=newsletter&tag=&tag=red%2Cblue&tag=red%2Cblue&${managedFormRequestParamName}=1`,
            {
              method: "POST",
              headers: { host: "example.com" },
              body: form,
            }
          ),
          context: {},
          params: { slug: "chair" },
        })
      ).resolves.toMatchObject({ success: true });
      const nextForm = new FormData();
      nextForm.set(managedFormIdFieldName, "root");
      nextForm.set(formBotFieldName, "brave");
      nextForm.set(managedFormArrayNamesFieldName, "[]");
      await expect(
        action({
          request: new Request(
            `https://example.com/products/table?source=direct&tag=last&${managedFormRequestParamName}=1`,
            {
              method: "POST",
              headers: { host: "example.com" },
              body: nextForm,
            }
          ),
          context: {},
          params: { slug: "table" },
        })
      ).resolves.toMatchObject({ success: true });
      expect(received).toEqual([
        {
          url: "https://receiver.example/chair?source=newsletter",
          selected: "",
          body: { slug: "chair", tags: ["", "red,blue", "red,blue"] },
        },
        {
          url: "https://receiver.example/table?source=direct",
          selected: "last",
          body: { slug: "table", tags: ["last"] },
        },
      ]);
    }
  );

  test.each(["defaults", "react-router"])(
    "submits identical forms twice while caching dependencies (%s)",
    async (template) => {
      const siteData = createSiteData({
        instances: [["root", { id: "root", component: "Form", children: [] }]],
        props: [
          [
            "action",
            {
              id: "action",
              instanceId: "root",
              name: "action",
              type: "resource",
              value: "submit",
            },
          ],
        ],
      });
      siteData.build.dataSources = [
        [
          "author",
          {
            id: "author",
            name: "Author",
            type: "resource",
            resourceId: "author",
            scopeInstanceId: "root",
          },
        ],
      ] as never;
      siteData.build.resources = [
        [
          "author",
          {
            id: "author",
            name: "Author",
            method: "post",
            url: '"https://example.com/author"',
            body: '{ query: "author" }',
            headers: [{ name: "Cache-Control", value: '"public, max-age=60"' }],
          },
        ],
        [
          "submit",
          {
            id: "submit",
            name: "Submit",
            method: "post",
            url: `"https://example.com/submit/" + ${encodeDataSourceVariable(
              "author"
            )}.data.id`,
            headers: [{ name: "Cache-Control", value: '"public, max-age=60"' }],
          },
        ],
      ] as never;
      await writeSiteData(siteData);
      await prebuild({ assets: false, template: [template] });
      await symlink(join(originalCwd, "node_modules"), "node_modules", "dir");
      await build({
        stdin: {
          contents: 'export { action } from "./app/routes/_index"',
          resolveDir: tempDir,
        },
        outfile: join(tempDir, "action.mjs"),
        bundle: true,
        platform: "node",
        format: "esm",
        packages: "external",
        loader: { ".css": "text" },
      });
      const { action } = await import(
        pathToFileURL(join(tempDir, "action.mjs")).href
      );
      const cached = new Map<string, Response>();
      vi.stubGlobal("caches", {
        open: async () => ({
          match: async (key: URL) => cached.get(key.href)?.clone(),
          put: async (key: URL, response: Response) => {
            cached.set(key.href, response.clone());
          },
        }),
      });
      const received: Array<{ url: string; body: unknown }> = [];
      vi.stubGlobal(
        "fetch",
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const request = new Request(input, init);
          received.push({ url: request.url, body: await request.json() });
          return Response.json({ id: "author-123" });
        }
      );
      const expired = (Date.now() - 300_001).toString(16);
      const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        for (const [botValues, error] of [
          [[], "Form bot field not found"],
          [["malformed"], "Form bot value invalid malformed"],
          [[expired], `Form bot value invalid ${expired}`],
          [["stale", Date.now().toString(16)], "Form bot value invalid stale"],
        ] as const) {
          const invalidForm = new FormData();
          invalidForm.set(formIdFieldName, "action");
          for (const value of botValues) {
            invalidForm.append(formBotFieldName, value);
          }
          await expect(
            action({
              request: new Request("https://example.com/", {
                method: "POST",
                headers: { host: "example.com" },
                body: invalidForm,
              }),
              context: {},
            })
          ).resolves.toEqual({ success: false, errors: [error] });
        }
      } finally {
        errorLog.mockRestore();
      }
      expect(received).toHaveLength(0);
      for (let index = 0; index < 2; index += 1) {
        const form = new FormData();
        form.set(formIdFieldName, "action");
        form.set(formBotFieldName, "brave");
        form.set("message", "Hello");
        await expect(
          action({
            request: new Request("https://example.com/", {
              method: "POST",
              headers: { host: "example.com" },
              body: form,
            }),
            context: {},
          })
        ).resolves.toEqual({ success: true });
      }
      expect(received).toEqual([
        { url: "https://example.com/author", body: { query: "author" } },
        {
          url: "https://example.com/submit/author-123",
          body: { message: "Hello" },
        },
        {
          url: "https://example.com/submit/author-123",
          body: { message: "Hello" },
        },
      ]);
    }
  );

  test.each(["defaults", "react-router"])(
    "rejects invalid managed Form destinations before any request (%s)",
    async (template) => {
      const configurations = [
        ["empty", { destinations: [] }],
        ["too-many", { destinations: Array(6).fill("destination") }],
        ["duplicate", { destinations: ["destination", "destination"] }],
        ["missing", { destinations: ["missing"] }],
        ["malformed", { destinations: "destination" }],
        ["native", { mode: "native", destinations: ["destination"] }],
        ["valid", { destinations: ["destination"] }],
      ] as const;
      const siteData = createSiteData({
        instances: [
          [
            "root",
            {
              id: "root",
              component: "Box",
              children: configurations.map(([id]) => ({
                type: "id",
                value: id,
              })),
            },
          ],
          ...configurations.map(
            ([id]) =>
              [id, { id, component: "NativeForm", children: [] }] as [
                string,
                Omit<Instance, "type">,
              ]
          ),
        ],
        props: configurations.map(([id, value]) => [
          `${id}-submission`,
          {
            id: `${id}-submission`,
            instanceId: id,
            name: "submission",
            type: "json",
            value,
          },
        ]),
      });
      siteData.build.dataSources = [
        [
          "destination",
          {
            id: "destination",
            name: "Destination",
            type: "resource",
            resourceId: "remote",
            scopeInstanceId: "root",
          },
        ],
      ] as never;
      siteData.build.resources = [
        [
          "remote",
          {
            id: "remote",
            name: "Remote",
            method: "post",
            url: '"https://example.com/endpoint"',
            headers: [],
          },
        ],
      ] as never;
      await writeSiteData(siteData);
      await prebuild({ assets: false, template: [template] });
      await writeFile(
        join(
          tempDir,
          "app/__generated__/$resources.managed-form-fetch.server.ts"
        ),
        "export const createManagedFormEmailSender = () => undefined;\nexport const validateManagedFormEmail = () => undefined;\nexport const createManagedFormResourceFetch = () => globalThis.__testManagedFormFetch;\n"
      );
      await symlink(join(originalCwd, "node_modules"), "node_modules", "dir");
      await build({
        stdin: {
          contents: `export { action } from "./app/routes/_index";
            export { action as endpointAction } from "./app/routes/${generateRemixRoute(
              "/__ws-form"
            )}";`,
          resolveDir: tempDir,
        },
        outfile: join(tempDir, "action.mjs"),
        bundle: true,
        platform: "node",
        format: "esm",
        packages: "external",
        loader: { ".css": "text" },
      });
      const { action, endpointAction } = await import(
        pathToFileURL(join(tempDir, "action.mjs")).href
      );
      const outgoingFetch = vi.fn(async () => Response.json({ ok: true }));
      vi.stubGlobal("__testManagedFormFetch", outgoingFetch);
      const submit = (id: string, fields: Record<string, string> = {}) => {
        const form = new FormData();
        form.set(managedFormIdFieldName, id);
        form.set("message", "Hello");
        for (const [name, value] of Object.entries(fields)) {
          form.set(name, value);
        }
        return action({
          request: new Request(
            `https://example.com/?${managedFormRequestParamName}=1`,
            {
              method: "POST",
              headers: { host: "example.com" },
              body: form,
            }
          ),
          context: {},
        });
      };

      for (const [id, error] of [
        ["unknown", "Form submission settings not found"],
        ["empty", "Select at least one Resource destination"],
        ["too-many", "Select no more than 5 Resource destinations"],
        ["duplicate", "Select each Resource only once"],
        ["missing", "Resource destination not found"],
        ["malformed", "Form submission settings not found"],
        ["native", "Form submission settings not found"],
      ]) {
        await expect(submit(id)).resolves.toEqual(getManagedFormFailure(error));
      }
      await expect(submit("valid")).resolves.toEqual(
        getManagedFormFailure("Form bot field not found")
      );
      await expect(
        submit("valid", { [formBotFieldName]: "stale" })
      ).resolves.toEqual(getManagedFormFailure("Form bot value invalid stale"));
      const malformedHex = `${Date.now().toString(16)}not-hex`;
      await expect(
        submit("valid", { [formBotFieldName]: malformedHex })
      ).resolves.toEqual(
        getManagedFormFailure(`Form bot value invalid ${malformedHex}`)
      );
      await expect(
        submit("valid", {
          [formBotFieldName]: "brave",
          [managedFormArrayNamesFieldName]: "not-json",
        })
      ).resolves.toEqual(getManagedFormFailure("Invalid Form field groups"));
      const unmarked = new FormData();
      unmarked.set(managedFormIdFieldName, "valid");
      unmarked.set(formBotFieldName, "brave");
      await expect(
        action({
          request: new Request("https://example.com/", {
            method: "POST",
            headers: { host: "example.com" },
            body: unmarked,
          }),
          context: {},
        })
      ).resolves.toEqual({
        success: false,
        errors: ["Invalid Form submission"],
      });
      expect(outgoingFetch).not.toHaveBeenCalled();
      vi.stubGlobal("navigator", { brave: { isBrave: () => true } });
      await expect(
        submitManagedForm({
          values: { message: "Hello" },
          managedFormId: "valid",
          location: "https://example.com/?source=staging",
          fetch: async (input, init) => {
            const response: Response = await endpointAction({
              request: new Request(input, {
                ...init,
                headers: { host: "example.com" },
              }),
              context: {},
            });
            expect(response.headers.get("content-type")).toContain(
              "application/json"
            );
            return response;
          },
        })
      ).resolves.toEqual({
        success: true,
        status: 200,
        results: [{ resourceId: "remote", status: 200, body: { ok: true } }],
        errors: [],
      });
      expect(outgoingFetch).toHaveBeenCalledOnce();
    }
  );

  test.each(["defaults", "react-router"])(
    "serves managed Form results as JSON through the framework HTTP handler (%s)",
    async (template) => {
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
              id: "help",
              name: "Help",
              title: "Help",
              path: "/help/contact",
              rootInstanceId: "root",
              meta: {},
            },
            {
              id: "product",
              name: "Product",
              title: "Product",
              path: "/products/:slug",
              rootInstanceId: "root",
              meta: {},
            },
          ],
          instances: [
            ["root", { id: "root", component: "NativeForm", children: [] }],
          ],
          props: [
            [
              "submission",
              {
                id: "submission",
                instanceId: "root",
                name: "submission",
                type: "json",
                value: { destinations: [] },
              },
            ],
          ],
        })
      );
      await prebuild({ assets: false, template: [template] });
      if (template === "react-router") {
        await linkPackagedPreviewDependencies();
        await runGeneratedCommand("react-router", ["build"]);
      } else {
        await symlink(join(originalCwd, "node_modules"), "node_modules", "dir");
        const viteConfig = await readFile("vite.config.ts", "utf8");
        await writeFile(
          "vite.config.ts",
          viteConfig
            .replaceAll(
              'conditions: ["browser", "development|production"]',
              'conditions: ["webstudio", "browser", "development|production"]'
            )
            .replaceAll(
              'conditions: ["node", "development|production"]',
              'conditions: ["webstudio", "node", "development|production"]'
            )
        );
        await runGeneratedCommand("remix", ["vite:build"]);
      }
      const serverEntry = pathToFileURL(
        join(tempDir, "build/server/index.js")
      ).href;
      const handlerPackage =
        template === "react-router"
          ? "react-router"
          : "@remix-run/server-runtime";
      const runner = `
        import { createRequestHandler } from ${JSON.stringify(handlerPackage)};
        const serverBuild = await import(${JSON.stringify(serverEntry)});
        const handleRequest = createRequestHandler(serverBuild, "production");
        const results = [];
        for (const path of ["/__ws-form", "/__ws-form/help/contact", "/__ws-form/products/chair"]) {
          const form = new FormData();
          form.set(${JSON.stringify(managedFormIdFieldName)}, "root");
          form.set(${JSON.stringify(formBotFieldName)}, "brave");
          form.set(${JSON.stringify(managedFormArrayNamesFieldName)}, "[]");
          const response = await handleRequest(new Request(
            new URL(path, "https://example.com"),
            { method: "POST", body: form, headers: { host: "example.com" } }
          ));
          results.push({
            status: response.status,
            contentType: response.headers.get("content-type"),
            body: await response.json(),
          });
        }
        process.stdout.write(JSON.stringify(results));
      `;
      const { stdout } = await execFileAsync(
        process.execPath,
        [
          "--import",
          pathToFileURL(
            join(originalCwd, "../../node_modules/tsx/dist/loader.mjs")
          ).href,
          "--input-type=module",
          "-e",
          runner,
        ],
        {
          cwd: tempDir,
          env: { ...process.env, NODE_OPTIONS: "--conditions=webstudio" },
        }
      );
      const results = JSON.parse(stdout) as {
        status: number;
        contentType: string;
        body: unknown;
      }[];
      expect(results).toHaveLength(3);
      for (const result of results) {
        expect(result.status).toBe(400);
        expect(result.contentType).toContain("application/json");
        expect(result.body).toEqual(
          getManagedFormFailure("Select at least one Resource destination")
        );
      }
    },
    60_000
  );

  test.each(["defaults", "react-router"])(
    "generates managed Form endpoints for root, nested, and dynamic pages (%s)",
    async (template) => {
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
              id: "help",
              name: "Help",
              title: "Help",
              path: "/help/contact",
              rootInstanceId: "root",
              meta: {},
            },
            {
              id: "product",
              name: "Product",
              title: "Product",
              path: "/products/:slug",
              rootInstanceId: "root",
              meta: {},
            },
          ],
          instances: [
            ["root", { id: "root", component: "NativeForm", children: [] }],
          ],
        })
      );
      await prebuild({ assets: false, template: [template] });
      for (const path of ["/", "/help/contact", "/products/:slug"]) {
        const endpointPath = path === "/" ? "/__ws-form" : `/__ws-form${path}`;
        await expect(
          readFile(
            join("app/routes", `${generateRemixRoute(endpointPath)}.tsx`),
            "utf8"
          )
        ).resolves.toContain("return Response.json(result");
      }
    }
  );

  test.each(["defaults", "react-router"])(
    "returns successful Resource results through the framework HTTP handler (%s)",
    async (template) => {
      const received: string[] = [];
      const receiver = createServer((request, response) => {
        received.push(request.url ?? "");
        response.writeHead(201, { "content-type": "application/json" });
        response.end(JSON.stringify({ accepted: true }));
      });
      await new Promise<void>((resolve) =>
        receiver.listen(0, "127.0.0.1", resolve)
      );
      try {
        const address = receiver.address();
        if (address === null || typeof address === "string") {
          throw new Error("Mock Resource server did not start");
        }
        const siteData = createSiteData({
          instances: [
            ["root", { id: "root", component: "NativeForm", children: [] }],
          ],
          props: [
            [
              "submission",
              {
                id: "submission",
                instanceId: "root",
                name: "submission",
                type: "json",
                value: { destinations: ["destination"] },
              },
            ],
          ],
        });
        siteData.build.dataSources = [
          [
            "destination",
            {
              id: "destination",
              name: "Destination",
              type: "resource",
              resourceId: "remote",
              scopeInstanceId: "root",
            },
          ],
        ] as never;
        siteData.build.resources = [
          [
            "remote",
            {
              id: "remote",
              name: "Remote",
              method: "post",
              url: JSON.stringify(`http://127.0.0.1:${address.port}/accept`),
              headers: [],
            },
          ],
        ] as never;
        await writeSiteData(siteData);
        await prebuild({ assets: false, template: [template] });
        // The production module blocks loopback; this test replaces only the
        // temporary site's fetch provider to exercise an actual local server.
        await writeFile(
          join(
            tempDir,
            "app/__generated__/$resources.managed-form-fetch.server.ts"
          ),
          "export const createManagedFormEmailSender = () => undefined;\nexport const validateManagedFormEmail = () => undefined;\nexport const createManagedFormResourceFetch = () => fetch;\n"
        );
        if (template === "react-router") {
          await linkPackagedPreviewDependencies();
          await runGeneratedCommand("react-router", ["build"]);
        } else {
          await symlink(
            join(originalCwd, "node_modules"),
            "node_modules",
            "dir"
          );
          const viteConfig = await readFile("vite.config.ts", "utf8");
          await writeFile(
            "vite.config.ts",
            viteConfig
              .replaceAll(
                'conditions: ["browser", "development|production"]',
                'conditions: ["webstudio", "browser", "development|production"]'
              )
              .replaceAll(
                'conditions: ["node", "development|production"]',
                'conditions: ["webstudio", "node", "development|production"]'
              )
          );
          await runGeneratedCommand("remix", ["vite:build"]);
        }
        const serverEntry = pathToFileURL(
          join(tempDir, "build/server/index.js")
        ).href;
        const handlerPackage =
          template === "react-router"
            ? "react-router"
            : "@remix-run/server-runtime";
        const runner = `
          import { createRequestHandler } from ${JSON.stringify(
            handlerPackage
          )};
          const build = await import(${JSON.stringify(serverEntry)});
          const handleRequest = createRequestHandler(build, "production");
          const form = new FormData();
          form.set(${JSON.stringify(managedFormIdFieldName)}, "root");
          form.set(${JSON.stringify(formBotFieldName)}, "brave");
          form.set(${JSON.stringify(managedFormArrayNamesFieldName)}, "[]");
          form.set("message", "Hello");
          const response = await handleRequest(new Request("https://example.com/__ws-form", {
            method: "POST", body: form, headers: { host: "example.com" },
          }));
          process.stdout.write(JSON.stringify({
            status: response.status,
            contentType: response.headers.get("content-type"),
            body: await response.json(),
          }));
        `;
        const { stdout } = await execFileAsync(
          process.execPath,
          [
            "--import",
            pathToFileURL(
              join(originalCwd, "../../node_modules/tsx/dist/loader.mjs")
            ).href,
            "--input-type=module",
            "-e",
            runner,
          ],
          {
            cwd: tempDir,
            env: { ...process.env, NODE_OPTIONS: "--conditions=webstudio" },
          }
        );
        const result = JSON.parse(stdout) as {
          status: number;
          contentType: string;
          body: unknown;
        };
        expect(result.status).toBe(200);
        expect(result.contentType).toContain("application/json");
        expect(result.body).toEqual({
          success: true,
          status: 200,
          results: [
            { resourceId: "remote", status: 201, body: { accepted: true } },
          ],
          errors: [],
        });
        expect(received).toEqual(["/accept"]);
      } finally {
        await new Promise<void>((resolve) => receiver.close(() => resolve()));
      }
    },
    60_000
  );

  test.each(["/__ws-form", "/__ws-form/submissions", "/__ws-form/:slug"])(
    "rejects a page under the reserved managed Form endpoint (%s)",
    async (path) => {
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
              id: "reserved",
              name: "Reserved",
              title: "Reserved",
              path,
              rootInstanceId: "root",
              meta: {},
            },
          ],
          instances: [
            ["root", { id: "root", component: "NativeForm", children: [] }],
          ],
        })
      );
      await expect(
        prebuild({ assets: false, template: ["react-router"] })
      ).rejects.toThrow("uses the reserved Form endpoint");
    }
  );

  test("keeps an authored reserved-prefix page when no managed Form is present", async () => {
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
            id: "reserved",
            name: "Reserved",
            title: "Reserved",
            path: "/__ws-form",
            rootInstanceId: "root",
            meta: {},
          },
        ],
      })
    );
    await expect(
      prebuild({ assets: false, template: ["react-router"] })
    ).resolves.toBeUndefined();
  });

  test("keeps a published reserved-prefix page when only a draft has a managed Form", async () => {
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
            id: "reserved",
            name: "Reserved",
            title: "Reserved",
            path: "/__ws-form",
            rootInstanceId: "root",
            meta: {},
          },
          {
            id: "draft",
            name: "Draft",
            title: "Draft",
            path: "/draft",
            rootInstanceId: "draft-form",
            meta: {},
            isDraft: true,
          },
        ],
        instances: [
          ["root", { id: "root", component: "Box", children: [] }],
          [
            "draft-form",
            { id: "draft-form", component: "NativeForm", children: [] },
          ],
        ],
      })
    );
    await expect(
      prebuild({ assets: false, template: ["react-router"] })
    ).resolves.toBeUndefined();
    await expect(
      readFile("app/routes/[__ws-form]._index.tsx", "utf8")
    ).resolves.toContain("export default");
  });

  test.each([
    ["defaults", 2],
    ["defaults", 3],
    ["react-router", 2],
    ["react-router", 3],
  ] as const)(
    "preflights Email deliveries before sibling HTTP dispatch (%s, %i project recipients)",
    async (template, projectRecipientCount) => {
      const siteData = createSiteData({
        instances: [
          ["root", { id: "root", component: "NativeForm", children: [] }],
        ],
        props: [
          [
            "submission",
            {
              id: "submission",
              instanceId: "root",
              name: "submission",
              type: "json",
              value: {
                destinations: [
                  "http-source",
                  "project-source",
                  "custom-source",
                ],
              },
            },
          ],
        ],
        pageMeta: {
          contactEmail:
            projectRecipientCount === 2
              ? "first@example.com, first@example.com"
              : "first@example.com, first@example.com, third@example.com",
        },
      });
      siteData.build.dataSources = [
        [
          "http-source",
          {
            id: "http-source",
            name: "HTTP",
            type: "resource",
            resourceId: "http",
            scopeInstanceId: "root",
          },
        ],
        [
          "project-source",
          {
            id: "project-source",
            name: "Project Email",
            type: "resource",
            resourceId: "project-email",
            scopeInstanceId: "root",
          },
        ],
        [
          "custom-source",
          {
            id: "custom-source",
            name: "Custom Email",
            type: "resource",
            resourceId: "custom-email",
            scopeInstanceId: "root",
          },
        ],
      ] as never;
      siteData.build.resources = [
        [
          "http",
          {
            id: "http",
            name: "HTTP",
            method: "post",
            url: '"https://example.com/submit"',
            headers: [],
          },
        ],
        [
          "project-email",
          {
            id: "project-email",
            name: "Project Email",
            control: "email",
            method: "post",
            url: '""',
            headers: [],
          },
        ],
        [
          "custom-email",
          {
            id: "custom-email",
            name: "Custom Email",
            control: "email",
            method: "post",
            url: '""',
            headers: [],
            email: {
              recipientMode: "custom",
              recipients:
                "fourth@example.com, fifth@example.com, fifth@example.com",
            },
          },
        ],
      ] as never;
      await writeSiteData(siteData);
      await prebuild({ assets: false, template: [template] });
      await symlink(join(originalCwd, "node_modules"), "node_modules", "dir");
      await build({
        stdin: {
          contents: 'export { action } from "./app/routes/_index"',
          resolveDir: tempDir,
        },
        outfile: join(tempDir, "recipient-limit-action.mjs"),
        bundle: true,
        platform: "node",
        format: "esm",
        packages: "external",
        loader: { ".css": "text" },
      });
      const { action } = await import(
        pathToFileURL(join(tempDir, "recipient-limit-action.mjs")).href
      );
      const outgoingFetch = vi.fn(async () => Response.json({ ok: true }));
      vi.stubGlobal("fetch", outgoingFetch);
      const formData = new FormData();
      formData.set(managedFormIdFieldName, "root");
      formData.set(managedFormArrayNamesFieldName, "[]");
      formData.set(formBotFieldName, "brave");
      formData.set("message", "Hello");
      await expect(
        action({
          request: new Request(
            `https://example.com/?${managedFormRequestParamName}=1`,
            {
              method: "POST",
              headers: { host: "example.com" },
              body: formData,
            }
          ),
          context: {},
        })
      ).resolves.toEqual(
        getManagedFormFailure(
          projectRecipientCount === 2
            ? "Email delivery requires Webstudio Cloud and is not configured yet"
            : "Select no more than 5 team email recipients per Form submission"
        )
      );
      expect(outgoingFetch).not.toHaveBeenCalled();
    }
  );

  test.each(["defaults", "react-router"])(
    "preflights a dependent Email before HTTP dispatch (%s)",
    async (template) => {
      const siteData = createSiteData({
        instances: [
          ["root", { id: "root", component: "NativeForm", children: [] }],
        ],
        props: [
          [
            "submission",
            {
              id: "submission",
              instanceId: "root",
              name: "submission",
              type: "json",
              value: { destinations: ["http-source"] },
            },
          ],
        ],
        pageMeta: { contactEmail: "owner@example.com" },
      });
      siteData.build.dataSources = [
        [
          "email-source",
          {
            id: "email-source",
            name: "Email",
            type: "resource",
            resourceId: "email",
            scopeInstanceId: "root",
          },
        ],
        [
          "http-source",
          {
            id: "http-source",
            name: "HTTP",
            type: "resource",
            resourceId: "http",
            scopeInstanceId: "root",
          },
        ],
      ] as never;
      siteData.build.resources = [
        [
          "email",
          {
            id: "email",
            name: "Email",
            control: "email",
            method: "post",
            url: '""',
            headers: [],
          },
        ],
        [
          "http",
          {
            id: "http",
            name: "HTTP",
            method: "post",
            url: '"https://example.com/submit"',
            headers: [],
            body: encodeDataSourceVariable("email-source"),
          },
        ],
      ] as never;
      await writeSiteData(siteData);
      await prebuild({ assets: false, template: [template] });
      await symlink(join(originalCwd, "node_modules"), "node_modules", "dir");
      await build({
        stdin: {
          contents: 'export { action } from "./app/routes/_index"',
          resolveDir: tempDir,
        },
        outfile: join(tempDir, "dependent-email-action.mjs"),
        bundle: true,
        platform: "node",
        format: "esm",
        packages: "external",
        loader: { ".css": "text" },
      });
      const { action } = await import(
        pathToFileURL(join(tempDir, "dependent-email-action.mjs")).href
      );
      const outgoingFetch = vi.fn(async () => Response.json({ ok: true }));
      vi.stubGlobal("fetch", outgoingFetch);
      const formData = new FormData();
      formData.set(managedFormIdFieldName, "root");
      formData.set(managedFormArrayNamesFieldName, "[]");
      formData.set(formBotFieldName, "brave");
      await expect(
        action({
          request: new Request(
            `https://example.com/?${managedFormRequestParamName}=1`,
            {
              method: "POST",
              headers: { host: "example.com" },
              body: formData,
            }
          ),
          context: {},
        })
      ).resolves.toEqual(
        getManagedFormFailure(
          "Email delivery requires Webstudio Cloud and is not configured yet"
        )
      );
      expect(outgoingFetch).not.toHaveBeenCalled();
    }
  );

  test("generates submit-time Resource requests with Form parameters", async () => {
    const siteData = createSiteData({
      instances: [
        ["root", { id: "root", component: "NativeForm", children: [] }],
      ],
      props: [
        [
          "submission",
          {
            id: "submission",
            instanceId: "root",
            name: "submission",
            type: "json",
            value: { destinations: ["destination"] },
          },
        ],
      ],
    });
    siteData.build.dataSources = [
      [
        "formData",
        {
          id: "formData",
          name: "formData",
          type: "parameter",
          scopeInstanceId: "root",
        },
      ],
      [
        "destination",
        {
          id: "destination",
          name: "Destination",
          type: "resource",
          resourceId: "remote",
          scopeInstanceId: "root",
        },
      ],
    ] as never;
    siteData.build.resources = [
      [
        "remote",
        {
          id: "remote",
          name: "Remote",
          method: "get",
          url: '"https://example.com/submit"',
          headers: [],
          body: encodeDataSourceVariable("formData"),
        },
      ],
    ] as never;
    await writeSiteData(siteData);
    await prebuild({ assets: false, template: ["react-router"] });
    await build({
      entryPoints: ["app/__generated__/_index.server.tsx"],
      absWorkingDir: tempDir,
      outfile: join(tempDir, "managed-graph.mjs"),
      bundle: true,
      platform: "node",
      format: "esm",
      packages: "external",
    });
    const { getManagedFormResourceGraph } = await import(
      pathToFileURL(join(tempDir, "managed-graph.mjs")).href
    );
    const formData = { message: "Hello" };
    const graph = getManagedFormResourceGraph("root", {
      system: {},
      formData,
      browserInfo: {},
    });
    expect(graph.rootIds).toEqual(["remote"]);
    expect(graph.resources[0].createRequest(new Map())).toMatchObject({
      method: "post",
      body: formData,
    });
  });

  test(
    "typechecks a generated site with an edited Email Resource body",
    async () => {
      const siteData = createSiteData({
        instances: [
          ["root", { id: "root", component: "NativeForm", children: [] }],
        ],
        props: [
          [
            "submission",
            {
              id: "submission",
              instanceId: "root",
              name: "submission",
              type: "json",
              value: { destinations: ["emailDestination"] },
            },
          ],
        ],
      });
      siteData.build.dataSources = [
        [
          "formData",
          {
            id: "formData",
            name: "formData",
            type: "parameter",
            scopeInstanceId: "root",
          },
        ],
        [
          "emailDestination",
          {
            id: "emailDestination",
            name: "Email",
            type: "resource",
            resourceId: "email",
            scopeInstanceId: "root",
          },
        ],
      ] as never;
      siteData.build.resources = [
        [
          "email",
          {
            id: "email",
            name: "Email",
            control: "email",
            method: "post",
            url: '""',
            headers: [],
            email: {
              body: `\`Submitted fields: \${${encodeDataSourceVariable(
                "formData"
              )}}\``,
            },
          },
        ],
      ] as never;
      await writeSiteData(siteData);
      await prebuild({ assets: false, template: ["react-router"] });
      await writeFile(
        "email-typecheck.ts",
        'export { getManagedFormResourceGraph } from "./app/__generated__/_index.server";'
      );
      await linkPackagedPreviewDependencies();
      await runGeneratedCommand("tsc", [
        "--ignoreConfig",
        "--noEmit",
        "--strict",
        "--skipLibCheck",
        "--moduleResolution",
        "bundler",
        "--customConditions",
        "webstudio",
        "--module",
        "esnext",
        "--target",
        "es2023",
        "--types",
        "node",
        "--typeRoots",
        join(originalCwd, "../../node_modules/@types"),
        "--jsx",
        "react-jsx",
        "email-typecheck.ts",
      ]).catch((error: unknown) => {
        throw new Error(
          error instanceof Error && "stdout" in error
            ? String(error.stdout)
            : String(error)
        );
      });
    },
    slowPrebuildTestTimeout
  );

  test.each(["defaults", "react-router"])(
    "runs a visitor Email Resource from the generated Form route (%s)",
    async (template) => {
      const siteData = createSiteData({
        instances: [
          [
            "root",
            {
              id: "root",
              component: "NativeForm",
              children: [{ type: "id", value: "email-input" }],
            },
          ],
          [
            "email-input",
            { id: "email-input", component: "Input", children: [] },
          ],
        ],
        props: [
          [
            "submission",
            {
              id: "submission",
              instanceId: "root",
              name: "submission",
              type: "json",
              value: { destinations: ["visitor-source"] },
            },
          ],
          [
            "email-name",
            {
              id: "email-name",
              instanceId: "email-input",
              name: "name",
              type: "string",
              value: "visitorEmail",
            },
          ],
          [
            "email-type",
            {
              id: "email-type",
              instanceId: "email-input",
              name: "type",
              type: "string",
              value: "email",
            },
          ],
        ],
      });
      siteData.build.dataSources = [
        [
          "visitor-source",
          {
            id: "visitor-source",
            name: "Receipt",
            type: "resource",
            resourceId: "visitor-email",
            scopeInstanceId: "root",
          },
        ],
      ] as never;
      siteData.build.resources = [
        [
          "visitor-email",
          {
            id: "visitor-email",
            name: "Receipt",
            control: "email",
            method: "post",
            url: '""',
            headers: [],
            email: {
              recipientMode: "visitor",
              visitorEmailField: "visitorEmail",
              subject: '"Receipt"',
              body: '"Custom text"',
            },
          },
        ],
      ] as never;
      await writeSiteData(siteData);
      await prebuild({ assets: false, template: [template] });
      await writeFile(
        "app/__generated__/$resources.managed-form-fetch.server.ts",
        `export const createManagedFormEmailSender = () => globalThis.__testSendEmail;
export const validateManagedFormEmail = () => undefined;
export const createManagedFormResourceFetch = () => globalThis.__testManagedFormFetch;
`
      );
      await symlink(join(originalCwd, "node_modules"), "node_modules", "dir");
      await build({
        stdin: {
          contents: 'export { action } from "./app/routes/_index"',
          resolveDir: tempDir,
        },
        outfile: join(tempDir, "visitor-email-action.mjs"),
        bundle: true,
        platform: "node",
        format: "esm",
        packages: "external",
        loader: { ".css": "text" },
      });
      const { action } = await import(
        pathToFileURL(join(tempDir, "visitor-email-action.mjs")).href
      );
      const sendEmail = vi.fn(async (_request: ResourceRequest) => ({
        ok: true,
        status: 200,
        statusText: "OK",
        data: { id: "sent" },
      }));
      const httpFetch = vi.fn(async () => Response.json({ accepted: true }));
      vi.stubGlobal("__testSendEmail", sendEmail);
      vi.stubGlobal("__testManagedFormFetch", httpFetch);
      const formData = new FormData();
      formData.set(managedFormIdFieldName, "root");
      formData.set(managedFormArrayNamesFieldName, "[]");
      formData.set(formBotFieldName, "brave");
      formData.set("visitorEmail", "visitor@example.com");
      await expect(
        action({
          request: new Request(
            `https://site.example/?${managedFormRequestParamName}=1`,
            {
              method: "POST",
              headers: { host: "site.example" },
              body: formData,
            }
          ),
          context: {},
        })
      ).resolves.toMatchObject({ success: true, status: 200 });
      expect(sendEmail).toHaveBeenCalledOnce();
      expect(sendEmail.mock.calls[0][0].email).toMatchObject({
        recipients: [{ address: "visitor@example.com" }],
        body: "We received your request from https://site.example.\n\nCustom text",
        includeAttachments: false,
      });
      expect(httpFetch).not.toHaveBeenCalled();
    },
    slowPrebuildTestTimeout
  );

  test.each(["defaults", "react-router"])(
    "ignores a spoofed forwarded host when resolving a managed relative Resource (%s)",
    async (template) => {
      const siteData = createSiteData({
        instances: [
          ["root", { id: "root", component: "NativeForm", children: [] }],
        ],
        props: [
          [
            "submission",
            {
              id: "submission",
              instanceId: "root",
              name: "submission",
              type: "json",
              value: { destinations: ["destination"] },
            },
          ],
        ],
      });
      siteData.build.dataSources = [
        [
          "destination",
          {
            id: "destination",
            name: "Destination",
            type: "resource",
            resourceId: "relative",
            scopeInstanceId: "root",
          },
        ],
      ] as never;
      siteData.build.resources = [
        [
          "relative",
          {
            id: "relative",
            name: "Relative",
            method: "post",
            url: '"/receive"',
            headers: [],
          },
        ],
      ] as never;
      await writeSiteData(siteData);
      await prebuild({ assets: false, template: [template] });
      await writeFile(
        join(
          tempDir,
          "app/__generated__/$resources.managed-form-fetch.server.ts"
        ),
        `export const createManagedFormEmailSender = () => undefined;
export const validateManagedFormEmail = () => undefined;
export const createManagedFormResourceFetch = () => {
  const protectedFetch = globalThis.__testManagedFormFetch;
  protectedFetch.validateDestination = (url) => {
    if (url.hostname === "site.example") throw new Error("Resource destination is not allowed");
  };
  return protectedFetch;
};
`
      );
      await symlink(join(originalCwd, "node_modules"), "node_modules", "dir");
      await build({
        stdin: {
          contents: 'export { action } from "./app/routes/_index"',
          resolveDir: tempDir,
        },
        outfile: join(tempDir, "spoofed-host-action.mjs"),
        bundle: true,
        platform: "node",
        format: "esm",
        packages: "external",
        loader: { ".css": "text" },
      });
      const { action } = await import(
        pathToFileURL(join(tempDir, "spoofed-host-action.mjs")).href
      );
      const outbound = vi.fn(async () => Response.json({ accepted: true }));
      vi.stubGlobal("__testManagedFormFetch", outbound);
      const formData = new FormData();
      formData.set(managedFormIdFieldName, "root");
      formData.set(managedFormArrayNamesFieldName, "[]");
      formData.set(formBotFieldName, "brave");
      await expect(
        action({
          request: new Request(
            `https://site.example/?${managedFormRequestParamName}=1`,
            {
              method: "POST",
              headers: {
                host: "site.example",
                "x-forwarded-host": "attacker.example",
              },
              body: formData,
            }
          ),
          context: {},
        })
      ).resolves.toEqual(
        getManagedFormFailure("Resource destination is not allowed")
      );
      expect(outbound).not.toHaveBeenCalled();
    },
    slowPrebuildTestTimeout
  );

  test.each(["defaults", "react-router"])(
    "retries only a failed managed Form destination per submission (%s)",
    async (template) => {
      const siteData = createSiteData({
        instances: [
          ["root", { id: "root", component: "NativeForm", children: [] }],
        ],
        props: [
          [
            "submission",
            {
              id: "submission",
              instanceId: "root",
              name: "submission",
              type: "json",
              value: { destinations: ["sibling-source", "failed-source"] },
            },
          ],
        ],
      });
      siteData.build.dataSources = [
        [
          "dependency-source",
          {
            id: "dependency-source",
            name: "Dependency",
            type: "resource",
            resourceId: "dependency",
            scopeInstanceId: "root",
          },
        ],
        [
          "failed-source",
          {
            id: "failed-source",
            name: "Failed",
            type: "resource",
            resourceId: "failed",
            scopeInstanceId: "root",
          },
        ],
        [
          "sibling-source",
          {
            id: "sibling-source",
            name: "Sibling",
            type: "resource",
            resourceId: "sibling",
            scopeInstanceId: "root",
          },
        ],
      ] as never;
      siteData.build.resources = [
        [
          "dependency",
          {
            id: "dependency",
            name: "Dependency",
            method: "get",
            url: '"https://receiver.example/dependency"',
            headers: [],
          },
        ],
        [
          "failed",
          {
            id: "failed",
            name: "Failed",
            method: "post",
            url: `"https://receiver.example/failed/" + ${encodeDataSourceVariable(
              "dependency-source"
            )}.data.id`,
            headers: [],
          },
        ],
        [
          "sibling",
          {
            id: "sibling",
            name: "Sibling",
            method: "post",
            url: '"https://receiver.example/sibling"',
            headers: [],
          },
        ],
      ] as never;
      await writeSiteData(siteData);
      await prebuild({ assets: false, template: [template] });
      await writeFile(
        join(
          tempDir,
          "app/__generated__/$resources.managed-form-fetch.server.ts"
        ),
        "export const createManagedFormEmailSender = () => undefined;\nexport const validateManagedFormEmail = () => undefined;\nexport const createManagedFormResourceFetch = () => globalThis.__testManagedFormFetch;\n"
      );
      await symlink(join(originalCwd, "node_modules"), "node_modules", "dir");
      await build({
        stdin: {
          contents: 'export { action } from "./app/routes/_index"',
          resolveDir: tempDir,
        },
        outfile: join(tempDir, "retry-action.mjs"),
        bundle: true,
        platform: "node",
        format: "esm",
        packages: "external",
        loader: { ".css": "text" },
      });
      const { action } = await import(
        pathToFileURL(join(tempDir, "retry-action.mjs")).href
      );
      const attempts = new Map<string, number>();
      let failure: "status" | "network" | "timeout" | "persistent" = "status";
      vi.stubGlobal(
        "__testManagedFormFetch",
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input);
          const attempt = (attempts.get(url) ?? 0) + 1;
          attempts.set(url, attempt);
          if (url.endsWith("/dependency")) {
            return Response.json({ id: "resolved" });
          }
          if (url.endsWith("/sibling")) {
            return Response.json(
              { accepted: true },
              { headers: { "Set-Cookie": "private" } }
            );
          }
          if (failure === "persistent") {
            return new Response("Still failed", { status: 422 });
          }
          if (attempt === 1) {
            if (failure === "status") {
              return new Response("Temporary failure", { status: 503 });
            }
            if (failure === "network") {
              throw new Error("Connection lost");
            }
            return new Promise<Response>((_resolve, reject) => {
              init?.signal?.addEventListener("abort", () =>
                reject(new DOMException("Aborted", "AbortError"))
              );
            });
          }
          return Response.json({ accepted: true });
        })
      );
      const submit = () => {
        const form = new FormData();
        form.set(managedFormIdFieldName, "root");
        form.set(managedFormArrayNamesFieldName, "[]");
        form.set(formBotFieldName, "brave");
        return action({
          request: new Request(
            `https://site.example/?${managedFormRequestParamName}=1`,
            {
              method: "POST",
              headers: { host: "site.example" },
              body: form,
            }
          ),
          context: {},
        });
      };
      const expectAttempts = (failed: number) => {
        expect(attempts.get("https://receiver.example/dependency")).toBe(1);
        expect(attempts.get("https://receiver.example/sibling")).toBe(1);
        expect(attempts.get("https://receiver.example/failed/resolved")).toBe(
          failed
        );
      };

      await expect(submit()).resolves.toEqual({
        success: true,
        status: 200,
        results: [
          {
            resourceId: "sibling",
            status: 200,
            body: { accepted: true },
          },
          {
            resourceId: "failed",
            status: 200,
            body: { accepted: true },
          },
        ],
        errors: [],
      });
      expectAttempts(2);
      attempts.clear();
      failure = "network";
      const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
      await expect(submit()).resolves.toMatchObject({
        success: true,
        status: 200,
        results: [
          { resourceId: "sibling", status: 200, body: { accepted: true } },
          { resourceId: "failed", status: 200, body: { accepted: true } },
        ],
        errors: [],
      });
      expectAttempts(2);
      errorLog.mockRestore();
      attempts.clear();
      failure = "timeout";
      vi.useFakeTimers();
      try {
        const pending = submit();
        await vi.advanceTimersByTimeAsync(10_000);
        await expect(pending).resolves.toMatchObject({
          success: true,
          status: 200,
          results: [
            { resourceId: "sibling", status: 200, body: { accepted: true } },
            { resourceId: "failed", status: 200, body: { accepted: true } },
          ],
          errors: [],
        });
        expectAttempts(2);
      } finally {
        vi.useRealTimers();
      }
      attempts.clear();
      failure = "persistent";
      await expect(submit()).resolves.toEqual({
        success: false,
        status: 502,
        results: [
          {
            resourceId: "sibling",
            status: 200,
            body: { accepted: true },
          },
          { resourceId: "failed", status: 422, body: "Still failed" },
        ],
        errors: [
          {
            resourceId: "failed",
            status: 422,
            body: "Still failed",
            message: "Resource request failed (422)",
          },
        ],
      });
      expectAttempts(2);
    }
  );

  test.each(["defaults", "react-router"])(
    "rejects a denied selected destination before a valid sibling POST (%s)",
    async (template) => {
      const siteData = createSiteData({
        instances: [
          ["root", { id: "root", component: "NativeForm", children: [] }],
        ],
        props: [
          [
            "submission",
            {
              id: "submission",
              instanceId: "root",
              name: "submission",
              type: "json",
              value: { destinations: ["valid-source", "denied-source"] },
            },
          ],
        ],
      });
      siteData.build.dataSources = [
        [
          "valid-source",
          {
            id: "valid-source",
            name: "Valid",
            type: "resource",
            resourceId: "valid",
            scopeInstanceId: "root",
          },
        ],
        [
          "denied-source",
          {
            id: "denied-source",
            name: "Denied",
            type: "resource",
            resourceId: "denied",
            scopeInstanceId: "root",
          },
        ],
      ] as never;
      siteData.build.resources = [
        [
          "valid",
          {
            id: "valid",
            name: "Valid",
            method: "post",
            url: '"https://api.example.net/submit"',
            headers: [],
          },
        ],
        [
          "denied",
          {
            id: "denied",
            name: "Denied",
            method: "post",
            url: '"https://webstudio.is/blocked"',
            headers: [],
          },
        ],
      ] as never;
      await writeSiteData(siteData);
      await prebuild({ assets: false, template: [template] });
      await writeFile(
        join(
          tempDir,
          "app/__generated__/$resources.managed-form-fetch.server.ts"
        ),
        "export const createManagedFormEmailSender = () => undefined;\nexport const validateManagedFormEmail = () => undefined;\nexport const createManagedFormResourceFetch = () => globalThis.__testManagedFormFetch;\n"
      );
      await symlink(join(originalCwd, "node_modules"), "node_modules", "dir");
      await build({
        stdin: {
          contents: 'export { action } from "./app/routes/_index"',
          resolveDir: tempDir,
        },
        outfile: join(tempDir, "url-preflight-action.mjs"),
        bundle: true,
        platform: "node",
        format: "esm",
        packages: "external",
        loader: { ".css": "text" },
      });
      const { action } = await import(
        pathToFileURL(join(tempDir, "url-preflight-action.mjs")).href
      );
      const received: string[] = [];
      vi.stubGlobal(
        "__testManagedFormFetch",
        createProtectedResourceFetch({
          deniedHostnames: ["webstudio.is"],
          transport: async ({ url }) => {
            received.push(url.href);
            return { response: Response.json({ accepted: true }) };
          },
        })
      );
      const formData = new FormData();
      formData.set(managedFormIdFieldName, "root");
      formData.set(managedFormArrayNamesFieldName, "[]");
      formData.set(formBotFieldName, "brave");
      await expect(
        action({
          request: new Request(
            `https://example.com/?${managedFormRequestParamName}=1`,
            { method: "POST", headers: { host: "example.com" }, body: formData }
          ),
          context: {},
          params: {},
        })
      ).resolves.toEqual(
        getManagedFormFailure("Resource destination is not allowed")
      );
      expect(received).toEqual([]);
    }
  );

  test.each(["defaults", "react-router"])(
    "preflights dependent bodies before any selected Form destination (%s)",
    async (template) => {
      const siteData = createSiteData({
        instances: [
          ["root", { id: "root", component: "NativeForm", children: [] }],
        ],
        props: [
          [
            "submission",
            {
              id: "submission",
              instanceId: "root",
              name: "submission",
              type: "json",
              value: {
                destinations: ["independent-source", "dependent-source"],
              },
            },
          ],
        ],
      });
      siteData.build.dataSources = [
        [
          "formData",
          {
            id: "formData",
            name: "formData",
            type: "parameter",
            scopeInstanceId: "root",
          },
        ],
        [
          "lookup-source",
          {
            id: "lookup-source",
            name: "Lookup",
            type: "resource",
            resourceId: "lookup",
            scopeInstanceId: "root",
          },
        ],
        [
          "independent-source",
          {
            id: "independent-source",
            name: "Independent",
            type: "resource",
            resourceId: "independent",
            scopeInstanceId: "root",
          },
        ],
        [
          "dependent-source",
          {
            id: "dependent-source",
            name: "Dependent",
            type: "resource",
            resourceId: "dependent",
            scopeInstanceId: "root",
          },
        ],
      ] as never;
      siteData.build.resources = [
        [
          "lookup",
          {
            id: "lookup",
            name: "Lookup",
            method: "get",
            url: '"https://example.com/lookup"',
            headers: [],
          },
        ],
        [
          "independent",
          {
            id: "independent",
            name: "Independent",
            method: "post",
            url: '"https://example.com/independent"',
            headers: [],
            bodyFormat: "json",
            body: '{ message: "Hello" }',
          },
        ],
        [
          "dependent",
          {
            id: "dependent",
            name: "Dependent",
            method: "post",
            url: '"https://example.com/dependent"',
            headers: [],
            bodyFormat: "json",
            body: `{ attachment: ${encodeDataSourceVariable(
              "formData"
            )}.attachment, lookup: ${encodeDataSourceVariable(
              "lookup-source"
            )}.data }`,
          },
        ],
      ] as never;
      await writeSiteData(siteData);
      await prebuild({ assets: false, template: [template] });
      await writeFile(
        join(
          tempDir,
          "app/__generated__/$resources.managed-form-fetch.server.ts"
        ),
        "export const createManagedFormEmailSender = () => undefined;\nexport const validateManagedFormEmail = () => undefined;\nexport const createManagedFormResourceFetch = () => globalThis.__testManagedFormFetch;\n"
      );
      await symlink(join(originalCwd, "node_modules"), "node_modules", "dir");
      await build({
        stdin: {
          contents: 'export { action } from "./app/routes/_index"',
          resolveDir: tempDir,
        },
        outfile: join(tempDir, "preflight-action.mjs"),
        bundle: true,
        platform: "node",
        format: "esm",
        packages: "external",
        loader: { ".css": "text" },
      });
      const { action } = await import(
        pathToFileURL(join(tempDir, "preflight-action.mjs")).href
      );
      const received: string[] = [];
      vi.stubGlobal(
        "__testManagedFormFetch",
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          const request = new Request(input, init);
          received.push(request.url);
          return Response.json({ id: "looked-up" });
        })
      );
      const formData = new FormData();
      formData.set(managedFormIdFieldName, "root");
      formData.set(managedFormArrayNamesFieldName, "[]");
      formData.set(formBotFieldName, "brave");
      formData.set("attachment", new File(["hello"], "hello.txt"));
      await expect(
        action({
          request: new Request(
            `https://example.com/?${managedFormRequestParamName}=1`,
            { method: "POST", headers: { host: "example.com" }, body: formData }
          ),
          context: {},
          params: {},
        })
      ).resolves.toEqual(
        getManagedFormFailure("JSON body cannot include uploaded files")
      );
      expect(received).toEqual(["https://example.com/lookup"]);

      formData.set("attachment", "text attachment");
      await expect(
        action({
          request: new Request(
            `https://example.com/?${managedFormRequestParamName}=1`,
            { method: "POST", headers: { host: "example.com" }, body: formData }
          ),
          context: {},
          params: {},
        })
      ).resolves.toMatchObject({ success: true, status: 200 });
      expect(received.slice(1).sort()).toEqual([
        "https://example.com/dependent",
        "https://example.com/independent",
        "https://example.com/lookup",
      ]);
    }
  );

  test.each(["defaults", "react-router"])(
    "submits selected Form Resources in parallel with scoped values (%s)",
    async (template) => {
      const siteData = createSiteData({
        instances: [
          ["root", { id: "root", component: "NativeForm", children: [] }],
        ],
        props: [
          [
            "submission",
            {
              id: "submission",
              instanceId: "root",
              name: "submission",
              type: "json",
              value: {
                destinations: ["form-destination", "browser-destination"],
              },
            },
          ],
        ],
      });
      siteData.build.dataSources = [
        [
          "formData",
          {
            id: "formData",
            name: "formData",
            type: "parameter",
            scopeInstanceId: "root",
          },
        ],
        [
          "browserInfo",
          {
            id: "browserInfo",
            name: "browserInfo",
            type: "parameter",
            scopeInstanceId: "root",
          },
        ],
        [
          "form-destination",
          {
            id: "form-destination",
            name: "Form destination",
            type: "resource",
            resourceId: "form-resource",
            scopeInstanceId: "root",
          },
        ],
        [
          "browser-destination",
          {
            id: "browser-destination",
            name: "Browser destination",
            type: "resource",
            resourceId: "browser-resource",
            scopeInstanceId: "root",
          },
        ],
      ] as never;
      siteData.build.resources = [
        [
          "form-resource",
          {
            id: "form-resource",
            name: "Form resource",
            method: "get",
            url: '"https://forms.example/submit"',
            headers: [],
            bodyFormat: "json",
            body: encodeDataSourceVariable("formData"),
          },
        ],
        [
          "browser-resource",
          {
            id: "browser-resource",
            name: "Browser resource",
            method: "get",
            url: '"https://browser.example/submit"',
            headers: [],
            body: encodeDataSourceVariable("browserInfo"),
          },
        ],
      ] as never;
      await writeSiteData(siteData);
      await prebuild({ assets: false, template: [template] });
      // Replace the generated adapter only in this temporary test site. The
      // production action always imports its protected runtime adapter.
      await writeFile(
        join(
          tempDir,
          "app/__generated__/$resources.managed-form-fetch.server.ts"
        ),
        "export const createManagedFormEmailSender = () => undefined;\nexport const validateManagedFormEmail = () => undefined;\nexport const createManagedFormResourceFetch = () => globalThis.__testManagedFormFetch;\n"
      );
      await symlink(join(originalCwd, "node_modules"), "node_modules", "dir");
      await build({
        stdin: {
          contents: 'export { action } from "./app/routes/_index"',
          resolveDir: tempDir,
        },
        outfile: join(tempDir, "managed-action.mjs"),
        bundle: true,
        platform: "node",
        format: "esm",
        packages: "external",
        loader: { ".css": "text" },
      });
      const { action } = await import(
        pathToFileURL(join(tempDir, "managed-action.mjs")).href
      );
      const received: Array<{ url: string; method: string; body: unknown }> =
        [];
      let releaseRequests = () => {};
      const waitForBoth = new Promise<void>((resolve) => {
        releaseRequests = resolve;
      });
      let failBrowserResource = false;
      vi.stubGlobal(
        "__testManagedFormFetch",
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          const outbound = new Request(input, init);
          received.push({
            url: outbound.url,
            method: outbound.method,
            body: await outbound.json(),
          });
          await waitForBoth;
          if (failBrowserResource && outbound.url.includes("browser.example")) {
            return new Response("Rejected", {
              status: 422,
            });
          }
          return Response.json({ accepted: true });
        })
      );
      const submit = (attachment?: File) => {
        const form = new FormData();
        form.set(managedFormIdFieldName, "root");
        form.set(formBotFieldName, Date.now().toString(16));
        form.set(
          managedFormArrayNamesFieldName,
          JSON.stringify(["tags", "empty"])
        );
        form.set("message", "Hello");
        form.append("tags", "red");
        form.append("tags", "blue");
        form.set("campaign", "conference");
        if (attachment !== undefined) {
          form.set("attachment", attachment);
        }
        return action({
          request: new Request(
            `https://site.example/?source=event&${managedFormRequestParamName}=1`,
            {
              method: "POST",
              headers: {
                host: "site.example",
                "user-agent": "Test Browser",
                "accept-language": "en-US",
                referer: "https://site.example/contact",
                "cf-connecting-ip": "127.0.0.1",
              },
              body: form,
            }
          ),
          context: {},
          params: {},
        });
      };
      await expect(submit(new File(["hello"], "hello.txt"))).resolves.toEqual(
        getManagedFormFailure("JSON body cannot include uploaded files")
      );
      expect(received).toHaveLength(0);
      const submission = submit();
      try {
        await vi.waitFor(() => expect(received).toHaveLength(2));
      } finally {
        releaseRequests();
      }
      await expect(submission).resolves.toMatchObject({
        success: true,
        status: 200,
        errors: [],
      });
      expect(received).toEqual([
        {
          url: "https://forms.example/submit",
          method: "POST",
          body: {
            message: "Hello",
            tags: ["red", "blue"],
            empty: [],
            campaign: "conference",
          },
        },
        {
          url: "https://browser.example/submit",
          method: "POST",
          body: {
            userAgent: "Test Browser",
            language: "en-US",
            referrer: "https://site.example/contact",
          },
        },
      ]);
      failBrowserResource = true;
      await expect(submit()).resolves.toEqual({
        success: false,
        status: 502,
        results: [
          {
            resourceId: "form-resource",
            status: 200,
            body: { accepted: true },
          },
          { resourceId: "browser-resource", status: 422, body: "Rejected" },
        ],
        errors: [
          {
            resourceId: "browser-resource",
            status: 422,
            body: "Rejected",
            message: "Resource request failed (422)",
          },
        ],
      });
    }
  );

  test.each(["defaults", "react-router"])(
    "forwards repeated managed Form fields as standard multipart entries through the generated endpoint (%s)",
    async (template) => {
      const siteData = createSiteData({
        instances: [
          ["root", { id: "root", component: "NativeForm", children: [] }],
        ],
        props: [
          [
            "submission",
            {
              id: "submission",
              instanceId: "root",
              name: "submission",
              type: "json",
              value: { destinations: ["destination"] },
            },
          ],
        ],
      });
      siteData.build.dataSources = [
        [
          "formData",
          {
            id: "formData",
            name: "formData",
            type: "parameter",
            scopeInstanceId: "root",
          },
        ],
        [
          "destination",
          {
            id: "destination",
            name: "Destination",
            type: "resource",
            resourceId: "remote",
            scopeInstanceId: "root",
          },
        ],
      ] as never;
      siteData.build.resources = [
        [
          "remote",
          {
            id: "remote",
            name: "Remote",
            method: "post",
            url: '"https://receiver.example/submit"',
            headers: [],
            bodyFormat: "multipart",
            body: encodeDataSourceVariable("formData"),
          },
        ],
      ] as never;
      await writeSiteData(siteData);
      await prebuild({ assets: false, template: [template] });
      await writeFile(
        join(
          tempDir,
          "app/__generated__/$resources.managed-form-fetch.server.ts"
        ),
        "export const createManagedFormEmailSender = () => undefined;\nexport const validateManagedFormEmail = () => undefined;\nexport const createManagedFormResourceFetch = () => globalThis.__testManagedFormFetch;\n"
      );
      await symlink(join(originalCwd, "node_modules"), "node_modules", "dir");
      await build({
        stdin: {
          contents: `export { action } from "./app/routes/${generateRemixRoute(
            "/__ws-form"
          )}";`,
          resolveDir: tempDir,
        },
        outfile: join(tempDir, "multipart-action.mjs"),
        bundle: true,
        platform: "node",
        format: "esm",
        packages: "external",
        loader: { ".css": "text" },
      });
      const { action } = await import(
        pathToFileURL(join(tempDir, "multipart-action.mjs")).href
      );
      const outbound = vi.fn(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const request = new Request(input, init);
          expect(request.url).toBe("https://receiver.example/submit");
          expect(request.method).toBe("POST");
          expect(request.headers.get("content-type")).toContain(
            "multipart/form-data"
          );
          const fields = await request.formData();
          expect(fields.getAll("tags")).toEqual(["red", "blue", "red"]);
          const attachments = fields.getAll("attachments") as File[];
          expect(attachments).toMatchObject([
            { name: "first.bin", type: "application/octet-stream" },
            { name: "second.txt", type: "text/plain" },
          ]);
          expect(new Uint8Array(await attachments[0].arrayBuffer())).toEqual(
            new Uint8Array([0, 128, 255])
          );
          expect(new Uint8Array(await attachments[1].arrayBuffer())).toEqual(
            new Uint8Array([115, 101, 99, 111, 110, 100])
          );
          return Response.json({ accepted: true });
        }
      );
      vi.stubGlobal("__testManagedFormFetch", outbound);
      const form = new FormData();
      form.set(managedFormIdFieldName, "root");
      form.set(formBotFieldName, "brave");
      form.set(
        managedFormArrayNamesFieldName,
        JSON.stringify(["tags", "attachments"])
      );
      form.append("tags", "red");
      form.append("tags", "blue");
      form.append("tags", "red");
      form.append(
        "attachments",
        new File([new Uint8Array([0, 128, 255])], "first.bin", {
          type: "application/octet-stream",
        })
      );
      form.append(
        "attachments",
        new File(["second"], "second.txt", { type: "text/plain" })
      );
      const response: Response = await action({
        request: new Request("https://site.example/__ws-form", {
          method: "POST",
          headers: { host: "site.example" },
          body: form,
        }),
        context: {},
        params: {},
      });
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ success: true });
      expect(outbound).toHaveBeenCalledOnce();
    }
  );

  test.each(["defaults", "react-router"])(
    "sends configured browserInfo headers from a trusted Cloudflare request (%s)",
    async (template) => {
      const browserInfo = encodeDataSourceVariable("browserInfo");
      const siteData = createSiteData({
        instances: [
          ["root", { id: "root", component: "NativeForm", children: [] }],
        ],
        props: [
          [
            "submission",
            {
              id: "submission",
              instanceId: "root",
              name: "submission",
              type: "json",
              value: { destinations: ["destination"] },
            },
          ],
        ],
      });
      siteData.build.dataSources = [
        [
          "browserInfo",
          {
            id: "browserInfo",
            name: "browserInfo",
            type: "parameter",
            scopeInstanceId: "root",
          },
        ],
        [
          "destination",
          {
            id: "destination",
            name: "Destination",
            type: "resource",
            resourceId: "receiver",
            scopeInstanceId: "root",
          },
        ],
      ] as never;
      siteData.build.resources = [
        [
          "receiver",
          {
            id: "receiver",
            name: "Receiver",
            method: "post",
            url: '"https://receiver.example/submit"',
            headers: [
              { name: "X-Forwarded-For", value: `${browserInfo}.ip` },
              { name: "User-Agent", value: `${browserInfo}.userAgent` },
              { name: "Accept-Language", value: `${browserInfo}.language` },
            ],
          },
        ],
      ] as never;
      await writeSiteData(siteData);
      await prebuild({ assets: false, template: [template] });
      await writeFile(
        join(
          tempDir,
          "app/__generated__/$resources.managed-form-fetch.server.ts"
        ),
        "export const createManagedFormEmailSender = () => undefined;\nexport const validateManagedFormEmail = () => undefined;\nexport const createManagedFormResourceFetch = () => globalThis.__testManagedFormFetch;\n"
      );
      await symlink(join(originalCwd, "node_modules"), "node_modules", "dir");
      await build({
        stdin: {
          contents: 'export { action } from "./app/routes/_index"',
          resolveDir: tempDir,
        },
        outfile: join(tempDir, "managed-browser-headers-action.mjs"),
        bundle: true,
        platform: "node",
        format: "esm",
        packages: "external",
        loader: { ".css": "text" },
      });
      const { action } = await import(
        pathToFileURL(join(tempDir, "managed-browser-headers-action.mjs")).href
      );
      const received: Headers[] = [];
      vi.stubGlobal(
        "__testManagedFormFetch",
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          received.push(new Headers(new Request(input, init).headers));
          return Response.json({ accepted: true });
        })
      );
      const form = new FormData();
      form.set(managedFormIdFieldName, "root");
      form.set(formBotFieldName, Date.now().toString(16));
      form.set(managedFormArrayNamesFieldName, "[]");
      const response = await action({
        request: new Request(
          `https://site.example/?${managedFormRequestParamName}=1`,
          {
            method: "POST",
            headers: {
              host: "site.example",
              "cf-connecting-ip": "198.51.100.42",
              "x-forwarded-for": "203.0.113.200",
              "x-real-ip": "203.0.113.201",
              "user-agent": "Visitor Browser",
              "accept-language": "fr-CA,fr;q=0.9",
              cookie: "session=secret",
              authorization: "Bearer secret",
            },
            body: form,
          }
        ),
        context: { cloudflare: {} },
        params: {},
      });
      expect(response.success).toBe(true);
      expect(received).toHaveLength(1);
      expect(received[0].get("X-Forwarded-For")).toBe("198.51.100.42");
      expect(received[0].get("User-Agent")).toBe("Visitor Browser");
      expect(received[0].get("Accept-Language")).toBe("fr-CA,fr;q=0.9");
      expect(received[0].has("Cookie")).toBe(false);
      expect(received[0].has("Authorization")).toBe(false);
      expect(received[0].has("X-Real-IP")).toBe(false);

      const nodeResponse = await action({
        request: new Request(
          `https://site.example/?${managedFormRequestParamName}=1`,
          {
            method: "POST",
            headers: {
              host: "site.example",
              "cf-connecting-ip": "203.0.113.202",
              "x-forwarded-for": "203.0.113.200",
              "x-real-ip": "203.0.113.201",
              "user-agent": "Visitor Browser",
              "accept-language": "fr-CA,fr;q=0.9",
            },
            body: form,
          }
        ),
        context: {},
        params: {},
      });
      expect(nodeResponse.success).toBe(true);
      expect(received).toHaveLength(2);
      expect(received[1].has("X-Forwarded-For")).toBe(false);
    }
  );

  test("prerenders the new Form without native submission attributes", async () => {
    const siteData = createSiteData({
      instances: [
        [
          "root",
          {
            id: "root",
            component: "Box",
            children: [{ type: "id", value: "form" }],
          },
        ],
        [
          "form",
          {
            id: "form",
            component: "NativeForm",
            children: [],
          },
        ],
      ],
    });
    siteData.build.dataSources = [
      [
        "formData",
        {
          type: "parameter",
          id: "formData",
          name: "formData",
          scopeInstanceId: "form",
        },
      ],
      [
        "browserInfo",
        {
          type: "parameter",
          id: "browserInfo",
          name: "browserInfo",
          scopeInstanceId: "form",
        },
      ],
    ] as never;
    siteData.build.props = [
      [
        "formData",
        {
          id: "formData",
          instanceId: "form",
          name: "formData",
          type: "parameter",
          value: "formData",
        },
      ],
      [
        "browserInfo",
        {
          id: "browserInfo",
          instanceId: "form",
          name: "browserInfo",
          type: "parameter",
          value: "browserInfo",
        },
      ],
    ];
    await writeSiteData(siteData);

    await prebuild({ assets: false, template: ["ssg"] });
    await symlink(join(originalCwd, "node_modules"), "node_modules", "dir");
    await runGeneratedCommand("vite", ["build"]);
    await runGeneratedCommand("vike", ["prerender"]);

    const html = parseHtml(await readFile("dist/client/index.html", "utf8"));
    const [form] = findElementsByTagName(html, "form");
    expect(form).toBeDefined();
    expect(form?.attrs.map(({ name }) => name)).toEqual(["class", "method"]);
    expect(form?.attrs.find(({ name }) => name === "method")?.value).toBe(
      "dialog"
    );
    expect(form?.attrs.some(({ name }) => name === "action")).toBe(false);
  }, 30_000);

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
            value: `${encodeDataSourceVariable(
              SYSTEM_VARIABLE_ID
            )}.params.slug`,
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
        props: [
          [
            "root-title",
            {
              id: "root-title",
              instanceId: "root",
              name: "title",
              type: "expression",
              value: `${encodeDataVariableId(
                "posts-data"
              )}.data["post-1"].properties.title`,
            },
          ],
        ],
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

    expect(Object.values(pageData.resources)).toMatchObject([
      {
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
    ]);
    await runGeneratedCommand("vite", ["build"]);
    await runGeneratedCommand("vike", ["prerender"]);
    await expect(readFile("dist/client/index.html", "utf8")).resolves.toContain(
      "<!DOCTYPE html>"
    );
  }, 30_000);

  test("keeps resources used by XML collection pages in the request graph", async () => {
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
          id: "sitemap",
          name: "Sitemap",
          title: "Sitemap",
          path: "/sitemap.xml",
          rootInstanceId: "sitemap-body",
          meta: { documentType: "xml" },
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
          "sitemap-body",
          {
            id: "sitemap-body",
            component: "Box",
            children: [{ type: "id", value: "urlset" }],
          },
        ],
        [
          "urlset",
          {
            id: "urlset",
            component: elementComponent,
            tag: "urlset",
            children: [{ type: "id", value: "collection" }],
          },
        ],
        [
          "collection",
          {
            id: "collection",
            component: "ws:collection",
            children: [{ type: "id", value: "url" }],
          },
        ],
        [
          "url",
          {
            id: "url",
            component: elementComponent,
            tag: "url",
            children: [],
          },
        ],
      ],
      props: [
        [
          "collection-data",
          {
            id: "collection-data",
            instanceId: "collection",
            name: "data",
            type: "expression",
            value: `${encodeDataVariableId("sitemap-data-source")}?.data`,
          },
        ],
        [
          "collection-item",
          {
            id: "collection-item",
            instanceId: "collection",
            name: "item",
            type: "parameter",
            value: "sitemap-item",
          },
        ],
      ],
    });
    siteData.build.dataSources = [
      [
        "sitemap-data-source",
        {
          id: "sitemap-data-source",
          type: "resource",
          name: "Static Sitemap",
          resourceId: "sitemap-resource",
          scopeInstanceId: "collection",
        },
      ],
    ] as never;
    siteData.build.resources = [
      [
        "sitemap-resource",
        {
          id: "sitemap-resource",
          name: "Static Sitemap",
          control: "system",
          method: "get",
          url: '"/$resources/sitemap.xml"',
          headers: [],
        },
      ],
    ] as never;
    await writeSiteData(siteData);

    await prebuild({ assets: false, template: ["react-router"] });

    await expect(
      readFile("app/__generated__/[sitemap.xml]._index.server.tsx", "utf8")
    ).resolves.toContain('rootIds: [\n      "sitemap-resource"');
  });

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

  test("exposes anonymous structured diagnostics for invalid asset fields", async () => {
    const data = structuredClone(createSiteData()) as unknown as {
      assets: Array<Record<string, unknown>>;
    };
    data.assets[0] = { ...data.assets[0], type: "future-video" };
    await writeFile(".webstudio/data.json", JSON.stringify(data));

    try {
      await prebuild({ assets: false, template: ["defaults"] });
      throw new Error("Expected invalid bundle to fail.");
    } catch (error) {
      expect(error).toMatchObject({
        code: "PROJECT_BUNDLE_INVALID",
        bundleVersion,
        issues: expect.arrayContaining([
          expect.objectContaining({
            path: ["assets", "0", "type"],
            code: "invalid_value",
          }),
        ]),
      });
    }
  });
});
