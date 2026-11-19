import { afterAll, afterEach, expect, test, vi } from "vitest";
import { enableMapSet } from "immer";
import { createAssetContentSession } from "@webstudio-is/content-engine/asset-content-session";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { PageTransferItem } from "@webstudio-is/project-build/transfer";
import {
  blockComponent,
  blockTemplateComponent,
  createDefaultStructuredAssetQueryResourceConfiguration,
  createStructuredAssetQueryResourceBody,
  encodeDataSourceVariable,
  parseStructuredAssetQueryResourceBody,
  ROOT_FOLDER_ID,
  ROOT_INSTANCE_ID,
  type Asset,
  type DataSource,
  type Instance,
} from "@webstudio-is/sdk";
import type { Project } from "@webstudio-is/project";
import { registerContainers, serverSyncStore } from "../sync/sync-stores";
import { reportTransactionCompletion } from "../sync/project-queue";
import { draftPersistence } from "../sync/draft-persistence";
import { transferBuilderPage } from "./transfer-page.client";
import {
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $project,
  $props,
  $resources,
  $styleSourceSelections,
  $styleSources,
  $styles,
} from "../sync/data-stores";
import {
  $editingPageId,
  $editingTemplateId,
  selectInstance,
  $selectedPageId,
} from "../nano-states";
import {
  copyFolderData,
  copyPageData,
  copyTemplateData,
  handlePastePage,
  pageText,
  __testing__,
} from "./plugin-page";
import { pasteHandled, pasteIgnored } from "./copy-paste";
import { __testing__ as builderApiTesting } from "../builder-api";
import {
  __testing__ as assetContentBridgeTesting,
  createAssetContentBridge,
} from "../asset-content-bridge.client";

enableMapSet();
registerContainers();
afterAll(builderApiTesting.useLocalApi());
const { preparePageTransferItem } = __testing__;

afterEach(() => {
  vi.restoreAllMocks();
});

const resetBuildStores = () => {
  $instances.set(new Map());
  $props.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
  $breakpoints.set(new Map());
  $styleSourceSelections.set(new Map());
  $styleSources.set(new Map());
  $styles.set(new Map());
  $assets.set(new Map());
  $editingPageId.set(undefined);
  $editingTemplateId.set(undefined);
  selectInstance(undefined);
  $selectedPageId.set(undefined);
};

test("rejects historical Form page clipboard before importing or inserting", async () => {
  const importAssets = vi.spyOn(builderApiTesting.api, "importAssets");
  const before = structuredClone($pages.get());
  const fragment = {
    children: [],
    instances: [],
    assets: [],
    dataSources: [],
    resources: [],
    props: [],
    breakpoints: [],
    styleSourceSelections: [],
    styleSources: [],
    styles: [],
  };
  const clipboardData = JSON.stringify({
    "@webstudio/page/v0.1": {
      type: "page",
      page: {
        id: "old-page",
        name: "Old page",
        path: "/old-page",
        title: '"Old page"',
        meta: {},
        rootInstanceId: "form",
      },
      rootFragment: fragment,
      bodyFragment: {
        ...fragment,
        instances: [
          { type: "instance", id: "form", component: "Form", children: [] },
        ],
      },
    },
  });

  expect(await handlePastePage(clipboardData, ROOT_FOLDER_ID)).toMatchObject({
    success: false,
    error: expect.stringMatching(/Copy it again/),
  });
  expect(importAssets).not.toHaveBeenCalled();
  expect($pages.get()).toEqual(before);
});

const setRootLocalStyle = ({
  styleSourceId,
  value,
}: {
  styleSourceId: string;
  value: string;
}) => {
  $instances.set(
    new Map([
      ...$instances.get(),
      [
        ROOT_INSTANCE_ID,
        {
          type: "instance",
          id: ROOT_INSTANCE_ID,
          component: "Box",
          children: [],
        } satisfies Instance,
      ],
    ])
  );
  $breakpoints.set(new Map([["base", { id: "base", label: "Base" }]]));
  $styleSources.set(
    new Map([[styleSourceId, { id: styleSourceId, type: "local" }]])
  );
  $styleSourceSelections.set(
    new Map([
      [
        ROOT_INSTANCE_ID,
        { instanceId: ROOT_INSTANCE_ID, values: [styleSourceId] },
      ],
    ])
  );
  $styles.set(
    new Map([
      [
        `${styleSourceId}:base:color:`,
        {
          styleSourceId,
          breakpointId: "base",
          property: "color",
          value: { type: "keyword", value },
        },
      ],
    ])
  );
};

const addRootTokenStyle = ({
  styleSourceId,
  value,
}: {
  styleSourceId: string;
  value: string;
}) => {
  const styleSources = new Map($styleSources.get());
  styleSources.set(styleSourceId, {
    id: styleSourceId,
    type: "token",
    name: "primary",
  });
  $styleSources.set(styleSources);

  const rootSelection = $styleSourceSelections.get().get(ROOT_INSTANCE_ID);
  const selections = new Map($styleSourceSelections.get());
  selections.set(ROOT_INSTANCE_ID, {
    instanceId: ROOT_INSTANCE_ID,
    values: [...(rootSelection?.values ?? []), styleSourceId],
  });
  $styleSourceSelections.set(selections);

  const styles = new Map($styles.get());
  styles.set(`${styleSourceId}:base:color:`, {
    styleSourceId,
    breakpointId: "base",
    property: "color",
    value: { type: "keyword", value },
  });
  $styles.set(styles);
};

const updateRootLocalStyle = (value: string) => {
  const rootLocalStyle = Array.from($styles.get().values()).find(
    (style) =>
      $styleSources.get().get(style.styleSourceId)?.type === "local" &&
      style.property === "color"
  );
  if (rootLocalStyle === undefined) {
    throw new Error("Expected root local color style");
  }
  const styles = new Map($styles.get());
  styles.set(`${rootLocalStyle.styleSourceId}:base:color:`, {
    ...rootLocalStyle,
    value: { type: "keyword", value },
  });
  $styles.set(styles);
};

const setupProjectWithRootStyle = ({
  projectId,
  pageId,
  rootInstanceId,
  styleSourceId,
  color,
}: {
  projectId: string;
  pageId: string;
  rootInstanceId: string;
  styleSourceId: string;
  color: string;
}) => {
  $project.set({ id: projectId } as Project);
  resetBuildStores();
  const pages = createDefaultPages({ homePageId: pageId, rootInstanceId });
  $pages.set(pages);
  $instances.set(
    new Map([
      [
        rootInstanceId,
        {
          type: "instance",
          id: rootInstanceId,
          component: "Body",
          children: [],
        } satisfies Instance,
      ],
    ])
  );
  setRootLocalStyle({ styleSourceId, value: color });
  return pages;
};

test("copies the selected page root from the copy plugin", async () => {
  $project.set({ id: "source-project" } as Project);
  resetBuildStores();

  const pages = createDefaultPages({
    homePageId: "source-page",
    rootInstanceId: "source-root",
  });
  const page = pages.pages.get("source-page");
  if (page === undefined) {
    throw new Error("Expected source page");
  }
  page.name = "Selected Page";
  $pages.set(pages);
  $selectedPageId.set("source-page");
  selectInstance(["source-root"]);
  $instances.set(
    new Map<Instance["id"], Instance>([
      [
        "source-root",
        {
          type: "instance",
          id: "source-root",
          component: "Body",
          children: [],
        },
      ],
    ])
  );

  expect(await pageText.onCopy?.()).toContain('"type":"page"');
  expect(await pageText.onCopy?.()).toContain('"name":"Selected Page"');
});

test("pastes a same-project page repeatedly without reusing its source grant", async () => {
  const pages = setupProjectWithRootStyle({
    projectId: "same-project",
    pageId: "source-page",
    rootInstanceId: "source-body",
    styleSourceId: "source-local",
    color: "red",
  });
  const clipboard = JSON.parse((await copyPageData("source-page")) ?? "");
  clipboard["@webstudio/page/v0.1"].sourceGrant = "expired-after-first-paste";
  clipboard["@webstudio/page/v0.1"].sourceRevision = {
    buildId: "source-build",
    version: 4,
  };
  const transferPage = vi.fn(transferBuilderPage);
  const initialPageCount = pages.pages.size;

  expect(
    await handlePastePage(
      JSON.stringify(clipboard),
      ROOT_FOLDER_ID,
      transferPage
    )
  ).toEqual(pasteHandled);
  expect(
    await handlePastePage(
      JSON.stringify(clipboard),
      ROOT_FOLDER_ID,
      transferPage
    )
  ).toEqual(pasteHandled);

  expect($pages.get()?.pages.size).toBe(initialPageCount + 2);
  expect(transferPage).not.toHaveBeenCalled();
});

test("copies local page data when draft persistence has failed", async () => {
  setupProjectWithRootStyle({
    projectId: "same-project",
    pageId: "source-page",
    rootInstanceId: "source-body",
    styleSourceId: "source-local",
    color: "red",
  });
  draftPersistence.reset("same-project");
  draftPersistence.begin("same-project", "failed-save");
  draftPersistence.complete("same-project", "failed-save", false);
  const request = vi.fn<typeof fetch>();

  try {
    const clipboardData = await copyPageData("source-page", request);
    expect(clipboardData).toBeDefined();
    const data = JSON.parse(clipboardData ?? "")["@webstudio/page/v0.1"];
    expect(data.sourceProjectId).toBe("same-project");
    expect(data.sourceGrant).toBeUndefined();
    expect(request).not.toHaveBeenCalled();
  } finally {
    draftPersistence.reset();
  }
});

test("copies the edited folder from the copy plugin", async () => {
  $project.set({ id: "source-project" } as Project);
  resetBuildStores();

  const pages = createDefaultPages({
    homePageId: "source-page",
    rootInstanceId: "source-root",
  });
  pages.folders.set("source-folder", {
    id: "source-folder",
    name: "Edited Folder",
    slug: "edited-folder",
    children: [],
  });
  $pages.set(pages);
  $editingPageId.set("source-folder");
  $instances.set(
    new Map<Instance["id"], Instance>([
      [
        "source-root",
        {
          type: "instance",
          id: "source-root",
          component: "Body",
          children: [],
        },
      ],
    ])
  );

  expect(await pageText.onCopy?.()).toContain('"type":"folder"');
  expect(await pageText.onCopy?.()).toContain('"name":"Edited Folder"');
});

test("copies page data across projects", async () => {
  $project.set({ id: "source-project" } as Project);
  resetBuildStores();

  const sourcePages = createDefaultPages({
    homePageId: "source-page",
    rootInstanceId: "source-root",
  });
  const variable: DataSource = {
    id: "source-variable",
    scopeInstanceId: "source-root",
    name: "title",
    type: "variable",
    value: { type: "string", value: "" },
  };
  const variableName = encodeDataSourceVariable(variable.id);
  const sourcePage = sourcePages.pages.get("source-page");
  if (sourcePage === undefined) {
    throw new Error("Expected source page");
  }
  sourcePage.name = "Landing";
  sourcePage.path = "/landing";
  sourcePage.title = `"Landing " + ${variableName}`;
  sourcePage.meta.description = `"Description " + ${variableName}`;

  $pages.set(sourcePages);
  $selectedPageId.set(sourcePages.homePageId);
  $instances.set(
    new Map<Instance["id"], Instance>([
      [
        "source-root",
        {
          type: "instance",
          id: "source-root",
          component: "Body",
          children: [],
        },
      ],
    ])
  );
  $dataSources.set(new Map([[variable.id, variable]]));

  const clipboardData = await copyPageData("source-page");
  expect(clipboardData).toBeDefined();

  $project.set({ id: "target-project" } as Project);
  resetBuildStores();
  const targetPages = createDefaultPages({
    homePageId: "target-page",
    rootInstanceId: "target-root",
  });
  $pages.set(targetPages);
  $selectedPageId.set(targetPages.homePageId);
  $instances.set(
    new Map<Instance["id"], Instance>([
      [
        "target-root",
        {
          type: "instance",
          id: "target-root",
          component: "Body",
          children: [],
        },
      ],
    ])
  );

  await handlePastePage(clipboardData ?? "", ROOT_FOLDER_ID);

  const pastedPage = Array.from($pages.get()?.pages.values() ?? []).find(
    (page) => page.name === "Landing"
  );
  expect(pastedPage).toEqual({
    id: expect.any(String),
    name: "Landing",
    path: "/landing",
    title: expect.stringContaining("$ws$dataSource$"),
    rootInstanceId: expect.not.stringMatching("source-root"),
    meta: {
      description: expect.stringContaining("$ws$dataSource$"),
    },
  });
  expect($instances.get().has(pastedPage?.rootInstanceId ?? "")).toBe(true);
  expect($dataSources.get().has("source-variable")).toBe(false);
});

const checkCrossOriginPageAssets = async (targetProjectId: string) => {
  $project.set({ id: "source-project" } as Project);
  resetBuildStores();

  const sourcePages = createDefaultPages({
    homePageId: "source-page",
    rootInstanceId: "source-root",
  });
  const sourceAsset = {
    id: "source-asset",
    projectId: "source-project",
    name: "hero.png",
    type: "image",
    size: 128,
    format: "png",
    createdAt: "2026-01-01T00:00:00.000Z",
    description: null,
    meta: { width: 1200, height: 800 },
  } satisfies Asset;
  const importedAsset = {
    ...sourceAsset,
    id: "imported-asset",
    projectId: targetProjectId,
  } satisfies Asset;
  const sourcePage = sourcePages.pages.get("source-page");
  if (sourcePage === undefined) {
    throw new Error("Expected source page");
  }
  sourcePage.meta.socialImageAssetId = sourceAsset.id;
  sourcePage.marketplace = { thumbnailAssetId: sourceAsset.id };
  $pages.set(sourcePages);
  $selectedPageId.set(sourcePages.homePageId);
  $instances.set(
    new Map([
      [
        "source-root",
        {
          type: "instance",
          id: "source-root",
          component: "Body",
          children: [],
        } satisfies Instance,
      ],
    ])
  );
  $assets.set(new Map([[sourceAsset.id, sourceAsset]]));
  const clipboardData = JSON.parse((await copyPageData("source-page")) ?? "");
  expect(clipboardData["@webstudio/page/v0.1"].sourceOrigin).toBe(
    window.location.origin
  );
  expect(clipboardData["@webstudio/page/v0.1"].assetPaths).toEqual({
    "source-asset": "hero.png",
  });
  clipboardData["@webstudio/page/v0.1"].sourceOrigin =
    "https://source.example.com";

  $project.set({ id: targetProjectId } as Project);
  resetBuildStores();
  const targetPages = createDefaultPages({
    homePageId: "target-page",
    rootInstanceId: "target-root",
  });
  $pages.set(targetPages);
  $selectedPageId.set(targetPages.homePageId);
  $instances.set(
    new Map([
      [
        "target-root",
        {
          type: "instance",
          id: "target-root",
          component: "Body",
          children: [],
        } satisfies Instance,
      ],
    ])
  );
  const importAssets = vi.spyOn(builderApiTesting.api, "importAssets");
  const incompleteClipboardData = structuredClone(clipboardData);
  incompleteClipboardData["@webstudio/page/v0.1"].bodyFragment.assets = [];
  expect(
    await handlePastePage(
      JSON.stringify(incompleteClipboardData),
      ROOT_FOLDER_ID
    )
  ).toEqual({
    success: false,
    error:
      "Could not paste Webstudio page data. The clipboard data appears to be incomplete or invalid.",
  });
  expect(importAssets).not.toHaveBeenCalled();

  expect(
    await handlePastePage(JSON.stringify(clipboardData), ROOT_FOLDER_ID)
  ).toMatchObject({ success: false });
  expect(importAssets).not.toHaveBeenCalled();

  const sourceBuild = { buildId: "source-build", version: 4 };
  const targetBuild = {
    buildId: "target-build",
    version: 9,
    contractVersion: "copy-contract",
    storageScope: "target-storage",
  };
  const transferData = clipboardData["@webstudio/page/v0.1"];
  transferData.sourceGrant = "scoped-copy-grant";
  transferData.sourceRevision = sourceBuild;
  let uploaded: Asset | undefined;
  let reservedId = "";
  let reads = 0;
  const stepOrder: string[] = [];
  const readSourceRequest: typeof fetch = async (url, init) => {
    expect(new URL(String(url)).origin).toBe("https://source.example.com");
    expect(init?.credentials).toBe("omit");
    expect(init?.redirect).toBe("error");
    const body = JSON.parse(String(init?.body));
    expect(body.grant).toBe("scoped-copy-grant");
    if (body.kind === "manifest") {
      return Response.json({
        source: {
          projectId: "source-project",
          pageId: "source-page",
          ...sourceBuild,
        },
        storageScope: "source-storage",
        assets: [sourceAsset],
        folders: [],
      });
    }
    expect(body.assetId).toBe(sourceAsset.id);
    expect(body.expectedName).toBe(sourceAsset.name);
    reads += 1;
    return new Response(new Uint8Array(sourceAsset.size));
  };
  const destinationOrigin =
    "https://p-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.apps.webstudio.is";
  const request: typeof fetch = async (url, init) => {
    const requested = new URL(String(url));
    expect(requested.origin).toBe(destinationOrigin);
    const path = requested.pathname;
    if (path === "/rest/assets") {
      return Response.json({
        assets: uploaded === undefined ? [] : [uploaded],
      });
    }
    if (path === "/rest/assets/folders") {
      return Response.json({ folders: [] });
    }
    if (path === "/rest/page-copy/destination" && init?.method !== "POST") {
      return Response.json(targetBuild);
    }
    if (path === "/rest/page-copy/destination") {
      const body = JSON.parse(String(init?.body));
      expect(body.kind).toBe("reserve");
      reservedId = body.assetId;
      stepOrder.push("reserve");
      return Response.json({
        name: "reserved-hero.png",
        assetId: reservedId,
        deduplicated: false,
      });
    }
    if (path === "/rest/assets/uploads/reserved-hero.png") {
      uploaded = { ...importedAsset, id: reservedId };
      stepOrder.push("upload");
      return Response.json({ uploadedAssets: [uploaded] });
    }
    throw new Error(`Unexpected transfer request: ${path}`);
  };

  draftPersistence.reset(targetProjectId);
  const unsubscribe = serverSyncStore.subscribe((id, payload) => {
    if (payload.some(({ namespace }) => namespace === "pages")) {
      stepOrder.push("commit");
      reportTransactionCompletion(id, true);
    }
  });
  try {
    const transfer = (input: Parameters<typeof transferBuilderPage>[0]) =>
      transferBuilderPage({
        ...input,
        request,
        readSourceRequest,
        destinationOrigin,
      });
    transferData.sourceRevision = { ...sourceBuild, version: 3 };
    expect(
      await handlePastePage(
        JSON.stringify(clipboardData),
        ROOT_FOLDER_ID,
        transfer
      )
    ).toMatchObject({ success: false });
    expect(stepOrder).toEqual([]);
    transferData.sourceRevision = sourceBuild;
    expect(
      await handlePastePage(
        JSON.stringify(clipboardData),
        ROOT_FOLDER_ID,
        transfer
      )
    ).toEqual(pasteHandled);
  } finally {
    unsubscribe();
    draftPersistence.reset();
  }
  const pastedPage = Array.from($pages.get()?.pages.values() ?? []).find(
    (page) => page.id !== "target-page"
  );
  expect(pastedPage?.meta.socialImageAssetId).toBe(reservedId);
  expect(pastedPage?.marketplace?.thumbnailAssetId).toBe(reservedId);
  expect(stepOrder).toEqual(["reserve", "upload", "commit"]);
  expect(reads).toBe(1);
  expect($assets.get().has(sourceAsset.id)).toBe(false);
};

test.each(["target-project", "source-project"])(
  "requires a grant to upload cross-origin page assets to %s",
  checkCrossOriginPageAssets
);

test("copies the fixed Assets query results and their document dependencies", async () => {
  resetBuildStores();
  const sourceProjectId = "query-source";
  const targetProjectId = "query-target";
  $project.set({ id: sourceProjectId } as Project);
  $pages.set(
    createDefaultPages({ homePageId: "source-page", rootInstanceId: "root" })
  );
  const query = {
    id: "query-data",
    type: "resource",
    name: "Article",
    resourceId: "article-query",
    scopeInstanceId: "root",
  } satisfies DataSource;
  $instances.set(
    new Map([
      [
        "root",
        {
          id: "root",
          type: "instance",
          component: "Body",
          children: [
            {
              type: "expression",
              value: `${encodeDataSourceVariable(query.id)}.data.title`,
            },
          ],
        },
      ],
    ])
  );
  $dataSources.set(new Map([[query.id, query]]));
  $resources.set(
    new Map([
      [
        query.resourceId,
        {
          id: query.resourceId,
          name: "Article",
          method: "post",
          url: '"/$resources/assets"',
          control: "system",
          headers: [],
          body: createStructuredAssetQueryResourceBody({
            ...createDefaultStructuredAssetQueryResourceConfiguration(),
            result: "one",
            where: { field: ["name"], operator: "eq", value: '"article.md"' },
          }),
        },
      ],
    ])
  );
  const documents = new Map([
    [
      "article",
      "---\ntitle: Article\nauthor:\n  $ref: ./author.md#frontmatter\n---\n",
    ],
    ["author", "---\navatar: ./hero.png\n---\n"],
  ]);
  const files = [...documents].map(
    ([id, contents]): Asset => ({
      id,
      projectId: sourceProjectId,
      name: `${id}.md`,
      format: "md",
      size: contents.length,
      type: "file",
      createdAt: "2026-01-01T00:00:00.000Z",
      meta: {},
    })
  );
  const hero: Asset = {
    ...files[0],
    id: "hero",
    name: "hero.png",
    format: "png",
    type: "image",
    meta: { width: 16, height: 16 },
  };
  const catalog = new Map([...files, hero].map((asset) => [asset.id, asset]));
  $assets.set(catalog);
  const session = createAssetContentSession({
    repository: {
      readContent: async ({ assetId }) => ({
        asset: catalog.get(assetId)!,
        data: (async function* () {
          yield new TextEncoder().encode(documents.get(assetId)!);
        })(),
      }),
      updateContent: async () => {
        throw new Error("Unexpected write to a source document");
      },
    },
    authorize: () => true,
  });
  assetContentBridgeTesting.initBridge(
    createAssetContentBridge({
      origin: window.location.origin,
      request: fetch,
      authorize: () => true,
      requireReload: () => {},
      getContentSession: () => session,
    })
  );

  const sourceRevision = { buildId: "source-build", version: 4 };
  let grantedIds: string[] = [];
  let pastedAssets: Asset[] = [];
  const request: typeof fetch = async (url, init) => {
    switch (new URL(String(url)).pathname) {
      case "/rest/page-copy/grant":
        grantedIds = JSON.parse(String(init?.body)).assetIds;
        return Response.json({ grant: "grant", ...sourceRevision });
      case "/rest/page-copy/content": {
        const body = JSON.parse(String(init?.body));
        expect(body.grant).toBe("grant");
        if (body.kind === "asset") {
          expect(grantedIds).toContain(body.assetId);
          return new Response(documents.get(body.assetId));
        }
        return Response.json({
          source: {
            projectId: sourceProjectId,
            pageId: "source-page",
            ...sourceRevision,
          },
          storageScope: "shared",
          assets: grantedIds.map((id) => catalog.get(id)),
          folders: [],
        });
      }
      case "/rest/page-copy/destination": {
        if (init?.method !== "POST") {
          return Response.json({
            buildId: "target-build",
            version: 5,
            contractVersion: "copy",
            storageScope: "shared",
          });
        }
        const body = JSON.parse(String(init.body));
        expect(body.kind).toBe("relink");
        pastedAssets = body.assets.map(
          ({ sourceId, targetId }: { sourceId: string; targetId: string }) => ({
            ...catalog.get(sourceId)!,
            id: targetId,
            projectId: targetProjectId,
          })
        );
        return Response.json({ created: pastedAssets, reused: [] });
      }
      case "/rest/assets":
        return Response.json({ assets: pastedAssets });
      case "/rest/assets/folders":
        return Response.json({ folders: [] });
      default:
        throw new Error(`Unexpected page copy request: ${url}`);
    }
  };
  const unsubscribe = serverSyncStore.subscribe((id, changes) => {
    if (changes.some(({ namespace }) => namespace === "pages")) {
      reportTransactionCompletion(id, true);
    }
  });
  try {
    const clipboard = await copyPageData("source-page", request);
    resetBuildStores();
    $project.set({ id: targetProjectId } as Project);
    $pages.set(
      createDefaultPages({ homePageId: "target-page", rootInstanceId: "body" })
    );
    $instances.set(
      new Map([
        [
          "body",
          { id: "body", type: "instance", component: "Body", children: [] },
        ],
      ])
    );
    draftPersistence.reset(targetProjectId);

    const paste = (data: string) =>
      handlePastePage(data, ROOT_FOLDER_ID, (input) =>
        transferBuilderPage({ ...input, request, readSourceRequest: request })
      );
    await expect(paste(clipboard ?? "")).resolves.toEqual(pasteHandled);

    const [pastedQuery] = $resources.get().values();
    expect(
      parseStructuredAssetQueryResourceBody(pastedQuery?.body)?.where
    ).toEqual({
      field: ["id"],
      operator: "eq",
      value: '"article"',
    });
    expect([...$assets.get().keys()].sort()).toEqual([
      "article",
      "author",
      "hero",
    ]);

    const unscoped = JSON.parse(clipboard ?? "");
    delete unscoped["@webstudio/page/v0.1"].sourceGrant;
    await expect(paste(JSON.stringify(unscoped))).resolves.toMatchObject({
      success: false,
      transfer: { code: "PAGE_COPY_RECOPY_REQUIRED" },
    });
  } finally {
    unsubscribe();
    draftPersistence.reset();
    assetContentBridgeTesting.clearBridge();
    session.dispose();
  }
});

test("pastes a dynamic Assets query only in its source project and reports why", async () => {
  resetBuildStores();
  $project.set({ id: "query-source" } as Project);
  $pages.set(
    createDefaultPages({ homePageId: "source-page", rootInstanceId: "root" })
  );
  const articleName: DataSource = {
    id: "article-name",
    name: "Article name",
    scopeInstanceId: "root",
    type: "variable",
    value: { type: "string", value: "article.md" },
  };
  const article: DataSource = {
    id: "article",
    name: "Article",
    scopeInstanceId: "root",
    type: "resource",
    resourceId: "article-query",
  };
  const queryBody = createStructuredAssetQueryResourceBody({
    ...createDefaultStructuredAssetQueryResourceConfiguration(),
    result: "one",
    where: {
      field: ["name"],
      operator: "eq",
      value: encodeDataSourceVariable(articleName.id),
    },
  });
  $instances.set(
    new Map([
      [
        "root",
        {
          id: "root",
          type: "instance",
          component: "Body",
          children: [
            {
              type: "expression",
              value: `${encodeDataSourceVariable(article.id)}.data.title`,
            },
          ],
        },
      ],
    ])
  );
  $dataSources.set(
    new Map<string, DataSource>([
      [articleName.id, articleName],
      [article.id, article],
    ])
  );
  $resources.set(
    new Map([
      [
        article.resourceId,
        {
          id: article.resourceId,
          name: "Article",
          method: "post",
          url: '"/$resources/assets"',
          control: "system",
          headers: [],
          body: queryBody,
        },
      ],
    ])
  );
  const clipboard = (await copyPageData("source-page")) ?? "";

  await expect(handlePastePage(clipboard, ROOT_FOLDER_ID)).resolves.toEqual(
    pasteHandled
  );
  expect($pages.get()?.pages.size).toBe(2);
  expect($resources.get().size).toBe(2);

  resetBuildStores();
  $project.set({ id: "query-target" } as Project);
  $pages.set(
    createDefaultPages({ homePageId: "target-page", rootInstanceId: "body" })
  );
  await expect(
    handlePastePage(clipboard, ROOT_FOLDER_ID)
  ).resolves.toMatchObject({
    success: false,
    transfer: { code: "PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED" },
  });
  expect($pages.get()?.pages.size).toBe(1);
});

test("preserves legacy page metadata assets that exist in the destination", async () => {
  $project.set({ id: "source-project" } as Project);
  resetBuildStores();
  const sourcePages = createDefaultPages({
    homePageId: "source-page",
    rootInstanceId: "source-root",
  });
  const sourcePage = sourcePages.pages.get("source-page");
  if (sourcePage === undefined) {
    throw new Error("Expected source page");
  }
  const sourceAsset = {
    id: "legacy-meta-asset",
    projectId: "source-project",
    name: "social.png",
    type: "image",
    size: 128,
    format: "png",
    createdAt: "2026-01-01T00:00:00.000Z",
    meta: { width: 1200, height: 630 },
  } satisfies Asset;
  sourcePage.meta.socialImageAssetId = sourceAsset.id;
  sourcePage.marketplace = { thumbnailAssetId: sourceAsset.id };
  $pages.set(sourcePages);
  $selectedPageId.set(sourcePages.homePageId);
  $instances.set(
    new Map([
      [
        "source-root",
        {
          type: "instance",
          id: "source-root",
          component: "Body",
          children: [],
        } satisfies Instance,
      ],
    ])
  );
  $assets.set(new Map([[sourceAsset.id, sourceAsset]]));
  const currentData = JSON.parse((await copyPageData("source-page")) ?? "")[
    "@webstudio/page/v0.1"
  ];
  delete currentData.sourceOrigin;
  currentData.bodyFragment.assets = [];
  const clipboardData = JSON.stringify({
    "@webstudio/page/v0.1": currentData,
  });

  $project.set({ id: "target-project" } as Project);
  resetBuildStores();
  const targetPages = createDefaultPages({
    homePageId: "target-page",
    rootInstanceId: "target-root",
  });
  $pages.set(targetPages);
  $selectedPageId.set(targetPages.homePageId);
  $instances.set(
    new Map([
      [
        "target-root",
        {
          type: "instance",
          id: "target-root",
          component: "Body",
          children: [],
        } satisfies Instance,
      ],
    ])
  );
  $assets.set(
    new Map([[sourceAsset.id, { ...sourceAsset, projectId: "target-project" }]])
  );
  const importAssets = vi.spyOn(builderApiTesting.api, "importAssets");

  expect(await handlePastePage(clipboardData, ROOT_FOLDER_ID)).toEqual(
    pasteHandled
  );
  const pastedPage = Array.from($pages.get()?.pages.values() ?? []).find(
    (page) => page.id !== "target-page"
  );
  expect(pastedPage?.meta.socialImageAssetId).toBe(sourceAsset.id);
  expect(pastedPage?.marketplace?.thumbnailAssetId).toBe(sourceAsset.id);
  expect(importAssets).not.toHaveBeenCalled();
});

test.each([
  ["ours", "blue"],
  ["theirs", "red"],
] as const)(
  "resolves conflicting global root styles with %s",
  async (resolution, expectedColor) => {
    setupProjectWithRootStyle({
      projectId: "source-project",
      pageId: "source-page",
      rootInstanceId: "source-body",
      styleSourceId: "source-local",
      color: "red",
    });
    $styles.get().set("source-local:base:fontSize:", {
      styleSourceId: "source-local",
      breakpointId: "base",
      property: "fontSize",
      value: { type: "keyword", value: "medium" },
    });
    const clipboardData = await copyPageData("source-page");

    setupProjectWithRootStyle({
      projectId: "target-project",
      pageId: "target-page",
      rootInstanceId: "target-body",
      styleSourceId: "target-local",
      color: "blue",
    });
    const conflictDialog = vi
      .spyOn(builderApiTesting.api, "showRootStyleConflictDialog")
      .mockResolvedValue(resolution);

    await handlePastePage(clipboardData ?? "", ROOT_FOLDER_ID);

    expect(conflictDialog).toHaveBeenCalledWith([
      expect.objectContaining({
        incomingStyle: expect.objectContaining({
          property: "color",
          value: { type: "keyword", value: "red" },
        }),
      }),
    ]);
    expect($styles.get().get("target-local:base:color:")?.value).toEqual({
      type: "keyword",
      value: expectedColor,
    });
    expect($styles.get().get("target-local:base:fontSize:")?.value).toEqual({
      type: "keyword",
      value: "medium",
    });
  }
);

test("cancels page paste when global root style resolution is cancelled", async () => {
  setupProjectWithRootStyle({
    projectId: "source-project",
    pageId: "source-page",
    rootInstanceId: "source-body",
    styleSourceId: "source-local",
    color: "red",
  });
  const sourceAsset = {
    id: "source-asset",
    projectId: "source-project",
    name: "hero.png",
    type: "image",
    size: 128,
    format: "png",
    createdAt: "2026-01-01T00:00:00.000Z",
    description: null,
    meta: { width: 1200, height: 800 },
  } satisfies Asset;
  const sourcePage = $pages.get()?.pages.get("source-page");
  if (sourcePage === undefined) {
    throw new Error("Expected source page");
  }
  sourcePage.meta.socialImageAssetId = sourceAsset.id;
  $assets.set(new Map([[sourceAsset.id, sourceAsset]]));
  const clipboardData = await copyPageData("source-page");

  const targetPages = setupProjectWithRootStyle({
    projectId: "target-project",
    pageId: "target-page",
    rootInstanceId: "target-body",
    styleSourceId: "target-local",
    color: "blue",
  });
  const initialPageCount = targetPages.pages.size;
  vi.spyOn(
    builderApiTesting.api,
    "showRootStyleConflictDialog"
  ).mockResolvedValue("cancel");
  const importAssets = vi.spyOn(builderApiTesting.api, "importAssets");

  await handlePastePage(clipboardData ?? "", ROOT_FOLDER_ID);

  expect($pages.get()?.pages.size).toBe(initialPageCount);
  expect(importAssets).not.toHaveBeenCalled();
  expect($styles.get().get("target-local:base:color:")?.value).toEqual({
    type: "keyword",
    value: "blue",
  });
});

test("checks current root styles after resolving token conflicts", async () => {
  setupProjectWithRootStyle({
    projectId: "source-project",
    pageId: "source-page",
    rootInstanceId: "source-body",
    styleSourceId: "source-local",
    color: "red",
  });
  addRootTokenStyle({ styleSourceId: "source-token", value: "red" });
  const clipboardData = await copyPageData("source-page");

  setupProjectWithRootStyle({
    projectId: "target-project",
    pageId: "target-page",
    rootInstanceId: "target-body",
    styleSourceId: "target-local",
    color: "red",
  });
  addRootTokenStyle({ styleSourceId: "target-token", value: "blue" });
  vi.spyOn(builderApiTesting.api, "showTokenConflictDialog").mockImplementation(
    async () => {
      updateRootLocalStyle("blue");
      return "ours";
    }
  );
  const rootConflictDialog = vi
    .spyOn(builderApiTesting.api, "showRootStyleConflictDialog")
    .mockResolvedValue("ours");

  await handlePastePage(clipboardData ?? "", ROOT_FOLDER_ID);

  expect(rootConflictDialog).toHaveBeenCalledOnce();
  expect($styles.get().get("target-local:base:color:")?.value).toEqual({
    type: "keyword",
    value: "blue",
  });
});

test("handles page paste data without falling through when insertion cannot complete", async () => {
  $project.set({ id: "source-project" } as Project);
  resetBuildStores();

  const sourcePages = createDefaultPages({
    homePageId: "source-page",
    rootInstanceId: "source-root",
  });
  $pages.set(sourcePages);
  $selectedPageId.set(sourcePages.homePageId);
  $instances.set(
    new Map<Instance["id"], Instance>([
      [
        "source-root",
        {
          type: "instance",
          id: "source-root",
          component: "Body",
          children: [],
        },
      ],
    ])
  );

  const clipboardData = await copyPageData("source-page");
  expect(clipboardData).toBeDefined();

  resetBuildStores();
  $project.set(undefined);
  const targetPages = createDefaultPages({
    homePageId: "target-page",
    rootInstanceId: "target-root",
  });
  const initialPageCount = targetPages.pages.size;
  $pages.set(targetPages);
  $selectedPageId.set(targetPages.homePageId);
  $instances.set(
    new Map<Instance["id"], Instance>([
      [
        "target-root",
        {
          type: "instance",
          id: "target-root",
          component: "Body",
          children: [],
        },
      ],
    ])
  );

  await expect(
    handlePastePage(clipboardData ?? "", ROOT_FOLDER_ID)
  ).resolves.toEqual(pasteHandled);
  expect($pages.get()?.pages.size).toBe(initialPageCount);
});

test("ignores non-page paste data", async () => {
  await expect(handlePastePage("plain text", ROOT_FOLDER_ID)).resolves.toEqual(
    pasteIgnored
  );
});

test("copies folder data with nested pages across projects", async () => {
  $project.set({ id: "source-project" } as Project);
  resetBuildStores();

  const sourcePages = createDefaultPages({
    homePageId: "source-home",
    rootInstanceId: "source-home-root",
  });
  sourcePages.folders.set("source-folder", {
    id: "source-folder",
    name: "Docs",
    slug: "docs",
    children: ["source-page-a", "source-subfolder"],
  });
  sourcePages.folders.set("source-subfolder", {
    id: "source-subfolder",
    name: "Nested",
    slug: "nested",
    children: ["source-page-b"],
  });
  sourcePages.folders
    .get(sourcePages.rootFolderId)
    ?.children.push("source-folder");
  sourcePages.pages.set("source-page-a", {
    id: "source-page-a",
    name: "Overview",
    path: "/overview",
    title: `"Overview"`,
    rootInstanceId: "source-page-a-root",
    meta: {},
  });
  sourcePages.pages.set("source-page-b", {
    id: "source-page-b",
    name: "Details",
    path: "/details",
    title: `"Details"`,
    rootInstanceId: "source-page-b-root",
    meta: {},
  });

  $pages.set(sourcePages);
  $selectedPageId.set(sourcePages.homePageId);
  $instances.set(
    new Map<Instance["id"], Instance>(
      ["source-home-root", "source-page-a-root", "source-page-b-root"].map(
        (id) => [
          id,
          {
            type: "instance",
            id,
            component: "Body",
            children: [],
          },
        ]
      )
    )
  );
  setRootLocalStyle({ styleSourceId: "source-local", value: "red" });

  const clipboardData = await copyFolderData("source-folder");
  expect(clipboardData).toBeDefined();

  $project.set({ id: "target-project" } as Project);
  resetBuildStores();
  const targetPages = createDefaultPages({
    homePageId: "target-home",
    rootInstanceId: "target-home-root",
  });
  $pages.set(targetPages);
  $selectedPageId.set(targetPages.homePageId);
  $instances.set(
    new Map<Instance["id"], Instance>([
      [
        "target-home-root",
        {
          type: "instance",
          id: "target-home-root",
          component: "Body",
          children: [],
        },
      ],
    ])
  );
  setRootLocalStyle({ styleSourceId: "target-local", value: "blue" });
  const conflictDialog = vi
    .spyOn(builderApiTesting.api, "showRootStyleConflictDialog")
    .mockResolvedValue("ours");

  await handlePastePage(clipboardData ?? "", ROOT_FOLDER_ID);

  expect(conflictDialog).toHaveBeenCalledOnce();
  expect($styles.get().get("target-local:base:color:")?.value).toEqual({
    type: "keyword",
    value: "blue",
  });
  const pastedFolder = Array.from($pages.get()?.folders.values() ?? []).find(
    (folder) => folder.name === "Docs"
  );
  expect(pastedFolder).toBeDefined();
  const pastedSubfolder = Array.from($pages.get()?.folders.values() ?? []).find(
    (folder) => folder.name === "Nested"
  );
  expect(pastedSubfolder).toBeDefined();
  const pastedPages = Array.from($pages.get()?.pages.values() ?? []).filter(
    (page) => page.name === "Overview" || page.name === "Details"
  );
  expect(pastedPages).toHaveLength(2);
  for (const page of pastedPages) {
    expect(page.rootInstanceId).not.toMatch(/^source-/);
    expect($instances.get().has(page.rootInstanceId)).toBe(true);
  }
});

test("preserves empty folder slugs when pasting folder data", async () => {
  $project.set({ id: "source-project" } as Project);
  resetBuildStores();

  const sourcePages = createDefaultPages({
    homePageId: "source-home",
    rootInstanceId: "source-home-root",
  });
  sourcePages.folders.set("source-folder", {
    id: "source-folder",
    name: "Empty Slug Folder",
    slug: "",
    children: [],
  });
  sourcePages.folders
    .get(sourcePages.rootFolderId)
    ?.children.push("source-folder");
  $pages.set(sourcePages);
  $selectedPageId.set(sourcePages.homePageId);
  $instances.set(
    new Map<Instance["id"], Instance>([
      [
        "source-home-root",
        {
          type: "instance",
          id: "source-home-root",
          component: "Body",
          children: [],
        },
      ],
    ])
  );

  const clipboardData = await copyFolderData("source-folder");
  expect(clipboardData).toBeDefined();

  $project.set({ id: "target-project" } as Project);
  resetBuildStores();
  const targetPages = createDefaultPages({
    homePageId: "target-home",
    rootInstanceId: "target-home-root",
  });
  targetPages.folders.set("existing-empty-slug-folder", {
    id: "existing-empty-slug-folder",
    name: "Existing Empty Slug Folder",
    slug: "",
    children: [],
  });
  targetPages.folders
    .get(targetPages.rootFolderId)
    ?.children.push("existing-empty-slug-folder");
  $pages.set(targetPages);
  $selectedPageId.set(targetPages.homePageId);
  $instances.set(
    new Map<Instance["id"], Instance>([
      [
        "target-home-root",
        {
          type: "instance",
          id: "target-home-root",
          component: "Body",
          children: [],
        },
      ],
    ])
  );

  await handlePastePage(clipboardData ?? "", ROOT_FOLDER_ID);

  const pastedFolder = Array.from($pages.get()?.folders.values() ?? []).find(
    (folder) => folder.name === "Empty Slug Folder"
  );
  expect(pastedFolder?.slug).toBe("");
});

test("copies template data as a template", async () => {
  $project.set({ id: "source-project" } as Project);
  resetBuildStores();

  const sourcePages = createDefaultPages({
    homePageId: "source-home",
    rootInstanceId: "source-home-root",
  });
  sourcePages.pageTemplates = new Map([
    [
      "template-id",
      {
        id: "template-id",
        name: "Landing Template",
        title: `"Landing title"`,
        rootInstanceId: "template-root",
        meta: { description: `"Template description"` },
      },
    ],
  ]);
  $pages.set(sourcePages);
  $selectedPageId.set(sourcePages.homePageId);
  $instances.set(
    new Map<Instance["id"], Instance>(
      ["source-home-root", "template-root"].map((id) => [
        id,
        {
          type: "instance",
          id,
          component: "Body",
          children: [],
        },
      ])
    )
  );
  setRootLocalStyle({ styleSourceId: "source-local", value: "red" });

  const clipboardData = await copyTemplateData("template-id");
  expect(clipboardData).toBeDefined();

  $project.set({ id: "target-project" } as Project);
  resetBuildStores();
  const targetPages = createDefaultPages({
    homePageId: "target-home",
    rootInstanceId: "target-home-root",
  });
  $pages.set(targetPages);
  $selectedPageId.set(targetPages.homePageId);
  $instances.set(
    new Map<Instance["id"], Instance>([
      [
        "target-home-root",
        {
          type: "instance",
          id: "target-home-root",
          component: "Body",
          children: [],
        },
      ],
    ])
  );
  setRootLocalStyle({ styleSourceId: "target-local", value: "blue" });
  const conflictDialog = vi
    .spyOn(builderApiTesting.api, "showRootStyleConflictDialog")
    .mockResolvedValue("theirs");

  await handlePastePage(clipboardData ?? "", ROOT_FOLDER_ID);

  expect(conflictDialog).toHaveBeenCalledOnce();
  expect($styles.get().get("target-local:base:color:")?.value).toEqual({
    type: "keyword",
    value: "red",
  });
  const pastedTemplate = Array.from(
    $pages.get()?.pageTemplates?.values() ?? []
  ).find((template) => template.name === "Landing Template");
  expect(pastedTemplate).toEqual({
    id: expect.any(String),
    name: "Landing Template",
    title: `"Landing title"`,
    rootInstanceId: expect.any(String),
    meta: { description: `"Template description"` },
  });
  expect(pastedTemplate?.rootInstanceId).not.toBe("template-root");

  const pastedPage = Array.from($pages.get()?.pages.values() ?? []).find(
    (page) => page.name === "Landing Template"
  );
  expect(pastedPage).toBeUndefined();
});

test.each(["page", "template", "folder"] as const)(
  "prepares connected MDX dependencies when copying a %s",
  async (type) => {
    $pages.set(createDefaultPages({ rootInstanceId: "body" }));
    const sourceAsset = {
      id: "article",
      projectId: "source-project",
      name: "article.mdx",
      type: "file",
      format: "mdx",
      size: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      description: null,
      meta: {},
    } satisfies Asset;
    const dependency = {
      ...sourceAsset,
      id: "hero",
      name: "hero.png",
      format: "png",
    } satisfies Asset;
    const socialImage = {
      ...dependency,
      id: "social-image",
      name: "social.png",
    };
    $assets.set(
      new Map([
        [sourceAsset.id, sourceAsset],
        [dependency.id, dependency],
        [socialImage.id, socialImage],
      ])
    );
    const emptyFragment = {
      children: [],
      instances: [],
      props: [],
      assets: [],
      dataSources: [],
      resources: [],
      breakpoints: [],
      styleSources: [],
      styleSourceSelections: [],
      styles: [],
    };
    const bodyFragment = {
      ...emptyFragment,
      children: [{ type: "id" as const, value: "body" }],
      instances: [
        {
          type: "instance" as const,
          id: "body",
          component: "Body",
          children: [{ type: "id" as const, value: "block" }],
        },
        {
          type: "instance" as const,
          id: "block",
          component: blockComponent,
          children: [
            { type: "id" as const, value: "templates" },
            { type: "id" as const, value: "authored" },
          ],
        },
        {
          type: "instance" as const,
          id: "templates",
          component: blockTemplateComponent,
          children: [],
        },
        {
          type: "instance" as const,
          id: "authored",
          component: "Paragraph",
          children: [{ type: "text" as const, value: "Loaded" }],
        },
      ],
      props: [
        {
          id: "source",
          instanceId: "block",
          name: "src",
          type: "asset" as const,
          value: sourceAsset.id,
        },
      ],
      assets: [sourceAsset, socialImage],
    };
    const page = {
      type: "page" as const,
      page: {
        id: "page",
        name: "Page",
        path: "/page",
        title: "Page",
        rootInstanceId: "body",
        meta: { socialImageAssetId: socialImage.id },
      },
      rootFragment: emptyFragment,
      bodyFragment,
    };
    const template = {
      type: "template" as const,
      template: {
        id: "template",
        name: "Template",
        title: "Template",
        rootInstanceId: "body",
        meta: { socialImageAssetId: socialImage.id },
      },
      rootFragment: emptyFragment,
      bodyFragment,
    };
    const item: PageTransferItem =
      type === "page"
        ? page
        : type === "template"
          ? template
          : {
              type: "folder",
              folder: {
                id: "folder",
                name: "Folder",
                slug: "folder",
                children: ["page"],
              },
              children: [page],
            };
    const includeDependencies = vi.fn(async ({ fragment }) => ({
      fragment:
        fragment.assets.length === 0
          ? fragment
          : { ...fragment, assets: [...fragment.assets, dependency] },
      skippedAssetIds: [],
    }));

    const prepared = await preparePageTransferItem({
      item,
      projectId: "source-project",
      assets: $assets.get(),
      assetFolders: new Map(),
      includeDependencies,
    });
    const preparedItem =
      prepared.type === "folder" ? prepared.children[0] : prepared;
    if (preparedItem === undefined || preparedItem.type === "folder") {
      throw new Error("Expected a prepared page-like item");
    }

    expect(preparedItem.bodyFragment.assets).toEqual([
      sourceAsset,
      socialImage,
      dependency,
    ]);
    expect(preparedItem.bodyFragment.instances).not.toContainEqual(
      expect.objectContaining({ id: "authored" })
    );
  }
);

test("renews an expired same-origin grant before pasting an unchanged assetless page", async () => {
  resetBuildStores();
  $project.set({ id: "destination" } as Project);
  const pages = createDefaultPages({
    homePageId: "target-home",
    rootInstanceId: "body",
  });
  $pages.set(pages);
  $instances.set(
    new Map([
      [
        "body",
        { id: "body", type: "instance", component: "Body", children: [] },
      ],
    ])
  );
  const copied = JSON.parse((await copyPageData("target-home")) ?? "");
  const item = copied["@webstudio/page/v0.1"];
  item.page.id = "source-home";
  item.sourceProjectId = "source";
  item.sourceGrant = "expired-grant";
  item.sourceRevision = { buildId: "source-build", version: 4 };
  const order: string[] = [];
  const request: typeof fetch = async (url, init) => {
    const parsed = new URL(String(url));
    switch (parsed.pathname) {
      case "/rest/page-copy/grant":
        const renewal = JSON.parse(String(init?.body));
        expect(renewal).not.toHaveProperty("assetIds");
        expect(renewal).toMatchObject({
          projectId: "source",
          pageId: "source-home",
          renewGrant: "expired-grant",
        });
        order.push("renew");
        return Response.json({ grant: "fresh-grant", ...item.sourceRevision });
      case "/rest/page-copy/content": {
        const { grant } = JSON.parse(String(init?.body));
        if (grant === "expired-grant") {
          order.push("expired");
          return new Response(null, { status: 403 });
        }
        expect(grant).toBe("fresh-grant");
        return Response.json({
          source: {
            projectId: "source",
            pageId: "source-home",
            ...item.sourceRevision,
          },
          storageScope: "shared",
          assets: [],
          folders: [],
        });
      }
      case "/rest/page-copy/destination":
        return Response.json({
          buildId: "target-build",
          version: 7,
          storageScope: "shared",
          contractVersion: "copy",
        });
      case "/rest/assets":
        return Response.json({ assets: [] });
      case "/rest/assets/folders":
        return Response.json({ folders: [] });
      default:
        throw new Error(`Unexpected copy request: ${parsed.pathname}`);
    }
  };
  draftPersistence.reset("destination");
  const unsubscribe = serverSyncStore.subscribe((id, payload) => {
    if (payload.some(({ namespace }) => namespace === "pages")) {
      order.push("commit");
      reportTransactionCompletion(id, true);
    }
  });
  try {
    await expect(
      handlePastePage(JSON.stringify(copied), ROOT_FOLDER_ID, (input) =>
        transferBuilderPage({ ...input, request, readSourceRequest: request })
      )
    ).resolves.toEqual(pasteHandled);
    expect(order).toEqual(["expired", "renew", "commit"]);
    expect($pages.get()?.pages.size).toBe(2);
  } finally {
    unsubscribe();
    draftPersistence.reset();
  }
});

test("an immediate copy waits for the source edit to save before authorizing a cross-project paste", async () => {
  resetBuildStores();
  $project.set({ id: "source" } as Project);
  const sourcePages = createDefaultPages({
    homePageId: "source-home",
    rootInstanceId: "source-body",
  });
  $pages.set(sourcePages);
  $instances.set(
    new Map([
      [
        "source-body",
        {
          id: "source-body",
          type: "instance",
          component: "Body",
          children: [],
        },
      ],
    ])
  );
  let persistedVersion = 3;
  const order: string[] = [];
  const sourceRequest: typeof fetch = async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path === "/rest/page-copy/grant" && init?.method !== "POST") {
      order.push("read-source");
      return Response.json({
        buildId: "source-build",
        version: persistedVersion,
        contractVersion: "copy",
        storageScope: "source-scope",
      });
    }
    if (path === "/rest/page-copy/grant") {
      order.push("grant");
      expect(JSON.parse(String(init?.body))).toMatchObject({
        expectedRevision: { buildId: "source-build", version: 4 },
      });
      return Response.json({
        grant: "saved-grant",
        buildId: "source-build",
        version: persistedVersion,
      });
    }
    if (path === "/rest/page-copy/content") {
      expect(JSON.parse(String(init?.body)).grant).toBe("saved-grant");
      return Response.json({
        source: {
          projectId: "source",
          pageId: "source-home",
          buildId: "source-build",
          version: persistedVersion,
        },
        storageScope: "source-scope",
        assets: [],
        folders: [],
      });
    }
    throw new Error(`Unexpected source request: ${path}`);
  };
  draftPersistence.reset("source");
  draftPersistence.begin("source", "pending-edit");
  const copying = copyPageData("source-home", sourceRequest);
  await Promise.resolve();
  expect(order).toEqual([]);
  sourcePages.pages.set("source-home", {
    ...sourcePages.pages.get("source-home")!,
    name: "Saved name",
  });
  persistedVersion = 4;
  draftPersistence.complete("source", "pending-edit", true);

  const clipboard = JSON.parse((await copying) ?? "");
  expect(order).toEqual(["read-source", "grant"]);
  expect(clipboard["@webstudio/page/v0.1"]).toMatchObject({
    page: { name: "Saved name" },
    sourceRevision: { buildId: "source-build", version: 4 },
  });
  clipboard["@webstudio/page/v0.1"].sourceOrigin = "https://source.example";
  resetBuildStores();
  $project.set({ id: "destination" } as Project);
  $pages.set(
    createDefaultPages({
      homePageId: "destination-home",
      rootInstanceId: "destination-body",
    })
  );
  $instances.set(
    new Map([
      [
        "destination-body",
        {
          id: "destination-body",
          type: "instance",
          component: "Body",
          children: [],
        },
      ],
    ])
  );
  draftPersistence.reset("destination");
  const destinationRequest: typeof fetch = async (url) => {
    const path = new URL(String(url)).pathname;
    if (path === "/rest/page-copy/destination") {
      return Response.json({
        buildId: "destination-build",
        version: 8,
        contractVersion: "copy",
        storageScope: "destination-scope",
      });
    }
    if (path === "/rest/assets") {
      return Response.json({ assets: [] });
    }
    if (path === "/rest/assets/folders") {
      return Response.json({ folders: [] });
    }
    throw new Error(`Unexpected destination request: ${path}`);
  };
  const unsubscribe = serverSyncStore.subscribe((id, changes) => {
    if (changes.some(({ namespace }) => namespace === "pages")) {
      reportTransactionCompletion(id, true);
    }
  });
  try {
    await expect(
      handlePastePage(JSON.stringify(clipboard), ROOT_FOLDER_ID, (input) =>
        transferBuilderPage({
          ...input,
          request: destinationRequest,
          readSourceRequest: sourceRequest,
        })
      )
    ).resolves.toEqual(pasteHandled);
    expect([...$pages.get()!.pages.values()]).toContainEqual(
      expect.objectContaining({ name: "Saved name" })
    );
  } finally {
    unsubscribe();
    draftPersistence.reset();
  }
});
