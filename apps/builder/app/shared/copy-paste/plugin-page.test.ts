import { afterEach, expect, test, vi } from "vitest";
import { enableMapSet } from "immer";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { PageTransferItem } from "@webstudio-is/project-build/transfer";
import {
  blockComponent,
  blockTemplateComponent,
  encodeDataSourceVariable,
  ROOT_FOLDER_ID,
  ROOT_INSTANCE_ID,
  type Asset,
  type DataSource,
  type Instance,
} from "@webstudio-is/sdk";
import type { Project } from "@webstudio-is/project";
import { registerContainers } from "../sync/sync-stores";
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
import { initBuilderApiWindow } from "../builder-api";

enableMapSet();
registerContainers();
initBuilderApiWindow();
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

test("transfers assets copied from another deployment before inserting the page", async () => {
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
    projectId: "target-project",
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
  const importAssets = vi
    .spyOn(window.__webstudio__$__builderApi, "importAssets")
    .mockImplementation(async (projectId, sources) => {
      expect(projectId).toBe("target-project");
      expect(sources).toEqual([
        {
          asset: sourceAsset,
          url: "https://source.example.com/cgi/image/hero.png?format=raw",
        },
      ]);
      $assets.set(new Map([[importedAsset.id, importedAsset]]));
      return new Map([[sourceAsset.id, importedAsset]]);
    });

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
  ).toEqual(pasteHandled);
  const pastedPage = Array.from($pages.get()?.pages.values() ?? []).find(
    (page) => page.id !== "target-page"
  );
  expect(pastedPage?.meta.socialImageAssetId).toBe(importedAsset.id);
  expect(pastedPage?.marketplace?.thumbnailAssetId).toBe(importedAsset.id);
  expect(importAssets).toHaveBeenCalledOnce();
  expect($assets.get().has(sourceAsset.id)).toBe(false);
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
  const importAssets = vi.spyOn(
    window.__webstudio__$__builderApi,
    "importAssets"
  );

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
      .spyOn(window.__webstudio__$__builderApi, "showRootStyleConflictDialog")
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
    window.__webstudio__$__builderApi,
    "showRootStyleConflictDialog"
  ).mockResolvedValue("cancel");
  const importAssets = vi.spyOn(
    window.__webstudio__$__builderApi,
    "importAssets"
  );

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
  vi.spyOn(
    window.__webstudio__$__builderApi,
    "showTokenConflictDialog"
  ).mockImplementation(async () => {
    updateRootLocalStyle("blue");
    return "ours";
  });
  const rootConflictDialog = vi
    .spyOn(window.__webstudio__$__builderApi, "showRootStyleConflictDialog")
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
    .spyOn(window.__webstudio__$__builderApi, "showRootStyleConflictDialog")
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
    .spyOn(window.__webstudio__$__builderApi, "showRootStyleConflictDialog")
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
    $assets.set(
      new Map([
        [sourceAsset.id, sourceAsset],
        [dependency.id, dependency],
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
      assets: [sourceAsset],
    };
    const page = {
      type: "page" as const,
      page: {
        id: "page",
        name: "Page",
        path: "/page",
        title: "Page",
        rootInstanceId: "body",
        meta: {},
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
        meta: {},
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

    expect(preparedItem.bodyFragment.assets).toEqual([sourceAsset, dependency]);
    expect(preparedItem.bodyFragment.instances).not.toContainEqual(
      expect.objectContaining({ id: "authored" })
    );
  }
);
