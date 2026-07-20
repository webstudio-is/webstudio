import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { bundleVersion } from "@webstudio-is/protocol";
import { generateRedirectsModule, prebuild } from "./prebuild";

const originalCwd = process.cwd();
const originalFetch = globalThis.fetch;
let tempDir: string;
let consoleInfo: ReturnType<typeof vi.spyOn>;
const rootFolderId = "root";
const elementComponent = "ws:element";
const slowPrebuildTestTimeout = 15_000;
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
    assets: [
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

describe("prebuild", () => {
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

    await expect(
      readFile("app/__generated__/$resources.assets.ts", "utf8")
    ).resolves.toContain("image.png");
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

  test("uses pass-through images in the base react-router template", async () => {
    await prebuild({ assets: false, template: ["react-router"] });

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

  test("selects ssg templates and skips dynamic routes", async () => {
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
    await expect(
      readFile("pages/blog/:slug/+Page.tsx", "utf8")
    ).rejects.toThrow("ENOENT");
    await expect(
      readFile("app/__generated__/[blog].$slug._index.tsx", "utf8")
    ).resolves.toContain("export { Page }");
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
});
