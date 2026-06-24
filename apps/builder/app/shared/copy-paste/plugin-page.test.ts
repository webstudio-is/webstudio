import { expect, test } from "vitest";
import { enableMapSet } from "immer";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  encodeDataSourceVariable,
  ROOT_FOLDER_ID,
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
} from "./plugin-page";

enableMapSet();
registerContainers();

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

test("copies the selected page root from the copy plugin", () => {
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

  expect(pageText.onCopy?.()).toContain('"type":"page"');
  expect(pageText.onCopy?.()).toContain('"name":"Selected Page"');
});

test("copies the edited folder from the copy plugin", () => {
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

  expect(pageText.onCopy?.()).toContain('"type":"folder"');
  expect(pageText.onCopy?.()).toContain('"name":"Edited Folder"');
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

  const clipboardData = copyPageData("source-page");
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

  const clipboardData = copyPageData("source-page");
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
  ).resolves.toBe(true);
  expect($pages.get()?.pages.size).toBe(initialPageCount);
});

test("ignores non-page paste data", async () => {
  await expect(handlePastePage("plain text", ROOT_FOLDER_ID)).resolves.toBe(
    false
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

  const clipboardData = copyFolderData("source-folder");
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

  await handlePastePage(clipboardData ?? "", ROOT_FOLDER_ID);

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

  const clipboardData = copyFolderData("source-folder");
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

  const clipboardData = copyTemplateData("template-id");
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

  await handlePastePage(clipboardData ?? "", ROOT_FOLDER_ID);

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
