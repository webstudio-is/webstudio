import { describe, expect, test } from "vitest";
import {
  ROOT_FOLDER_ID,
  ROOT_INSTANCE_ID,
  encodeDataVariableId,
  elementComponent,
  getHomePage,
  type Asset,
  type DataSource,
  type Instance,
  type PageTemplate,
  type Prop,
  type WebstudioData,
} from "@webstudio-is/sdk";
import { migratePages } from "@webstudio-is/project-migrations/pages";
import {
  createDefaultPages,
  createRootFolder,
} from "@webstudio-is/project-build";
import {
  pageCopyTesting,
  pageDuplicateInput,
  createPageTemplate,
  createPageFromTemplate,
  createPageDuplicatePayload,
  createTemplateCopyData,
  deletePageTemplate,
  duplicateFolder,
  duplicatePage,
  duplicatePageTemplate,
  insertPageCopyMutable,
  insertPageFromTemplateMutable,
  insertTemplateCopyFromFragmentsMutable,
  listPageTemplates,
  reorderPageTemplates,
  updatePageTemplate,
} from "./page-copy";
import {
  $,
  expression,
  Parameter,
  renderData,
  Variable,
  ws,
} from "@webstudio-is/template";
import { nanoid } from "nanoid";
import { applyBuilderPatchTransactions } from "../state/patch";

const { deduplicateName, deduplicatePath, joinPath } = pageCopyTesting;

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map((item) => [item.id, item]));

const getCopiedPages = (data: WebstudioData) =>
  Array.from(data.pages.pages.values()).filter(
    (page) => page.id !== data.pages.homePageId
  );

test("validates duplicate page substitutions", () => {
  expect(
    pageDuplicateInput.parse({
      projectId: "projectId",
      pageId: "pageId",
      substitutions: {
        text: { London: "Paris" },
        variables: { city: { type: "string", value: "Paris" } },
      },
    })
  ).toMatchObject({ substitutions: { text: { London: "Paris" } } });
  expect(
    pageDuplicateInput.safeParse({
      projectId: "projectId",
      pageId: "pageId",
      substitutions: {
        variables: { city: { type: "number", value: "not a number" } },
      },
    }).success
  ).toBe(false);
});

const getWebstudioDataStub = (
  data?: Partial<WebstudioData>
): WebstudioData => ({
  pages: createDefaultPages({ rootInstanceId: "" }),
  assets: new Map(),
  dataSources: new Map(),
  resources: new Map(),
  instances: new Map(),
  props: new Map(),
  breakpoints: new Map(),
  styleSourceSelections: new Map(),
  styleSources: new Map(),
  styles: new Map(),
  ...data,
});

const getPagesWithSiblings = () =>
  migratePages({
    meta: {},
    homePage: {
      id: "home",
      name: "Home",
      path: "",
      title: `"Home"`,
      meta: {},
      rootInstanceId: "homeBody",
    },
    pages: [
      {
        id: "about",
        name: "About",
        path: "/about",
        title: `"About"`,
        meta: {},
        rootInstanceId: "aboutBody",
      },
      {
        id: "about-copy",
        name: "About (1)",
        path: "/copy-1/about",
        title: `"About"`,
        meta: {},
        rootInstanceId: "aboutCopyBody",
      },
    ],
    folders: [createRootFolder(["home", "about", "about-copy"])],
  });

describe("page utility helpers", () => {
  test("deduplicates names within the target folder", () => {
    const pages = getPagesWithSiblings();

    expect(deduplicateName(pages, ROOT_FOLDER_ID, "Contact")).toEqual(
      "Contact"
    );
    expect(deduplicateName(pages, ROOT_FOLDER_ID, "About")).toEqual(
      "About (2)"
    );
    expect(deduplicateName(pages, ROOT_FOLDER_ID, "About (1)")).toEqual(
      "About (2)"
    );
  });

  test("deduplicates paths within the target folder", () => {
    const pages = getPagesWithSiblings();

    expect(deduplicatePath(pages, ROOT_FOLDER_ID, "/contact")).toEqual(
      "/contact"
    );
    expect(deduplicatePath(pages, ROOT_FOLDER_ID, "/about")).toEqual(
      "/copy-2/about"
    );
    expect(deduplicatePath(pages, ROOT_FOLDER_ID, "/")).toEqual("/copy-1");
  });

  test("joins path parts without duplicate slashes", () => {
    expect(joinPath("/", "/blog", "/post")).toEqual("/blog/post");
    expect(joinPath("/docs/", "/guide")).toEqual("/docs/guide");
  });
});

describe("insert page copy", () => {
  test("insert home page copy with new path and ids", () => {
    const data = getWebstudioDataStub({
      instances: toMap<Instance>([
        { type: "instance", id: "bodyId", component: "Body", children: [] },
      ]),
      pages: migratePages({
        meta: {},
        homePage: {
          id: "pageId",
          name: "Name",
          path: "",
          title: `"Title"`,
          meta: {},
          rootInstanceId: "bodyId",
        },
        pages: [],
        folders: [createRootFolder(["pageId"])],
      }),
    });
    insertPageCopyMutable({
      source: { data, pageId: "pageId" },
      target: { data, folderId: ROOT_FOLDER_ID },
      projectId: "projectId",
    });
    const copiedPages = getCopiedPages(data);
    expect(copiedPages.length).toEqual(1);
    const newPage = copiedPages[0];
    expect(newPage).toEqual({
      id: expect.not.stringMatching("pageId"),
      name: "Name (1)",
      path: "/copy-1",
      title: `"Title"`,
      meta: {},
      rootInstanceId: expect.not.stringMatching("bodyId"),
    });
    expect(data.instances.size).toEqual(2);
    expect(Array.from(data.instances.values())[1]).toEqual({
      type: "instance",
      id: newPage.rootInstanceId,
      component: "Body",
      children: [],
    });
  });

  test("creates duplicate page patch payload from shared copy semantics", () => {
    const data = getWebstudioDataStub({
      instances: toMap<Instance>([
        { type: "instance", id: "bodyId", component: "Body", children: [] },
      ]),
      pages: migratePages({
        meta: {},
        homePage: {
          id: "pageId",
          name: "Name",
          path: "",
          title: `"Title"`,
          meta: {},
          rootInstanceId: "bodyId",
        },
        pages: [],
        folders: [createRootFolder(["pageId"])],
      }),
    });

    const result = createPageDuplicatePayload({
      build: {
        pages: data.pages,
        instances: Array.from(data.instances.values()),
        props: [],
        dataSources: [],
        resources: [],
        breakpoints: [],
        styleSources: [],
        styleSourceSelections: [],
        styles: [],
      },
      projectId: "projectId",
      pageId: "pageId",
      parentFolderId: ROOT_FOLDER_ID,
      name: "Custom",
      path: "/custom",
    });

    expect(result?.pageId).toEqual(expect.any(String));
    expect(result?.pageId).not.toEqual("pageId");
    const pagesPayload = result?.payload.find(
      (item) => item.namespace === "pages"
    );
    expect(pagesPayload?.patches).toEqual([
      {
        op: "add",
        path: ["pages", result?.pageId],
        value: expect.objectContaining({
          id: result?.pageId,
          name: "Custom",
          path: "/custom",
          title: `"Title"`,
          rootInstanceId: expect.not.stringMatching("bodyId"),
        }),
      },
      {
        op: "add",
        path: ["folders", ROOT_FOLDER_ID, "children", 1],
        value: result?.pageId,
      },
    ]);
    expect(result?.payload).toContainEqual({
      namespace: "instances",
      patches: [
        {
          op: "add",
          path: [expect.not.stringMatching("bodyId")],
          value: expect.objectContaining({ component: "Body" }),
        },
      ],
    });
  });

  test("does not rewrite existing same-project font assets", () => {
    const pages = createDefaultPages({ rootInstanceId: "bodyId" });
    const fontAsset: Asset = {
      id: "font-asset",
      projectId: "projectId",
      name: "TokenFont.woff2",
      type: "font",
      createdAt: "2024-01-01T00:00:00.000Z",
      format: "woff2",
      size: 100,
      meta: { family: "TokenFont", style: "normal", weight: 400 },
    };

    const result = createPageDuplicatePayload({
      build: {
        pages,
        instances: [
          {
            type: "instance",
            id: ROOT_INSTANCE_ID,
            component: elementComponent,
            children: [{ type: "id", value: "bodyId" }],
          },
          {
            type: "instance",
            id: "bodyId",
            component: elementComponent,
            children: [],
          },
        ],
        props: [],
        dataSources: [],
        resources: [],
        breakpoints: [],
        styleSources: [{ type: "token", id: "font-token", name: "Font" }],
        styleSourceSelections: [],
        styles: [
          {
            styleSourceId: "font-token",
            breakpointId: "base",
            property: "fontFamily",
            value: { type: "fontFamily", value: ["TokenFont"] },
          },
        ],
      },
      assets: [fontAsset],
      projectId: "projectId",
      pageId: pages.homePageId,
      parentFolderId: pages.rootFolderId,
      createId: () => "generated-id",
    });

    expect(result).toBeDefined();
    expect(
      result?.payload.find((change) => change.namespace === "assets")
    ).toBeUndefined();
  });

  test("runtime duplicate infers the source page parent folder", () => {
    const data = getWebstudioDataStub({
      instances: toMap<Instance>([
        { type: "instance", id: "bodyId", component: "Body", children: [] },
      ]),
      pages: migratePages({
        meta: {},
        homePage: {
          id: "homePageId",
          name: "Home",
          path: "",
          title: `"Home"`,
          meta: {},
          rootInstanceId: "bodyId",
        },
        pages: [
          {
            id: "pageId",
            name: "Name",
            path: "/nested",
            title: `"Title"`,
            meta: {},
            rootInstanceId: "bodyId",
            isDraft: true,
          },
        ],
        folders: [
          createRootFolder(["homePageId", "folderId"]),
          {
            id: "folderId",
            name: "Folder",
            slug: "folder",
            children: ["pageId"],
          },
        ],
      }),
    });

    const result = duplicatePage(
      data,
      {
        projectId: "projectId",
        pageId: "pageId",
        name: "Copy",
        path: "/copy",
      },
      { createId: nanoid }
    );

    expect(result.result.pageId).toEqual(expect.any(String));
    expect(result.payload).toContainEqual({
      namespace: "pages",
      patches: expect.arrayContaining([
        {
          op: "add",
          path: ["pages", result.result.pageId],
          value: expect.objectContaining({
            id: result.result.pageId,
            name: "Copy",
            path: "/copy",
            isDraft: true,
          }),
        },
        {
          op: "add",
          path: ["folders", "folderId", "children", 1],
          value: result.result.pageId,
        },
      ]),
    });
  });

  test("runtime duplicate atomically substitutes copied page text and variables", () => {
    const data = getWebstudioDataStub({
      instances: toMap<Instance>([
        {
          type: "instance",
          id: ROOT_INSTANCE_ID,
          component: "Slot",
          children: [],
        },
        {
          type: "instance",
          id: "bodyId",
          component: "Body",
          children: [
            { type: "text", value: "Old city" },
            { type: "text", value: "toString" },
          ],
        },
      ]),
      props: toMap<Prop>([
        {
          id: "rootLabelProp",
          instanceId: ROOT_INSTANCE_ID,
          name: "aria-label",
          type: "string",
          value: "Old city",
        },
        {
          id: "labelProp",
          instanceId: "bodyId",
          name: "aria-label",
          type: "string",
          value: "Old city",
        },
      ]),
      dataSources: toMap<DataSource>([
        {
          id: "cityVariable",
          scopeInstanceId: "bodyId",
          name: "city",
          type: "variable",
          value: { type: "string", value: "Old city" },
        },
      ]),
      pages: migratePages({
        meta: {},
        homePage: {
          id: "homePageId",
          name: "Home",
          path: "",
          title: `"Home"`,
          meta: {},
          rootInstanceId: "bodyId",
        },
        pages: [
          {
            id: "pageId",
            name: "City",
            path: "/old-city",
            title: `"Old city"`,
            meta: { description: `"Visit Old city"` },
            rootInstanceId: "bodyId",
          },
        ],
        folders: [createRootFolder(["homePageId", "pageId"])],
      }),
    });
    let nextId = 0;
    const mutation = duplicatePage(
      data,
      {
        projectId: "projectId",
        pageId: "pageId",
        path: "/new-city",
        substitutions: {
          text: {
            "Old city": "New city",
            "Visit Old city": "Visit New city",
          },
          variables: {
            city: { type: "string", value: "New city" },
          },
        },
      },
      { createId: () => `copy-${nextId++}` }
    );
    const updated = applyBuilderPatchTransactions(data, [
      { id: "duplicate-page", payload: mutation.payload },
    ]).state as WebstudioData;
    const copiedPage = updated.pages.pages.get(mutation.result.pageId);
    const copiedRootId = copiedPage?.rootInstanceId;

    expect(copiedPage).toMatchObject({
      path: "/new-city",
      title: `"New city"`,
      meta: { description: `"Visit New city"` },
    });
    expect(updated.instances.get(copiedRootId ?? "")?.children).toEqual([
      { type: "text", value: "New city" },
      { type: "text", value: "toString" },
    ]);
    expect(
      Array.from(updated.props.values()).find(
        (prop) => prop.instanceId === copiedRootId && prop.name === "aria-label"
      )
    ).toMatchObject({ type: "string", value: "New city" });
    expect(
      Array.from(updated.dataSources.values()).find(
        (dataSource) =>
          dataSource.scopeInstanceId === copiedRootId &&
          dataSource.name === "city"
      )
    ).toMatchObject({
      type: "variable",
      value: { type: "string", value: "New city" },
    });
    expect(data.instances.get("bodyId")?.children).toEqual([
      { type: "text", value: "Old city" },
      { type: "text", value: "toString" },
    ]);
    expect(data.dataSources.get("cityVariable")).toMatchObject({
      value: { type: "string", value: "Old city" },
    });
    expect(updated.props.get("rootLabelProp")).toMatchObject({
      value: "Old city",
    });
    expect(() =>
      duplicatePage(
        data,
        {
          projectId: "projectId",
          pageId: "pageId",
          substitutions: {
            variables: {
              missing: { type: "string", value: "No match" },
            },
          },
        },
        { createId: nanoid }
      )
    ).toThrow('Copied variable "missing" was not found');
    expect(data.pages.pages.size).toBe(2);
  });

  test("runtime duplicate rejects explicit path conflicts", () => {
    const data = getWebstudioDataStub({
      instances: toMap<Instance>([
        { type: "instance", id: "bodyId", component: "Body", children: [] },
      ]),
      pages: migratePages({
        meta: {},
        homePage: {
          id: "homePageId",
          name: "Home",
          path: "",
          title: `"Home"`,
          meta: {},
          rootInstanceId: "bodyId",
        },
        pages: [
          {
            id: "pageId",
            name: "Name",
            path: "/nested",
            title: `"Title"`,
            meta: {},
            rootInstanceId: "bodyId",
          },
          {
            id: "conflictId",
            name: "Conflict",
            path: "/copy",
            title: `"Conflict"`,
            meta: {},
            rootInstanceId: "bodyId",
          },
        ],
        folders: [createRootFolder(["homePageId", "pageId", "conflictId"])],
      }),
    });

    expect(() =>
      duplicatePage(
        data,
        {
          projectId: "projectId",
          pageId: "pageId",
          path: "/copy",
        },
        { createId: nanoid }
      )
    ).toThrow('Page path "/copy" is already in use');
  });

  test("runtime folder duplicate infers the source folder parent folder", () => {
    const data = getWebstudioDataStub({
      instances: toMap<Instance>([
        { type: "instance", id: "bodyId", component: "Body", children: [] },
      ]),
      pages: migratePages({
        meta: {},
        homePage: {
          id: "homePageId",
          name: "Home",
          path: "",
          title: `"Home"`,
          meta: {},
          rootInstanceId: "bodyId",
        },
        pages: [
          {
            id: "pageId",
            name: "Page",
            path: "/folder/page",
            title: `"Page"`,
            meta: {},
            rootInstanceId: "bodyId",
          },
        ],
        folders: [
          createRootFolder(["homePageId", "folderId"]),
          {
            id: "folderId",
            name: "Folder",
            slug: "folder",
            children: ["pageId"],
          },
        ],
      }),
    });

    const result = duplicateFolder(
      data,
      {
        projectId: "projectId",
        folderId: "folderId",
      },
      { createId: nanoid }
    );

    expect(result.result.folderId).toEqual(expect.any(String));
    expect(result.payload).toContainEqual({
      namespace: "pages",
      patches: expect.arrayContaining([
        {
          op: "add",
          path: ["folders", result.result.folderId],
          value: expect.objectContaining({
            id: result.result.folderId,
            name: "Folder (1)",
            slug: "folder-1",
          }),
        },
        {
          op: "add",
          path: ["folders", ROOT_FOLDER_ID, "children", 2],
          value: result.result.folderId,
        },
      ]),
    });
  });

  test("runtime folder duplicate rejects unknown folders", () => {
    const data = getWebstudioDataStub();

    expect(() =>
      duplicateFolder(
        data,
        {
          projectId: "projectId",
          folderId: "missing",
        },
        { createId: nanoid }
      )
    ).toThrow("Folder parent folder was not found");
  });

  test("preserves slot content ids when duplicating page", () => {
    const dataWithoutPages = renderData(
      <$.Body ws:id="bodyId">
        <$.Slot ws:id="slotId">
          <$.Fragment ws:id="fragmentId">
            <$.Box ws:id="boxId"></$.Box>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    const data = getWebstudioDataStub({
      ...dataWithoutPages,
      pages: migratePages({
        meta: {},
        homePage: {
          id: "pageId",
          name: "Name",
          path: "",
          title: `"Title"`,
          meta: {},
          rootInstanceId: "bodyId",
        },
        pages: [],
        folders: [createRootFolder(["pageId"])],
      }),
    });

    insertPageCopyMutable({
      source: { data, pageId: "pageId" },
      target: { data, folderId: ROOT_FOLDER_ID },
      projectId: "projectId",
    });

    const copiedPage = getCopiedPages(data)[0];
    expect(copiedPage.rootInstanceId).not.toBe("bodyId");
    const copiedBody = data.instances.get(copiedPage.rootInstanceId);
    const copiedSlotId = copiedBody?.children[0]?.value;
    if (copiedSlotId === undefined) {
      throw Error("Expected copied slot id");
    }
    expect(copiedSlotId).not.toBe("slotId");
    expect(data.instances.get(copiedSlotId)?.children).toEqual([
      { type: "id", value: "fragmentId" },
    ]);
    expect(
      Array.from(data.instances.values()).filter(
        (instance) => instance.id === "fragmentId"
      )
    ).toHaveLength(1);
    expect(data.instances.get("fragmentId")?.children).toEqual([
      { type: "id", value: "boxId" },
    ]);
  });

  test("deduplicate path for non-home page copy", () => {
    const data = getWebstudioDataStub({
      instances: toMap<Instance>([
        { type: "instance", id: "bodyId", component: "Body", children: [] },
      ]),
      pages: migratePages({
        meta: {},
        homePage: {
          id: "homePageId",
          name: "Home",
          path: "",
          title: `"Home"`,
          meta: {},
          rootInstanceId: "bodyId",
        },
        pages: [
          {
            id: "pageId",
            name: "Name",
            path: "/my-path",
            title: `"Title"`,
            meta: {},
            rootInstanceId: "bodyId",
          },
        ],
        folders: [createRootFolder(["homePageId", "pageId"])],
      }),
    });
    insertPageCopyMutable({
      source: { data, pageId: "pageId" },
      target: { data, folderId: ROOT_FOLDER_ID },
      projectId: "projectId",
    });
    const copiedPages = getCopiedPages(data);
    expect(copiedPages.length).toEqual(2);
    const newPage = copiedPages[1];
    expect(newPage.path).toEqual("/copy-1/my-path");
  });

  test("deduplicate wildcards in page copy", () => {
    const data = getWebstudioDataStub({
      instances: toMap<Instance>([
        { type: "instance", id: "bodyId", component: "Body", children: [] },
      ]),
      pages: migratePages({
        meta: {},
        homePage: {
          id: "homePageId",
          name: "Home",
          path: "",
          title: `"Home"`,
          meta: {},
          rootInstanceId: "bodyId",
        },
        pages: [
          {
            id: "page1Id",
            name: "My Name 1",
            // unnamed wildcard
            path: "/my-path/*",
            title: `"My Title"`,
            meta: {},
            rootInstanceId: "bodyId",
          },
          {
            id: "page2Id",
            name: "My Name 2",
            // Named wildcard
            path: "/my-path/name*",
            title: `"My Title"`,
            meta: {},
            rootInstanceId: "bodyId",
          },
        ],
        folders: [createRootFolder(["homePageId", "page1Id", "page2Id"])],
      }),
    });
    insertPageCopyMutable({
      source: { data, pageId: "page1Id" },
      target: { data, folderId: ROOT_FOLDER_ID },
      projectId: "projectId",
    });
    insertPageCopyMutable({
      source: { data, pageId: "page2Id" },
      target: { data, folderId: ROOT_FOLDER_ID },
      projectId: "projectId",
    });
    const copiedPages = getCopiedPages(data);
    expect(copiedPages.length).toEqual(4);
    const newPage1 = copiedPages[2];
    const newPage2 = copiedPages[3];
    expect(newPage1.path).toEqual("/copy-1/my-path/*");
    expect(newPage2.path).toEqual("/copy-1/my-path/name*");
  });

  test("check full page path when duplicate inside a folder", () => {
    const data = getWebstudioDataStub({
      instances: toMap<Instance>([
        { type: "instance", id: "bodyId", component: "Body", children: [] },
      ]),
      pages: migratePages({
        meta: {},
        homePage: {
          id: "homePageId",
          name: "Home",
          path: "",
          title: `"Home"`,
          meta: {},
          rootInstanceId: "bodyId",
        },
        pages: [
          {
            id: "pageId",
            name: "My Name",
            path: "/my-path",
            title: `"My Title"`,
            meta: {},
            rootInstanceId: "bodyId",
          },
        ],
        folders: [
          createRootFolder(["folderId"]),
          {
            id: "folderId",
            name: "Folder",
            slug: "folder",
            children: ["pageId"],
          },
        ],
      }),
    });
    insertPageCopyMutable({
      source: { data, pageId: "pageId" },
      target: { data, folderId: "folderId" },
      projectId: "projectId",
    });
    insertPageCopyMutable({
      source: { data, pageId: "pageId" },
      target: { data, folderId: ROOT_FOLDER_ID },
      projectId: "projectId",
    });
    const copiedPages = getCopiedPages(data);
    expect(copiedPages.length).toEqual(3);
    const nestedPage = copiedPages[1];
    const rootPage = copiedPages[2];
    expect(nestedPage.path).toEqual("/copy-1/my-path");
    expect(rootPage.path).toEqual("/my-path");
  });

  test("deduplicate path when duplicating inside a folder with empty slug", () => {
    const data = getWebstudioDataStub({
      instances: toMap<Instance>([
        { type: "instance", id: "bodyId", component: "Body", children: [] },
      ]),
      pages: migratePages({
        meta: {},
        homePage: {
          id: "homePageId",
          name: "Home",
          path: "",
          title: `"Home"`,
          meta: {},
          rootInstanceId: "bodyId",
        },
        pages: [
          {
            id: "pageId",
            name: "My Name",
            path: "/my-path",
            title: `"My Title"`,
            meta: {},
            rootInstanceId: "bodyId",
          },
        ],
        folders: [
          createRootFolder(["folderId"]),
          {
            id: "folderId",
            name: "Folder",
            slug: "",
            children: ["pageId"],
          },
        ],
      }),
    });
    insertPageCopyMutable({
      source: { data, pageId: "pageId" },
      target: { data, folderId: "folderId" },
      projectId: "projectId",
    });
    const copiedPages = getCopiedPages(data);
    expect(copiedPages.length).toEqual(2);
    const newPage = copiedPages.find((page) => page.id !== "pageId")!;
    expect(newPage).toBeDefined();
    expect(newPage.path).toEqual("/copy-1/my-path");
  });

  test("replace variables in page copy meta", () => {
    const bodyVariable = new Variable("bodyVariable", "");
    const dataWithoutPage = renderData(
      <$.Body ws:id="bodyId" vars={expression`${bodyVariable}`}></$.Body>
    );
    const [variableId] = dataWithoutPage.dataSources.keys();
    const variableIdentifier = encodeDataVariableId(variableId);
    const data = getWebstudioDataStub({
      ...dataWithoutPage,
      pages: migratePages({
        meta: {},
        homePage: {
          id: "pageId",
          rootInstanceId: "bodyId",
          name: "Name",
          path: "",
          title: `"Title: " + ${variableIdentifier}`,
          meta: {
            title: `"Meta title: " + ${variableIdentifier}`,
            description: `"Description: " + ${variableIdentifier}`,
            excludePageFromSearch: `"Exclude: " + ${variableIdentifier}`,
            socialImageUrl: `"Image: " + ${variableIdentifier}`,
            language: `"Language: " + ${variableIdentifier}`,
            status: `"Status: " + ${variableIdentifier}`,
            redirect: `"Redirect: " + ${variableIdentifier}`,
            custom: [
              {
                property: "Property",
                content: `"Value: " + ${variableIdentifier}`,
              },
            ],
          },
        },
        pages: [],
        folders: [createRootFolder(["pageId"])],
      }),
    });
    insertPageCopyMutable({
      source: { data, pageId: "pageId" },
      target: { data, folderId: ROOT_FOLDER_ID },
      projectId: "projectId",
    });
    const copiedPages = getCopiedPages(data);
    expect(copiedPages.length).toEqual(1);
    const newPage = copiedPages[0];
    const [_oldVariableId, newVariableId] = data.dataSources.keys();
    const newVariableIdentifier = encodeDataVariableId(newVariableId);
    expect(newPage).toEqual({
      id: expect.not.stringMatching("pageId"),
      name: "Name (1)",
      path: "/copy-1",
      title: `"Title: " + ${newVariableIdentifier}`,
      meta: {
        title: `"Meta title: " + ${newVariableIdentifier}`,
        description: `"Description: " + ${newVariableIdentifier}`,
        excludePageFromSearch: `"Exclude: " + ${newVariableIdentifier}`,
        socialImageUrl: `"Image: " + ${newVariableIdentifier}`,
        language: `"Language: " + ${newVariableIdentifier}`,
        status: `"Status: " + ${newVariableIdentifier}`,
        redirect: `"Redirect: " + ${newVariableIdentifier}`,
        custom: [
          {
            property: "Property",
            content: `"Value: " + ${newVariableIdentifier}`,
          },
        ],
      },
      rootInstanceId: expect.not.stringMatching("bodyId"),
    });
  });

  test("append number to name only when conflict is found", () => {
    const data = getWebstudioDataStub({
      instances: toMap<Instance>([
        { type: "instance", id: "bodyId", component: "Body", children: [] },
      ]),
      pages: migratePages({
        meta: {},
        homePage: {
          id: "pageId",
          name: "Name",
          path: "",
          title: `"Title"`,
          meta: {},
          rootInstanceId: "bodyId",
        },
        pages: [],
        folders: [
          createRootFolder(["pageId", "folderId"]),
          {
            id: "folderId",
            name: "Folder",
            slug: "folder",
            children: [],
          },
        ],
      }),
    });
    insertPageCopyMutable({
      source: { data, pageId: "pageId" },
      target: { data, folderId: ROOT_FOLDER_ID },
      projectId: "projectId",
    });
    insertPageCopyMutable({
      source: { data, pageId: "pageId" },
      target: { data, folderId: ROOT_FOLDER_ID },
      projectId: "projectId",
    });
    insertPageCopyMutable({
      source: { data, pageId: "pageId" },
      target: { data, folderId: "folderId" },
      projectId: "projectId",
    });
    insertPageCopyMutable({
      source: { data, pageId: "pageId" },
      target: { data, folderId: "folderId" },
      projectId: "projectId",
    });
    const copiedPages = getCopiedPages(data);
    expect(copiedPages.length).toEqual(4);
    // inside folder with conflict
    expect(copiedPages[0].name).toEqual(`Name (1)`);
    expect(copiedPages[1].name).toEqual(`Name (2)`);
    // inside folder without conflict
    expect(copiedPages[2].name).toEqual(`Name`);
    expect(copiedPages[3].name).toEqual(`Name (1)`);
  });

  test("preserve global variables when duplicate page", () => {
    const globalVariable = new Variable("globalVariable", "global value");
    const data = {
      pages: createDefaultPages({
        rootInstanceId: "bodyId",
      }),
      ...renderData(
        <ws.root ws:id={ROOT_INSTANCE_ID} vars={expression`${globalVariable}`}>
          <$.Body ws:id="bodyId">
            <$.Box ws:id="boxId">{expression`${globalVariable}`}</$.Box>
          </$.Body>
        </ws.root>
      ),
    };
    data.instances.delete(ROOT_INSTANCE_ID);
    insertPageCopyMutable({
      source: { data, pageId: data.pages.homePageId },
      target: { data, folderId: ROOT_FOLDER_ID },
      projectId: "projectId",
    });
    expect(data.dataSources.size).toEqual(1);
    const [globalVariableId] = data.dataSources.keys();
    expect(Array.from(data.instances.values())).toEqual([
      expect.objectContaining({ component: "Body", id: "bodyId" }),
      expect.objectContaining({ component: "Box", id: "boxId" }),
      expect.objectContaining({ component: "Body" }),
      expect.objectContaining({ component: "Box" }),
    ]);
    const newBox = Array.from(data.instances.values()).at(-1);
    expect(newBox?.children).toEqual([
      { type: "expression", value: encodeDataVariableId(globalVariableId) },
    ]);
  });

  test("preserve existing global variables by name", () => {
    const globalVariable = new Variable("globalVariable", "global value");
    const sourceData = {
      pages: createDefaultPages({
        rootInstanceId: "bodyId",
      }),
      ...renderData(
        <ws.root ws:id={ROOT_INSTANCE_ID} vars={expression`${globalVariable}`}>
          <$.Body ws:id="bodyId">
            <$.Box ws:id="boxId">{expression`${globalVariable}`}</$.Box>
          </$.Body>
        </ws.root>,
        // generate different ids in source and data projects
        nanoid
      ),
    };
    sourceData.instances.delete(ROOT_INSTANCE_ID);
    const targetData = {
      pages: createDefaultPages({
        rootInstanceId: "anotherBodyId",
      }),
      ...renderData(
        <ws.root ws:id={ROOT_INSTANCE_ID} vars={expression`${globalVariable}`}>
          <$.Body ws:id="anotherBodyId"></$.Body>
        </ws.root>,
        // generate different ids in source and data projects
        nanoid
      ),
    };
    targetData.instances.delete(ROOT_INSTANCE_ID);
    insertPageCopyMutable({
      source: { data: sourceData, pageId: sourceData.pages.homePageId },
      target: { data: targetData, folderId: ROOT_FOLDER_ID },
      projectId: "projectId",
    });
    expect(targetData.dataSources.size).toEqual(1);
    const [globalVariableId] = targetData.dataSources.keys();
    expect(Array.from(targetData.instances.values())).toEqual([
      expect.objectContaining({ component: "Body", id: "anotherBodyId" }),
      expect.objectContaining({ component: "Body" }),
      expect.objectContaining({ component: "Box" }),
    ]);
    const newBox = Array.from(targetData.instances.values()).at(-1);
    expect(newBox?.children).toEqual([
      { type: "expression", value: encodeDataVariableId(globalVariableId) },
    ]);
  });

  test("restore newly added global variable by name", () => {
    const globalVariable = new Variable("globalVariable", "global value");
    const sourceData = {
      pages: createDefaultPages({
        rootInstanceId: "bodyId",
      }),
      ...renderData(
        <ws.root ws:id={ROOT_INSTANCE_ID} vars={expression`${globalVariable}`}>
          <$.Body ws:id="bodyId">
            <$.Box ws:id="boxId">{expression`${globalVariable}`}</$.Box>
          </$.Body>
        </ws.root>,
        // generate different ids in source and data projects
        nanoid
      ),
    };
    sourceData.instances.delete(ROOT_INSTANCE_ID);
    const targetData = {
      pages: createDefaultPages({
        rootInstanceId: "anotherBodyId",
      }),
      // generate different ids in source and data projects
      ...renderData(<$.Body ws:id="anotherBodyId"></$.Body>, nanoid),
    };
    insertPageCopyMutable({
      source: { data: sourceData, pageId: sourceData.pages.homePageId },
      target: { data: targetData, folderId: ROOT_FOLDER_ID },
      projectId: "projectId",
    });
    expect(targetData.dataSources.size).toEqual(1);
    const [globalVariableId] = targetData.dataSources.keys();
    expect(Array.from(targetData.instances.values())).toEqual([
      expect.objectContaining({ component: "Body", id: "anotherBodyId" }),
      expect.objectContaining({ component: "Body" }),
      expect.objectContaining({ component: "Box" }),
    ]);
    const newBox = Array.from(targetData.instances.values()).at(-1);
    expect(newBox?.children).toEqual([
      { type: "expression", value: encodeDataVariableId(globalVariableId) },
    ]);
  });

  test("delete page system in favor of global one", () => {
    const pageSystemVariable = new Parameter("system");
    const dataWithoutPages = renderData(
      <$.Body ws:id="bodyId" vars={expression`${pageSystemVariable}`}>
        <$.Box ws:id="boxId">{expression`${pageSystemVariable}`}</$.Box>
      </$.Body>
    );
    const [pageSystemVariableId] = dataWithoutPages.dataSources.keys();
    const data = {
      pages: createDefaultPages({
        rootInstanceId: "bodyId",
        systemDataSourceId: pageSystemVariableId,
      }),
      ...dataWithoutPages,
    };
    const homePage = getHomePage(data.pages);
    homePage.title = `${encodeDataVariableId(pageSystemVariableId)}`;
    homePage.meta.description = `${encodeDataVariableId(pageSystemVariableId)}`;
    insertPageCopyMutable({
      source: { data, pageId: data.pages.homePageId },
      target: { data, folderId: ROOT_FOLDER_ID },
      projectId: "projectId",
    });
    expect(data.dataSources.size).toEqual(1);
    expect(Array.from(data.instances.values())).toEqual([
      expect.objectContaining({ component: "Body", id: "bodyId" }),
      expect.objectContaining({ component: "Box", id: "boxId" }),
      expect.objectContaining({ component: "Body" }),
      expect.objectContaining({ component: "Box" }),
    ]);
    const newBox = Array.from(data.instances.values()).at(-1);
    expect(newBox?.children).toEqual([
      { type: "expression", value: "$ws$system" },
    ]);
    const copiedPage = getCopiedPages(data)[0];
    expect(copiedPage.title).toEqual(`$ws$system`);
    expect(copiedPage.meta.description).toEqual(`$ws$system`);
  });

  test("insert page from template with transformed metadata", () => {
    const templateVariable = new Variable("templateVariable", "");
    const dataWithoutPages = renderData(
      <$.Body ws:id="templateBodyId" vars={expression`${templateVariable}`}>
        <$.Box ws:id="boxId">{expression`${templateVariable}`}</$.Box>
      </$.Body>
    );
    const [templateVariableId] = dataWithoutPages.dataSources.keys();
    const templateVariableIdentifier = encodeDataVariableId(templateVariableId);
    const data = getWebstudioDataStub({
      ...dataWithoutPages,
      pages: migratePages({
        homePageId: "homePageId",
        rootFolderId: ROOT_FOLDER_ID,
        pages: [
          {
            id: "homePageId",
            name: "Home",
            path: "",
            title: `"Home"`,
            meta: {},
            rootInstanceId: "homeBodyId",
          },
        ],
        pageTemplates: [
          {
            id: "templateId",
            name: "Template",
            title: `"Title: " + ${templateVariableIdentifier}`,
            rootInstanceId: "templateBodyId",
            meta: {
              title: `"Meta title: " + ${templateVariableIdentifier}`,
              description: `"Description: " + ${templateVariableIdentifier}`,
              custom: [
                {
                  property: "Property",
                  content: `"Value: " + ${templateVariableIdentifier}`,
                },
              ],
            },
          },
        ],
        folders: [createRootFolder(["homePageId"])],
      }),
    });

    const pageId = insertPageFromTemplateMutable({
      templateId: "templateId",
      source: { data },
      target: { data, folderId: ROOT_FOLDER_ID },
      overrides: { name: "Template", path: "/template" },
      projectId: "projectId",
    });

    expect(pageId).toBeDefined();
    const newPage = data.pages.pages.get(pageId ?? "");
    const [_oldVariableId, newVariableId] = data.dataSources.keys();
    const newVariableIdentifier = encodeDataVariableId(newVariableId);
    expect(newPage).toEqual({
      id: pageId,
      name: "Template",
      path: "/template",
      title: `"Title: " + ${newVariableIdentifier}`,
      rootInstanceId: expect.not.stringMatching("templateBodyId"),
      meta: {
        title: `"Meta title: " + ${newVariableIdentifier}`,
        description: `"Description: " + ${newVariableIdentifier}`,
        custom: [
          {
            property: "Property",
            content: `"Value: " + ${newVariableIdentifier}`,
          },
        ],
      },
    });
    expect(data.pages.folders.get(ROOT_FOLDER_ID)?.children).toContain(pageId);
  });

  test("lists page templates", () => {
    const pages = migratePages({
      homePage: {
        id: "homePageId",
        name: "Home",
        path: "",
        title: `"Home"`,
        rootInstanceId: "homeBodyId",
        meta: {},
      },
      pages: [],
      folders: [createRootFolder(["homePageId"])],
    });
    pages.pageTemplates = new Map([
      [
        "templateId",
        {
          id: "templateId",
          name: "Template",
          title: `"Template"`,
          rootInstanceId: "templateBodyId",
          meta: { description: `"Description"` },
        },
      ],
    ]);
    const data = getWebstudioDataStub({
      pages,
    });

    expect(listPageTemplates(data)).toEqual({
      templates: [
        {
          id: "templateId",
          name: "Template",
          title: `"Template"`,
          rootInstanceId: "templateBodyId",
          systemDataSourceId: undefined,
          meta: { description: `"Description"` },
        },
      ],
      detail: "compact",
      total: 1,
      returnedCount: 1,
      nextCursor: null,
      filters: {},
    });
  });

  test("creates page templates with runtime-generated ids", () => {
    const data = getWebstudioDataStub();
    const ids = ["templateId", "templateBodyId"];

    const result = createPageTemplate(
      data,
      {
        name: "Template",
        title: `"Template"`,
        meta: { description: `"Description"` },
      },
      { createId: () => ids.shift() ?? "extraId" }
    );

    expect(result.result).toEqual({
      templateId: "templateId",
      rootInstanceId: "templateBodyId",
    });
    const pagesChange = result.payload.find(
      (change) => change.namespace === "pages"
    );
    const templatePatch = pagesChange?.patches.find(
      (patch) => patch.op === "add" && patch.path[0] === "pageTemplates"
    );
    if (
      templatePatch?.op !== "add" ||
      templatePatch.value instanceof Map === false
    ) {
      throw new Error("Expected pageTemplates add patch");
    }
    expect(templatePatch.value.get("templateId")).toEqual(
      expect.objectContaining({
        id: "templateId",
        name: "Template",
        rootInstanceId: "templateBodyId",
      })
    );
    expect(result.payload).toContainEqual({
      namespace: "instances",
      patches: expect.arrayContaining([
        {
          op: "add",
          path: ["templateBodyId"],
          value: expect.objectContaining({
            id: "templateBodyId",
            component: elementComponent,
            tag: "body",
          }),
        },
      ]),
    });
  });

  test("updates page templates through page field validation semantics", () => {
    const pages = createDefaultPages({ rootInstanceId: "homeBodyId" });
    pages.pageTemplates = new Map([
      [
        "templateId",
        {
          id: "templateId",
          name: "Template",
          title: `"Template"`,
          rootInstanceId: "templateBodyId",
          meta: {},
        },
      ],
    ]);
    const data = getWebstudioDataStub({ pages });

    const result = updatePageTemplate(data, {
      templateId: "templateId",
      values: {
        name: "Updated",
        title: `"Updated"`,
        meta: { description: `"Updated description"` },
      },
    });

    expect(result.payload).toContainEqual({
      namespace: "pages",
      patches: expect.arrayContaining([
        {
          op: "add",
          path: ["pageTemplates", "templateId", "meta", "description"],
          value: `"Updated description"`,
        },
        {
          op: "replace",
          path: ["pageTemplates", "templateId", "name"],
          value: "Updated",
        },
        {
          op: "replace",
          path: ["pageTemplates", "templateId", "title"],
          value: `"Updated"`,
        },
      ]),
    });
  });

  test("deletes page templates and cleans up their root subtree", () => {
    const pages = createDefaultPages({ rootInstanceId: "homeBodyId" });
    pages.pageTemplates = new Map([
      [
        "templateId",
        {
          id: "templateId",
          name: "Template",
          title: `"Template"`,
          rootInstanceId: "templateBodyId",
          meta: {},
        },
      ],
    ]);
    const data = getWebstudioDataStub({
      pages,
      instances: toMap<Instance>([
        {
          type: "instance",
          id: "templateBodyId",
          component: "Body",
          children: [],
        },
      ]),
    });

    const result = deletePageTemplate(data, { templateId: "templateId" });

    expect(result.payload).toContainEqual({
      namespace: "pages",
      patches: [{ op: "remove", path: ["pageTemplates", "templateId"] }],
    });
    expect(result.payload).toContainEqual({
      namespace: "instances",
      patches: [{ op: "remove", path: ["templateBodyId"] }],
    });
  });

  test("duplicates page templates through shared copy semantics", () => {
    const pages = createDefaultPages({ rootInstanceId: "homeBodyId" });
    pages.pageTemplates = new Map([
      [
        "templateId",
        {
          id: "templateId",
          name: "Template",
          title: `"Template"`,
          rootInstanceId: "templateBodyId",
          meta: {},
        },
      ],
    ]);
    const data = getWebstudioDataStub({
      pages,
      instances: toMap<Instance>([
        {
          type: "instance",
          id: "templateBodyId",
          component: "Body",
          tag: "body",
          children: [],
        },
      ]),
    });

    const result = duplicatePageTemplate(
      data,
      { projectId: "projectId", templateId: "templateId" },
      { createId: nanoid }
    );

    expect(result.result.templateId).toEqual(expect.any(String));
    expect(result.payload).toContainEqual({
      namespace: "pages",
      patches: expect.arrayContaining([
        {
          op: "add",
          path: ["pageTemplates", result.result.templateId],
          value: expect.objectContaining({
            id: result.result.templateId,
            name: "Template (1)",
          }),
        },
      ]),
    });
  });

  test("reorders page templates", () => {
    const pages = createDefaultPages({ rootInstanceId: "homeBodyId" });
    pages.pageTemplates = new Map(
      ["first", "second", "third"].map((id) => [
        id,
        {
          id,
          name: id,
          title: `"${id}"`,
          rootInstanceId: `${id}BodyId`,
          meta: {},
        },
      ])
    );
    const data = getWebstudioDataStub({ pages });

    const result = reorderPageTemplates(data, {
      sourceTemplateId: "third",
      targetTemplateId: "first",
      position: "before",
    });

    expect(result.payload).toContainEqual({
      namespace: "pages",
      patches: [
        {
          op: "replace",
          path: ["pageTemplates"],
          value: expect.any(Map),
        },
      ],
    });
    const reorderPatch = result.payload
      .find((change) => change.namespace === "pages")
      ?.patches.find((patch) => patch.path[0] === "pageTemplates");
    expect(reorderPatch?.op).toEqual("replace");
    const reordered =
      reorderPatch !== undefined && "value" in reorderPatch
        ? reorderPatch.value
        : undefined;
    expect(Array.from((reordered as Map<string, PageTemplate>).keys())).toEqual(
      ["third", "first", "second"]
    );
  });

  test("creates page from template patch payload from shared copy semantics", () => {
    const pages = migratePages({
      homePage: {
        id: "homePageId",
        name: "Home",
        path: "",
        title: `"Home"`,
        rootInstanceId: "homeBodyId",
        meta: {},
      },
      pages: [],
      folders: [createRootFolder(["homePageId"])],
    });
    pages.pageTemplates = new Map([
      [
        "templateId",
        {
          id: "templateId",
          name: "Template",
          title: `"Template"`,
          rootInstanceId: "templateBodyId",
          meta: {},
        },
      ],
    ]);
    const data = getWebstudioDataStub({
      pages,
      instances: toMap<Instance>([
        {
          type: "instance",
          id: ROOT_INSTANCE_ID,
          component: "Root",
          children: [{ type: "id", value: "templateBodyId" }],
        },
        {
          type: "instance",
          id: "templateBodyId",
          component: "Body",
          tag: "body",
          children: [],
        },
      ]),
    });
    let index = 0;

    const result = createPageFromTemplate(
      data,
      {
        projectId: "projectId",
        templateId: "templateId",
        name: "Landing",
        path: "/landing",
      },
      { createId: () => `id-${index++}` }
    );
    const { pageId } = result.result;

    expect(pageId).toBeDefined();
    expect(result.payload).toContainEqual({
      namespace: "pages",
      patches: expect.arrayContaining([
        expect.objectContaining({
          op: "add",
          path: ["pages", pageId],
          value: expect.objectContaining({
            id: pageId,
            name: "Landing",
            path: "/landing",
          }),
        }),
      ]),
    });
    expect(result.payload).toContainEqual({
      namespace: "instances",
      patches: expect.arrayContaining([expect.objectContaining({ op: "add" })]),
    });
  });

  test("create page from template rejects path conflicts", () => {
    const pages = migratePages({
      homePage: {
        id: "homePageId",
        name: "Home",
        path: "",
        title: `"Home"`,
        rootInstanceId: "homeBodyId",
        meta: {},
      },
      pages: [
        {
          id: "landingId",
          name: "Landing",
          path: "/landing",
          title: `"Landing"`,
          rootInstanceId: "homeBodyId",
          meta: {},
        },
      ],
      folders: [createRootFolder(["homePageId", "landingId"])],
    });
    pages.pageTemplates = new Map([
      [
        "templateId",
        {
          id: "templateId",
          name: "Template",
          title: `"Template"`,
          rootInstanceId: "templateBodyId",
          meta: {},
        },
      ],
    ]);
    const data = getWebstudioDataStub({
      pages,
      instances: toMap<Instance>([
        {
          type: "instance",
          id: ROOT_INSTANCE_ID,
          component: "Root",
          children: [{ type: "id", value: "templateBodyId" }],
        },
        {
          type: "instance",
          id: "templateBodyId",
          component: "Body",
          tag: "body",
          children: [],
        },
      ]),
    });

    expect(() =>
      createPageFromTemplate(
        data,
        {
          projectId: "projectId",
          templateId: "templateId",
          name: "Landing",
          path: "/landing",
        },
        { createId: nanoid }
      )
    ).toThrow('Page path "/landing" is already in use');
  });

  test("insert template copy preserves and remaps system data source", () => {
    const systemDataSource: DataSource = {
      id: "templateSystemId",
      scopeInstanceId: "templateBodyId",
      name: "system",
      type: "parameter",
    };
    const systemIdentifier = encodeDataVariableId(systemDataSource.id);
    const data = getWebstudioDataStub({
      instances: toMap<Instance>([
        {
          type: "instance",
          id: "templateBodyId",
          component: "Body",
          children: [],
        },
      ]),
      dataSources: toMap([systemDataSource]),
      pages: migratePages({
        homePageId: "homePageId",
        rootFolderId: ROOT_FOLDER_ID,
        pages: [
          {
            id: "homePageId",
            name: "Home",
            path: "",
            title: `"Home"`,
            meta: {},
            rootInstanceId: "homeBodyId",
          },
        ],
        pageTemplates: [
          {
            id: "templateId",
            name: "Template",
            title: `"Title: " + ${systemIdentifier}`,
            rootInstanceId: "templateBodyId",
            systemDataSourceId: systemDataSource.id,
            meta: {
              description: `"Description: " + ${systemIdentifier}`,
            },
          },
        ],
        folders: [createRootFolder(["homePageId"])],
      }),
    });
    const template = data.pages.pageTemplates?.get("templateId");
    expect(template).toBeDefined();

    const templateId = insertTemplateCopyFromFragmentsMutable({
      source: createTemplateCopyData({ data, template: template! }),
      target: { data },
      projectId: "projectId",
    });

    const copiedTemplate = data.pages.pageTemplates?.get(templateId ?? "");
    expect(copiedTemplate?.systemDataSourceId).toBeDefined();
    expect(copiedTemplate?.systemDataSourceId).not.toEqual(systemDataSource.id);
    expect(
      data.dataSources.has(copiedTemplate?.systemDataSourceId ?? "")
    ).toEqual(true);
    const copiedSystemIdentifier = encodeDataVariableId(
      copiedTemplate?.systemDataSourceId ?? ""
    );
    expect(copiedTemplate?.title).toEqual(
      `"Title: " + ${copiedSystemIdentifier}`
    );
    expect(copiedTemplate?.meta.description).toEqual(
      `"Description: " + ${copiedSystemIdentifier}`
    );
  });
});
