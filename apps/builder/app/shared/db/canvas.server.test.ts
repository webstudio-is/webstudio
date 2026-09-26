import { expect, test, vi } from "vitest";
import {
  createAssetResourceRequest,
  createStructuredAssetQueryResourceBody,
  type Asset,
} from "@webstudio-is/sdk";
import { loadResource } from "@webstudio-is/sdk/runtime";
import {
  createAssetIndex,
  createCanonicalAssetFileEntry,
  createContentRuntimeArtifact,
} from "@webstudio-is/content-engine/compiler";
import { createGeneratedAssetResourceRuntime } from "@webstudio-is/content-engine/runtime";
import { createDocumentGraph } from "@webstudio-is/content-engine";
import type { StyleValue } from "@webstudio-is/css-engine";
import {
  createImageAssetFixture,
  createPublishedProjectBundleFixture,
  createSerializedBuildFixture,
} from "@webstudio-is/protocol/fixtures";
import { migratePages } from "@webstudio-is/project-migrations/pages";
import { __testing__ } from "./canvas.server";

const {
  addProjectMetadata,
  createLoadPublishedProjectBundleByProjectId,
  serializeProjectBundle,
} = __testing__;
type BundleBuild = Parameters<typeof serializeProjectBundle>[0]["build"];

const createBundleBuild = (
  overrides: Partial<BundleBuild> = {}
): BundleBuild => {
  const serializedBuild = createSerializedBuildFixture();
  return {
    ...serializedBuild,
    pages: migratePages(serializedBuild.pages),
    breakpoints: [],
    styles: [],
    styleSources: [],
    styleSourceSelections: [],
    props: [],
    instances: [],
    dataSources: [],
    resources: [],
    deployment: undefined,
    marketplaceProduct: {
      category: "pageTemplates",
      name: "Test product",
      thumbnailAssetId: "asset-id",
      author: "Author",
      email: "author@example.com",
      description: "Description",
    },
    projectSettings: { meta: {}, compiler: {} },
    ...overrides,
  };
};

test("serializes dev builds into project bundles without requiring deployment", () => {
  const build = createBundleBuild();
  const imageAsset = createImageAssetFixture({ projectId: build.projectId });
  const videoAsset: Asset = {
    ...imageAsset,
    id: "video-asset",
    name: "video.mp4",
    type: "video",
    format: "mp4",
  };

  const bundle = serializeProjectBundle({
    build,
    assets: [imageAsset, videoAsset],
  });

  expect(bundle.build.id).toBe(build.id);
  expect(bundle.build.deployment).toBeUndefined();
  expect(bundle.page.path).toBe("");
  expect(bundle.assets).toEqual([imageAsset, videoAsset]);
});

test("keeps font assets referenced from nested style values", () => {
  const build = createBundleBuild({
    styles: [
      {
        styleSourceId: "token",
        breakpointId: "base",
        property: "fontFamily",
        value: {
          type: "layers",
          value: [
            {
              type: "fontFamily",
              value: ["TokenFont", "sans-serif"],
            },
          ],
        } as unknown as StyleValue,
      },
    ],
  });
  const fontAsset: Asset = {
    id: "font-asset",
    projectId: build.projectId,
    name: "TokenFont.woff2",
    type: "font",
    createdAt: "2024-01-01T00:00:00.000Z",
    format: "woff2",
    size: 100,
    meta: { family: "TokenFont", style: "normal", weight: 400 },
  };

  const bundle = serializeProjectBundle({
    build,
    assets: [fontAsset],
  });

  expect(bundle.assets).toEqual([fontAsset]);
});

test("validates collections when publication does not need a content index", async () => {
  const build = createBundleBuild({
    styles: [
      {
        styleSourceId: "token",
        breakpointId: "base",
        property: "fontFamily",
        value: {
          type: "layers",
          value: [
            {
              type: "fontFamily",
              value: ["UsedFont", "sans-serif"],
            },
          ],
        } as unknown as StyleValue,
      },
    ],
  });
  const usedFont: Asset = {
    id: "used-font",
    projectId: build.projectId,
    name: "UsedFont.woff2",
    type: "font",
    createdAt: "2024-01-01T00:00:00.000Z",
    format: "woff2",
    size: 100,
    meta: { family: "UsedFont", style: "normal", weight: 400 },
  };
  const unusedFont: Asset = {
    ...usedFont,
    id: "unused-font",
    name: "UnusedFont.woff2",
    meta: { ...usedFont.meta, family: "UnusedFont" },
  };
  const imageAsset = createImageAssetFixture({ projectId: build.projectId });
  const currentAssetFolders = [{ id: "current-folder" }] as never;
  const data = serializeProjectBundle({
    build,
    assets: [usedFont],
  });
  const validatePublishedAssetCollections = vi.fn().mockResolvedValue({
    assets: [usedFont, unusedFont, imageAsset],
    assetFolders: currentAssetFolders,
  });
  const preparePublishedAssetData = vi.fn();
  const assetStore = {} as never;

  const result = await addProjectMetadata(
    data,
    {
      id: "project-id",
      userId: null,
      domain: "example.com",
      title: "Example",
    } as never,
    {} as never,
    {
      getUserById: vi.fn(),
      preparePublishedAssetData,
      validatePublishedAssetCollections,
      createAssetClient: vi.fn(() => assetStore),
    }
  );

  expect(validatePublishedAssetCollections).toHaveBeenCalledWith({
    projectId: "project-id",
    context: {},
    assetStore,
  });
  expect(preparePublishedAssetData).not.toHaveBeenCalled();
  expect(result.assets).toEqual([usedFont, imageAsset]);
  expect(result.assetFolders).toBe(currentAssetFolders);
});

test("build-id bundles do not read MDX bodies while preparing the RPC response", async () => {
  const build = createBundleBuild();
  const rootInstanceId = build.pages.pages.get(
    build.pages.homePageId
  )?.rootInstanceId;
  if (rootInstanceId === undefined) {
    throw new Error("Home page root is missing");
  }
  build.instances = [
    {
      type: "instance",
      id: rootInstanceId,
      component: "ws:block",
      children: [],
    },
  ];
  build.props = [
    {
      id: "article-source",
      instanceId: rootInstanceId,
      name: "src",
      type: "asset",
      value: "article",
    },
  ];
  const article: Asset = {
    ...createImageAssetFixture({ projectId: build.projectId }),
    id: "article",
    name: "article.mdx",
    type: "file",
    format: "mdx",
    meta: {},
  };
  const preparePublishedAssetData = vi.fn(() => {
    throw new Error("RPC attempted to read article content");
  });
  const validatePublishedAssetCollections = vi.fn().mockResolvedValue({
    assets: [article],
    assetFolders: [],
  });
  const data = serializeProjectBundle({ build, assets: [article] });
  const project = {
    id: build.projectId,
    userId: null,
    domain: "example.com",
    title: "Example",
  } as never;
  const dependencies = {
    getUserById: vi.fn(),
    preparePublishedAssetData,
    validatePublishedAssetCollections,
    createAssetClient: vi.fn(() => ({}) as never),
  };

  await expect(
    addProjectMetadata(data, project, {} as never, dependencies)
  ).rejects.toThrow("RPC attempted to read article content");
  preparePublishedAssetData.mockClear();

  const result = await addProjectMetadata(
    data,
    project,
    {} as never,
    dependencies,
    { contentIndex: "client" }
  );

  expect(preparePublishedAssetData).not.toHaveBeenCalled();
  expect(validatePublishedAssetCollections).toHaveBeenCalledOnce();
  expect(result.assetIndex).toBeUndefined();
  expect(result.assets).toContainEqual(article);
});

test.each([
  { origin: "https://project.wstd.io", destination: "saas" as const },
  { origin: "https://custom.example", destination: "saas" as const },
  { origin: "https://project.wstd.io", destination: "static" as const },
])(
  "prepares Assets queries for $destination builds on $origin",
  async ({ origin, destination }) => {
    const source = "---\nslug: post\ntitle: Post\n---\nArticle body\n";
    const article: Asset = {
      ...createImageAssetFixture(),
      id: "article",
      name: "article.md",
      type: "file",
      format: "md",
      size: new TextEncoder().encode(source).byteLength,
      meta: {},
    };
    const configuration = {
      result: "one" as const,
      where: {
        field: ["properties", "slug"],
        operator: "eq" as const,
        value: "system.params.slug",
      },
      sort: [],
      limit: "1",
      offset: "0",
      output: { mode: "all" as const, includeMetadata: false },
      content: { mode: "markdown-body-ref" as const },
    };
    const build = createBundleBuild({
      deployment:
        destination === "saas"
          ? { destination, domains: [] }
          : {
              destination,
              name: "site.zip",
              assetsDomain: origin,
              templates: ["ssg"],
            },
      resources: [
        {
          id: "article-query",
          name: "Article",
          control: "system",
          method: "post",
          url: '"/$resources/assets"',
          headers: [],
          body: createStructuredAssetQueryResourceBody(configuration),
        },
      ],
      dataSources: [
        {
          id: "article-data",
          type: "resource",
          name: "Article",
          resourceId: "article-query",
        },
      ],
    });
    const artifact = await createAssetIndex({
      projectId: build.projectId,
      entries: [
        createCanonicalAssetFileEntry({
          projectId: build.projectId,
          document: {
            _id: article.id,
            _type: "asset.file",
            name: article.name,
            path: article.name,
            key: "article",
            extension: "md",
            mimeType: "text/markdown",
            size: article.size,
            revision: "article-r1",
            contentRef: article.name,
            properties: { slug: "post", title: "Post" },
          },
        }),
      ],
      documentGraph: createDocumentGraph({
        nodes: [
          {
            id: article.id,
            revision: "article-r1",
            contentRef: article.name,
            format: "markdown",
          },
        ],
        edges: [],
      }),
    });
    const preparePublishedAssetData = vi.fn(async () => ({
      artifact,
      assets: [article],
      assetFolders: [],
    }));
    const bundle = await addProjectMetadata(
      serializeProjectBundle({ build, assets: [article] }),
      {
        id: build.projectId,
        userId: null,
        domain: "project.wstd.io",
        title: "Example",
      } as never,
      {} as never,
      {
        getUserById: vi.fn(),
        preparePublishedAssetData,
        validatePublishedAssetCollections: vi.fn(async () => ({
          assets: [article],
          assetFolders: [],
        })),
        createAssetClient: vi.fn(() => ({}) as never),
      },
      { contentIndex: "client" }
    );
    if (destination === "static") {
      expect(preparePublishedAssetData).not.toHaveBeenCalled();
      expect(bundle.assetIndex).toBeUndefined();
      return;
    }
    const fetchDocument = vi.fn<typeof fetch>(async () => new Response(source));
    // Match the generated runtime: a bundle without an index uses ordinary fetch.
    const generatedFetch =
      bundle.assetIndex === undefined
        ? fetch
        : await createGeneratedAssetResourceRuntime({
            deploymentId: build.id,
            artifact: createContentRuntimeArtifact(bundle.assetIndex),
            runtimeAssets: {
              [article.id]: {
                url: `/assets/${article.name}`,
                contentRef: article.name,
              },
            },
          })({
            request: new Request(`${origin}/blog/post`),
            fallback: fetchDocument,
          });
    const result = await loadResource(
      generatedFetch,
      createAssetResourceRequest({
        query: {
          ...configuration,
          where: { ...configuration.where, value: "post" },
          limit: undefined,
          offset: undefined,
        },
      })
    );
    expect(result).toMatchObject({
      ok: true,
      status: 200,
      data: {
        properties: { title: "Post" },
        content: { text: "Article body\n" },
      },
    });
    expect(preparePublishedAssetData).toHaveBeenCalledOnce();
    expect(bundle.assetIndex?.contents).toBeUndefined();
    expect(fetchDocument).toHaveBeenCalledOnce();
    expect((fetchDocument.mock.calls[0][0] as Request).url).toBe(
      `${origin}/assets/article.md`
    );
  }
);

test("loads project-id bundles from the published build", async () => {
  const data = createPublishedProjectBundleFixture();
  const project = {
    id: "project-id",
    latestBuildVirtual: { buildId: "published-build-id" },
  } as never;
  const context = { context: true } as never;
  const loadProductionCanvasDataAndProject = vi.fn().mockResolvedValue({
    data,
    project,
  });
  const addProjectMetadata = vi.fn().mockResolvedValue(data);
  const loadProjectById = vi.fn().mockResolvedValue(project);
  const loadPublishedProjectBundleByProjectId =
    createLoadPublishedProjectBundleByProjectId({
      addProjectMetadata,
      loadProductionCanvasDataAndProject,
      loadProjectById,
    });

  await expect(
    loadPublishedProjectBundleByProjectId("project-id", context)
  ).resolves.toBe(data);

  expect(loadProjectById).toHaveBeenCalledWith("project-id", context);
  expect(loadProductionCanvasDataAndProject).toHaveBeenCalledWith(
    "published-build-id",
    context,
    project
  );
  expect(addProjectMetadata).toHaveBeenCalledWith(data, project, context);
});

test("rejects project-id bundle loads for unpublished projects", async () => {
  const loadPublishedProjectBundleByProjectId =
    createLoadPublishedProjectBundleByProjectId({
      addProjectMetadata: vi.fn(),
      loadProductionCanvasDataAndProject: vi.fn(),
      loadProjectById: vi
        .fn()
        .mockResolvedValue({ latestBuildVirtual: null } as never),
    });

  await expect(
    loadPublishedProjectBundleByProjectId("project-id", {} as never)
  ).rejects.toThrow("The project is not published yet");
});
