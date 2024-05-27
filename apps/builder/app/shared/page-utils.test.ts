import { describe, expect, test } from "@jest/globals";
import type { Project } from "@webstudio-is/project";
import {
  ROOT_FOLDER_ID,
  encodeDataSourceVariable,
  type DataSource,
  type Instance,
  type WebstudioData,
} from "@webstudio-is/sdk";
import {
  createDefaultPages,
  createRootFolder,
} from "@webstudio-is/project-build";
import { $project } from "./nano-states";
import { insertPageCopyMutable } from "./page-utils";

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map((item) => [item.id, item]));

const getWebstudioDataStub = (
  data?: Partial<WebstudioData>
): WebstudioData => ({
  pages: createDefaultPages({ rootInstanceId: "", systemDataSourceId: "" }),
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
      dataSources: toMap<DataSource>([
        {
          id: "systemId",
          scopeInstanceId: "bodyId",
          name: "system",
          type: "parameter",
        },
      ]),
      pages: {
        meta: {},
        homePage: {
          id: "pageId",
          name: "Name",
          path: "/",
          title: `"Title"`,
          meta: {},
          rootInstanceId: "bodyId",
          systemDataSourceId: "systemId",
        },
        pages: [],
        folders: [createRootFolder(["pageId"])],
      },
    });
    insertPageCopyMutable({
      source: { data, pageId: "pageId" },
      target: { data, folderId: ROOT_FOLDER_ID },
    });
    expect(data.pages.pages.length).toEqual(1);
    const newPage = data.pages.pages[0];
    expect(newPage).toEqual({
      id: expect.not.stringMatching("pageId"),
      name: "Name (1)",
      path: "/copy-1",
      title: `"Title"`,
      meta: {},
      rootInstanceId: expect.not.stringMatching("bodyId"),
      systemDataSourceId: expect.not.stringMatching("systemId"),
    });
    expect(data.dataSources.size).toEqual(2);
    expect(Array.from(data.dataSources.values())[1]).toEqual({
      id: newPage.systemDataSourceId,
      scopeInstanceId: newPage.rootInstanceId,
      name: "system",
      type: "parameter",
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
      dataSources: toMap<DataSource>([
        {
          id: "systemId",
          scopeInstanceId: "bodyId",
          name: "system",
          type: "parameter",
        },
      ]),
      pages: {
        meta: {},
        homePage: {
          id: "homePageId",
          name: "Home",
          path: "/",
          title: `"Home"`,
          meta: {},
          rootInstanceId: "bodyId",
          systemDataSourceId: "systemId",
        },
        pages: [
          {
            id: "pageId",
            name: "Name",
            path: "/my-path",
            title: `"Title"`,
            meta: {},
            rootInstanceId: "bodyId",
            systemDataSourceId: "systemId",
          },
        ],
        folders: [createRootFolder(["homePageId", "pageId"])],
      },
    });
    insertPageCopyMutable({
      source: { data, pageId: "pageId" },
      target: { data, folderId: ROOT_FOLDER_ID },
    });
    expect(data.pages.pages.length).toEqual(2);
    const newPage = data.pages.pages[1];
    expect(newPage.path).toEqual("/copy-1/my-path");
  });

  test("deduplicate wildcards in page copy", () => {
    const data = getWebstudioDataStub({
      instances: toMap<Instance>([
        { type: "instance", id: "bodyId", component: "Body", children: [] },
      ]),
      dataSources: toMap<DataSource>([
        {
          id: "systemId",
          scopeInstanceId: "bodyId",
          name: "system",
          type: "parameter",
        },
      ]),
      pages: {
        meta: {},
        homePage: {
          id: "homePageId",
          name: "Home",
          path: "/",
          title: `"Home"`,
          meta: {},
          rootInstanceId: "bodyId",
          systemDataSourceId: "systemId",
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
            systemDataSourceId: "systemId",
          },
          {
            id: "page2Id",
            name: "My Name 2",
            // Named wildcard
            path: "/my-path/name*",
            title: `"My Title"`,
            meta: {},
            rootInstanceId: "bodyId",
            systemDataSourceId: "systemId",
          },
        ],
        folders: [createRootFolder(["homePageId", "page1Id", "page2Id"])],
      },
    });
    insertPageCopyMutable({
      source: { data, pageId: "page1Id" },
      target: { data, folderId: ROOT_FOLDER_ID },
    });
    insertPageCopyMutable({
      source: { data, pageId: "page2Id" },
      target: { data, folderId: ROOT_FOLDER_ID },
    });
    expect(data.pages.pages.length).toEqual(4);
    const newPage1 = data.pages.pages[2];
    const newPage2 = data.pages.pages[3];
    expect(newPage1.path).toEqual("/copy-1/my-path/*");
    expect(newPage2.path).toEqual("/copy-1/my-path/name*");
  });

  test("check full page path when duplicate inside a folder", () => {
    const data = getWebstudioDataStub({
      instances: toMap<Instance>([
        { type: "instance", id: "bodyId", component: "Body", children: [] },
      ]),
      dataSources: toMap<DataSource>([
        {
          id: "systemId",
          scopeInstanceId: "bodyId",
          name: "system",
          type: "parameter",
        },
      ]),
      pages: {
        meta: {},
        homePage: {
          id: "homePageId",
          name: "Home",
          path: "/",
          title: `"Home"`,
          meta: {},
          rootInstanceId: "bodyId",
          systemDataSourceId: "systemId",
        },
        pages: [
          {
            id: "pageId",
            name: "My Name",
            path: "/my-path",
            title: `"My Title"`,
            meta: {},
            rootInstanceId: "bodyId",
            systemDataSourceId: "systemId",
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
      },
    });
    insertPageCopyMutable({
      source: { data, pageId: "pageId" },
      target: { data, folderId: "folderId" },
    });
    insertPageCopyMutable({
      source: { data, pageId: "pageId" },
      target: { data, folderId: ROOT_FOLDER_ID },
    });
    expect(data.pages.pages.length).toEqual(3);
    const nestedPage = data.pages.pages[1];
    const rootPage = data.pages.pages[2];
    expect(nestedPage.path).toEqual("/copy-1/my-path");
    expect(rootPage.path).toEqual("/my-path");
  });

  test("replace variables in page copy meta", () => {
    const data = getWebstudioDataStub({
      instances: toMap<Instance>([
        { type: "instance", id: "bodyId", component: "Body", children: [] },
      ]),
      dataSources: toMap<DataSource>([
        {
          id: "systemId",
          scopeInstanceId: "bodyId",
          name: "system",
          type: "parameter",
        },
      ]),
      pages: {
        meta: {},
        homePage: {
          id: "pageId",
          name: "Name",
          path: "/",
          title: `"Title: " + $ws$dataSource$systemId.params.value`,
          meta: {
            description: `"Description: " + $ws$dataSource$systemId.params.value`,
            excludePageFromSearch: `"Exclude: " + $ws$dataSource$systemId.params.value`,
            socialImageUrl: `"Image: " + $ws$dataSource$systemId.params.value`,
            language: `"Language: " + $ws$dataSource$systemId.params.value`,
            status: `"Status: " + $ws$dataSource$systemId.params.value`,
            redirect: `"Redirect: " + $ws$dataSource$systemId.params.value`,
            custom: [
              {
                property: "Property",
                content: `"Value: " + $ws$dataSource$systemId.params.value`,
              },
            ],
          },
          rootInstanceId: "bodyId",
          systemDataSourceId: "systemId",
        },
        pages: [],
        folders: [createRootFolder(["pageId"])],
      },
    });
    insertPageCopyMutable({
      source: { data, pageId: "pageId" },
      target: { data, folderId: ROOT_FOLDER_ID },
    });
    expect(data.pages.pages.length).toEqual(1);
    const newPage = data.pages.pages[0];
    const newSystem = Array.from(data.dataSources.values())[1];
    expect(newSystem.id).not.toEqual("systemId");
    const newSystemName = encodeDataSourceVariable(newSystem.id);
    expect(newPage).toEqual({
      id: expect.not.stringMatching("pageId"),
      name: "Name (1)",
      path: "/copy-1",
      title: `"Title: " + ${newSystemName}.params.value`,
      meta: {
        description: `"Description: " + ${newSystemName}.params.value`,
        excludePageFromSearch: `"Exclude: " + ${newSystemName}.params.value`,
        socialImageUrl: `"Image: " + ${newSystemName}.params.value`,
        language: `"Language: " + ${newSystemName}.params.value`,
        status: `"Status: " + ${newSystemName}.params.value`,
        redirect: `"Redirect: " + ${newSystemName}.params.value`,
        custom: [
          {
            property: "Property",
            content: `"Value: " + ${newSystemName}.params.value`,
          },
        ],
      },
      rootInstanceId: expect.not.stringMatching("bodyId"),
      systemDataSourceId: expect.not.stringMatching("systemId"),
    });
  });

  test("append number to name only when conflict is found", () => {
    const data = getWebstudioDataStub({
      instances: toMap<Instance>([
        { type: "instance", id: "bodyId", component: "Body", children: [] },
      ]),
      dataSources: toMap<DataSource>([
        {
          id: "systemId",
          scopeInstanceId: "bodyId",
          name: "system",
          type: "parameter",
        },
      ]),
      pages: {
        meta: {},
        homePage: {
          id: "pageId",
          name: "Name",
          path: "/",
          title: `"Title"`,
          meta: {},
          rootInstanceId: "bodyId",
          systemDataSourceId: "systemId",
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
      },
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
    expect(data.pages.pages.length).toEqual(4);
    // inside folder with conflict
    expect(data.pages.pages[0].name).toEqual(`Name (1)`);
    expect(data.pages.pages[1].name).toEqual(`Name (2)`);
    // inside folder without conflict
    expect(data.pages.pages[2].name).toEqual(`Name`);
    expect(data.pages.pages[3].name).toEqual(`Name (1)`);
  });
});
