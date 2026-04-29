import { describe, expect, test } from "vitest";
import type { Project } from "@webstudio-is/project";
import {
  ROOT_FOLDER_ID,
  ROOT_INSTANCE_ID,
  encodeDataVariableId,
  getHomePage,
  type Instance,
  type WebstudioData,
} from "@webstudio-is/sdk";
import { migratePages } from "@webstudio-is/project-migrations/pages";
import {
  createDefaultPages,
  createRootFolder,
} from "@webstudio-is/project-build";
import { $project } from "./sync/data-stores";
import { insertPageCopyMutable } from "./page-utils";
import {
  $,
  expression,
  Parameter,
  renderData,
  Variable,
  ws,
} from "@webstudio-is/template";
import { nanoid } from "nanoid";

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map((item) => [item.id, item]));

const getCopiedPages = (data: WebstudioData) =>
  Array.from(data.pages.pages.values()).filter(
    (page) => page.id !== data.pages.homePageId
  );

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

describe("insert page copy", () => {
  $project.set({ id: "projectId" } as Project);

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
    });
    insertPageCopyMutable({
      source: { data, pageId: "page2Id" },
      target: { data, folderId: ROOT_FOLDER_ID },
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
    });
    insertPageCopyMutable({
      source: { data, pageId: "pageId" },
      target: { data, folderId: ROOT_FOLDER_ID },
    });
    const copiedPages = getCopiedPages(data);
    expect(copiedPages.length).toEqual(3);
    const nestedPage = copiedPages[1];
    const rootPage = copiedPages[2];
    expect(nestedPage.path).toEqual("/copy-1/my-path");
    expect(rootPage.path).toEqual("/my-path");
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
    });
    insertPageCopyMutable({
      source: { data, pageId: "pageId" },
      target: { data, folderId: ROOT_FOLDER_ID },
    });
    insertPageCopyMutable({
      source: { data, pageId: "pageId" },
      target: { data, folderId: "folderId" },
    });
    insertPageCopyMutable({
      source: { data, pageId: "pageId" },
      target: { data, folderId: "folderId" },
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
});
