import { describe, expect, test } from "vitest";
import { setEnv } from "@webstudio-is/feature-flags";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { Project } from "@webstudio-is/project";
import {
  encodeDataVariableId,
  isRootFolder,
  type Folder,
  ROOT_INSTANCE_ID,
  type DataSource,
  type Page,
  SYSTEM_VARIABLE_ID,
  type Resource,
} from "@webstudio-is/sdk";
import {
  $pageRootScope,
  duplicateFolder,
  duplicateTemplate,
  getPageDisplayName,
  instantiateTemplate,
  isFolder,
} from "./page-utils";
import { $dataSourceVariables } from "~/shared/nano-states";
import {
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $project,
  $props,
  $resources,
  $styles,
  $styleSources,
  $styleSourceSelections,
} from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import { $selectedPageId } from "~/shared/nano-states";
import { updateCurrentSystem } from "~/shared/system";
import { $resourcesCache, getResourceKey } from "~/shared/resources";

setEnv("*");
registerContainers();

test("prefixes draft page display names without changing the stored name", () => {
  const page = {
    id: "page",
    name: "Pricing",
    path: "/pricing",
    title: `"Pricing"`,
    rootInstanceId: "root",
    meta: {},
    isDraft: true,
  } satisfies Page;

  expect(getPageDisplayName(page)).toBe("[Draft] Pricing");
  expect(page.name).toBe("Pricing");
  expect(getPageDisplayName({ ...page, isDraft: false })).toBe("Pricing");
});

const initialSystem = {
  origin: "https://undefined.wstd.work",
  params: {},
  pathname: "/",
  search: {},
};

const createPages = () => {
  const data = createDefaultPages({
    rootInstanceId: "rootInstanceId",
    homePageId: "homePageId",
  });

  const { pages, folders } = data;

  function f(id: string, children?: Array<Page | Folder>): Folder;
  function f(id: string, slug: string, children?: Array<Page | Folder>): Folder;
  // eslint-disable-next-line func-style
  function f(id: string, slug?: unknown, children?: unknown) {
    if (Array.isArray(slug)) {
      children = slug;
      slug = id;
    }
    const folder = {
      id,
      name: id,
      slug: slug ?? id,
      children: register((children as Array<Page | Folder>) ?? [], false),
    };

    return folder;
  }

  const p = (id: string, path: string): Page => {
    const page = {
      id,
      meta: {},
      name: id,
      path,
      rootInstanceId: "rootInstanceId",
      title: `"${id}"`,
    };
    return page;
  };

  const register = (children: Array<Page | Folder>, root: boolean = true) => {
    const childIds = [];
    const rootFolder = Array.from(folders.values()).find(isRootFolder);

    for (const child of children) {
      childIds.push(child.id);
      if ("meta" in child) {
        pages.set(child.id, child);
        continue;
      }
      folders.set(child.id, child);

      if (root) {
        rootFolder?.children.push(child.id);
      }
    }

    return childIds;
  };

  return { f, p, register, pages: data };
};

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map((item) => [item.id, item]));

test("page root scope should rely on selected page", () => {
  const pages = createDefaultPages({
    rootInstanceId: "homeRootId",
    homePageId: "homePageId",
  });
  pages.pages.set("pageId", {
    id: "pageId",
    rootInstanceId: "pageRootId",
    name: "My Name",
    path: "/",
    title: `"My Title"`,
    meta: {},
  });
  $pages.set(pages);
  $selectedPageId.set("pageId");
  $dataSources.set(
    toMap([
      {
        id: "1",
        scopeInstanceId: "homeRootId",
        name: "home variable",
        type: "variable",
        value: { type: "string", value: "" },
      },
      {
        id: "2",
        scopeInstanceId: "pageRootId",
        name: "page variable",
        type: "variable",
        value: { type: "string", value: "" },
      },
    ])
  );
  expect($pageRootScope.get()).toEqual({
    aliases: new Map([
      ["$ws$system", "system"],
      ["$ws$dataSource$2", "page variable"],
    ]),
    scope: {
      $ws$system: initialSystem,
      $ws$dataSource$2: "",
    },
    variableValues: new Map<string, unknown>([
      [SYSTEM_VARIABLE_ID, initialSystem],
      ["2", ""],
    ]),
  });
});

test("page root scope should use variable and resource values", () => {
  $pages.set(
    createDefaultPages({
      rootInstanceId: "homeRootId",
      homePageId: "homePageId",
    })
  );
  $selectedPageId.set("homePageId");
  $dataSources.set(
    toMap([
      {
        id: "valueVariableId",
        scopeInstanceId: "homeRootId",
        name: "value variable",
        type: "variable",
        value: { type: "string", value: "" },
      },
      {
        id: "resourceVariableId",
        scopeInstanceId: "homeRootId",
        name: "resource variable",
        type: "resource",
        resourceId: "resourceId",
      },
    ])
  );
  $dataSourceVariables.set(
    new Map([["valueVariableId", "value variable value"]])
  );
  const resourceKey = getResourceKey({
    name: "my-resource",
    url: "",
    searchParams: [],
    method: "get",
    headers: [],
  });
  $resources.set(
    toMap<Resource>([
      {
        id: "resourceId",
        name: "my-resource",
        url: `""`,
        method: "get",
        headers: [],
      },
    ])
  );
  $resourcesCache.set(new Map([[resourceKey, "resource variable value"]]));
  expect($pageRootScope.get()).toEqual({
    aliases: new Map([
      ["$ws$system", "system"],
      ["$ws$dataSource$valueVariableId", "value variable"],
      ["$ws$dataSource$resourceVariableId", "resource variable"],
    ]),
    scope: {
      $ws$system: initialSystem,
      $ws$dataSource$resourceVariableId: "resource variable value",
      $ws$dataSource$valueVariableId: "value variable value",
    },
    variableValues: new Map<string, unknown>([
      [SYSTEM_VARIABLE_ID, initialSystem],
      ["valueVariableId", "value variable value"],
      ["resourceVariableId", "resource variable value"],
    ]),
  });
});

test("page root scope should provide page system variable value", () => {
  $pages.set(
    createDefaultPages({
      rootInstanceId: "homeRootId",
      homePageId: "homePageId",
      systemDataSourceId: "systemId",
    })
  );
  $selectedPageId.set("homePageId");
  $dataSources.set(
    toMap([
      {
        id: "systemId",
        scopeInstanceId: "homeRootId",
        name: "system",
        type: "parameter",
      },
    ])
  );
  expect($pageRootScope.get()).toEqual({
    aliases: new Map([["$ws$dataSource$systemId", "system"]]),
    scope: {
      $ws$dataSource$systemId: {
        origin: "https://undefined.wstd.work",
        params: {},
        pathname: "/",
        search: {},
      },
    },
    variableValues: new Map([
      [
        "systemId",
        {
          params: {},
          pathname: "/",
          search: {},
          origin: "https://undefined.wstd.work",
        },
      ],
    ]),
  });
  updateCurrentSystem({
    params: { slug: "my-post" },
  });
  expect($pageRootScope.get()).toEqual({
    aliases: new Map([["$ws$dataSource$systemId", "system"]]),
    scope: {
      $ws$dataSource$systemId: {
        params: { slug: "my-post" },
        pathname: "/",
        search: {},
        origin: "https://undefined.wstd.work",
      },
    },
    variableValues: new Map([
      [
        "systemId",
        {
          params: { slug: "my-post" },
          pathname: "/",
          search: {},
          origin: "https://undefined.wstd.work",
        },
      ],
    ]),
  });
});

describe("isFolder", () => {
  test("should return true for existing folder id", async () => {
    const { pages: pagesData, register, f } = createPages();
    register([f("folder1", [])]);
    expect(isFolder("folder1", pagesData.folders)).toBe(true);
  });

  test("should return false for non-existing folder id", async () => {
    const { pages: pagesData } = createPages();
    expect(isFolder("nonexistent", pagesData.folders)).toBe(false);
  });

  test("should return false for page id", async () => {
    const { pages: pagesData, register, p } = createPages();
    register([p("page1", "/page1")]);
    expect(isFolder("page1", pagesData.folders)).toBe(false);
  });
});

describe("duplicateFolder", () => {
  $project.set({ id: "projectId" } as Project);

  test("should duplicate a folder with deduplicated name", async () => {
    const { pages: pagesData, register, f } = createPages();
    register([f("folder1", [])]);

    $pages.set(pagesData);
    updateCurrentSystem(initialSystem);
    const newFolderId = duplicateFolder("folder1");

    expect(newFolderId).toBeDefined();
    const updatedPages = $pages.get()!;
    const newFolder =
      newFolderId === undefined
        ? undefined
        : updatedPages.folders.get(newFolderId);
    expect(newFolder).toBeDefined();
    expect(newFolder?.name).toBe("folder1 (1)");
    expect(newFolder?.slug).toBe("folder1-1");
  });

  test("should duplicate a folder with pages", async () => {
    const { pages: pagesData, register, f, p } = createPages();
    register([f("folder1", [p("page1", "/page1"), p("page2", "/page2")])]);

    $pages.set(pagesData);
    updateCurrentSystem(initialSystem);
    const newFolderId = duplicateFolder("folder1");

    expect(newFolderId).toBeDefined();
    const updatedPages = $pages.get()!;
    const newFolder =
      newFolderId === undefined
        ? undefined
        : updatedPages.folders.get(newFolderId);
    expect(newFolder).toBeDefined();
    // Note: Page duplication is handled by runtime insertPageCopyMutable
    // which requires full WebstudioData setup. Here we just verify the folder structure.
    expect(newFolder?.children.length).toBeGreaterThan(0);
  });

  test("should duplicate a folder with nested folders", async () => {
    const { pages: pagesData, register, f, p } = createPages();
    register([
      f("folder1", [
        f("subfolder1", [p("page1", "/page1")]),
        p("page2", "/page2"),
      ]),
    ]);

    $pages.set(pagesData);
    updateCurrentSystem(initialSystem);
    const newFolderId = duplicateFolder("folder1");

    expect(newFolderId).toBeDefined();
    const updatedPages = $pages.get()!;
    const newFolder =
      newFolderId === undefined
        ? undefined
        : updatedPages.folders.get(newFolderId);
    expect(newFolder).toBeDefined();
    expect(newFolder?.children.length).toBeGreaterThan(0);

    // Check that subfolder was duplicated
    const subFolderChild = newFolder?.children.find((childId) =>
      updatedPages.folders.has(childId)
    );
    expect(subFolderChild).toBeDefined();
    const subFolder =
      subFolderChild === undefined
        ? undefined
        : updatedPages.folders.get(subFolderChild);
    expect(subFolder).toBeDefined();
    expect(subFolder?.name).toBe("subfolder1 (1)");
  });

  test("should deduplicate folder names correctly with existing copies", async () => {
    const { pages: pagesData, register, f } = createPages();
    register([f("folder1", "folder1", []), f("folder1 (1)", "folder1-1", [])]);

    $pages.set(pagesData);
    updateCurrentSystem(initialSystem);
    const newFolderId = duplicateFolder("folder1");

    expect(newFolderId).toBeDefined();
    const updatedPages = $pages.get()!;
    const newFolder =
      newFolderId === undefined
        ? undefined
        : updatedPages.folders.get(newFolderId);
    expect(newFolder?.name).toBe("folder1 (2)");
    expect(newFolder?.slug).toBe("folder1-2");
  });

  test("should preserve empty folder slugs when duplicating", async () => {
    const { pages: pagesData, register, f } = createPages();
    register([f("folder1", "", []), f("folder2", "", [])]);

    $pages.set(pagesData);
    updateCurrentSystem(initialSystem);
    const newFolderId = duplicateFolder("folder1");

    expect(newFolderId).toBeDefined();
    const updatedPages = $pages.get()!;
    const newFolder =
      newFolderId === undefined
        ? undefined
        : updatedPages.folders.get(newFolderId);
    expect(newFolder?.name).toBe("folder1 (1)");
    expect(newFolder?.slug).toBe("");
  });

  test("should register duplicated folder in parent folder", async () => {
    const { pages: pagesData, register, f } = createPages();
    register([f("folder1", [])]);

    $pages.set(pagesData);
    updateCurrentSystem(initialSystem);
    const newFolderId = duplicateFolder("folder1");

    const updatedPages = $pages.get()!;
    const rootFolder = Array.from(updatedPages.folders.values()).find(
      isRootFolder
    );
    expect(rootFolder?.children).toContain(newFolderId);
  });
});

describe("duplicateTemplate", () => {
  $project.set({ id: "projectId" } as Project);

  test("remaps copied data source ids in title and metadata", async () => {
    const { pages: pagesData } = createPages();
    const variableId = "templateVariableId";
    const variableIdentifier = encodeDataVariableId(variableId);

    pagesData.pageTemplates = new Map([
      [
        "templateId",
        {
          id: "templateId",
          name: "Template",
          title: `"Title: " + ${variableIdentifier}`,
          rootInstanceId: "templateRootId",
          meta: {
            description: `"Description: " + ${variableIdentifier}`,
            custom: [
              {
                property: "Property",
                content: `"Value: " + ${variableIdentifier}`,
              },
            ],
          },
        },
      ],
    ]);

    const dataSource: DataSource = {
      type: "variable",
      id: variableId,
      name: "templateVariable",
      scopeInstanceId: "templateRootId",
      value: { type: "string", value: "" },
    };

    $pages.set(pagesData);
    $instances.set(
      new Map([
        [
          ROOT_INSTANCE_ID,
          {
            type: "instance",
            id: ROOT_INSTANCE_ID,
            component: "Body",
            children: [{ type: "id", value: "rootBoxId" }],
          },
        ],
        [
          "rootBoxId",
          {
            type: "instance",
            id: "rootBoxId",
            component: "Box",
            children: [],
          },
        ],
        [
          "templateRootId",
          {
            type: "instance",
            id: "templateRootId",
            component: "Body",
            children: [],
          },
        ],
      ])
    );
    $props.set(new Map());
    $dataSources.set(new Map([[dataSource.id, dataSource]]));
    $resources.set(new Map());
    $breakpoints.set(new Map());
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $styles.set(new Map());
    $assets.set(new Map());
    const newTemplateId = duplicateTemplate("templateId");

    expect(newTemplateId).toBeDefined();
    expect($instances.get().size).toEqual(4);
    const newTemplate = $pages.get()?.pageTemplates?.get(newTemplateId ?? "");
    const newVariable = Array.from($dataSources.get().values()).find(
      (item) => item.name === "templateVariable" && item.id !== variableId
    );
    expect(newVariable).toBeDefined();
    const newVariableIdentifier = encodeDataVariableId(newVariable?.id ?? "");
    expect(newTemplate).toEqual({
      id: newTemplateId,
      name: "Template (1)",
      title: `"Title: " + ${newVariableIdentifier}`,
      rootInstanceId: expect.not.stringMatching("templateRootId"),
      meta: {
        description: `"Description: " + ${newVariableIdentifier}`,
        custom: [
          {
            property: "Property",
            content: `"Value: " + ${newVariableIdentifier}`,
          },
        ],
      },
    });
  });
});

describe("instantiateTemplate", () => {
  $project.set({ id: "projectId" } as Project);

  test("creates page from template through the runtime operation", () => {
    const { pages: pagesData } = createPages();
    pagesData.pageTemplates = new Map([
      [
        "templateId",
        {
          id: "templateId",
          name: "Template",
          title: `"Template title"`,
          rootInstanceId: "templateRootId",
          meta: {},
        },
      ],
    ]);

    $pages.set(pagesData);
    $instances.set(
      new Map([
        [
          "rootInstanceId",
          {
            type: "instance",
            id: "rootInstanceId",
            component: "Body",
            children: [],
          },
        ],
        [
          "templateRootId",
          {
            type: "instance",
            id: "templateRootId",
            component: "Body",
            children: [],
          },
        ],
      ])
    );
    $props.set(new Map());
    $dataSources.set(new Map());
    $resources.set(new Map());
    $breakpoints.set(new Map());
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $styles.set(new Map());
    $assets.set(new Map());

    const pageId = instantiateTemplate({
      templateId: "templateId",
      overrides: { name: "New page", path: "/new-page" },
      folderId: pagesData.rootFolderId,
    });

    const page = $pages.get()?.pages.get(pageId ?? "");
    expect(page).toEqual({
      id: pageId,
      name: "New page",
      path: "/new-page",
      title: `"Template title"`,
      rootInstanceId: expect.not.stringMatching("templateRootId"),
      meta: {},
    });
  });

  test("uses content-safe copy when creating page from template in content mode", () => {
    const { pages: pagesData } = createPages();
    pagesData.pageTemplates = new Map([
      [
        "templateId",
        {
          id: "templateId",
          name: "Template",
          title: `"Template title"`,
          rootInstanceId: "templateRootId",
          meta: {
            description: `"Description"`,
            excludePageFromSearch: "false",
            language: `"en-US"`,
            socialImageAssetId: "assetId",
            socialImageUrl: `"https://example.com/image.png"`,
            custom: [{ property: "og:type", content: `"website"` }],
            auth: { method: "basic", login: "user", password: "password" },
            content: `"text"`,
            documentType: "text",
            redirect: `"/redirect"`,
            status: "404",
          },
        },
      ],
    ]);

    $pages.set(pagesData);
    $instances.set(
      new Map([
        [
          "rootInstanceId",
          {
            type: "instance",
            id: "rootInstanceId",
            component: "Body",
            children: [],
          },
        ],
        [
          "templateRootId",
          {
            type: "instance",
            id: "templateRootId",
            component: "Body",
            children: [],
          },
        ],
      ])
    );
    $props.set(new Map());
    $dataSources.set(new Map());
    $resources.set(new Map());
    $breakpoints.set(new Map());
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $styles.set(new Map());
    $assets.set(new Map());

    const pageId = instantiateTemplate({
      templateId: "templateId",
      overrides: { name: "New page", path: "/new-page" },
      folderId: pagesData.rootFolderId,
      contentMode: true,
    });

    const page = $pages.get()?.pages.get(pageId ?? "");
    expect(page).toEqual({
      id: pageId,
      name: "New page",
      path: "/new-page",
      title: `"Template title"`,
      rootInstanceId: expect.not.stringMatching("templateRootId"),
      meta: {
        description: `"Description"`,
        excludePageFromSearch: "false",
        language: `"en-US"`,
        socialImageAssetId: "assetId",
        socialImageUrl: `"https://example.com/image.png"`,
        custom: [{ property: "og:type", content: `"website"` }],
      },
    });
  });
});
