import { describe, expect, test } from "vitest";
import {
  ROOT_FOLDER_ID,
  type DataSource,
  type Folder,
  type Instance,
  type Page,
  type Pages,
} from "@webstudio-is/sdk";
import {
  getRestrictedFeatures,
  type RestrictedFeaturesPermissions,
} from "./restricted-features";
import type { ProjectSettings } from "@webstudio-is/project-build";

const createPage = (page: Partial<Page> & Pick<Page, "id">): Page => ({
  name: page.id,
  path: page.id === "home" ? "" : `/${page.id}`,
  title: `"${page.id}"`,
  meta: {},
  rootInstanceId: `${page.id}-root`,
  ...page,
});

const createFolder = (
  folder: Partial<Folder> & Pick<Folder, "id">
): Folder => ({
  name: folder.id,
  slug: folder.id,
  children: [],
  ...folder,
});

const homePage = createPage({ id: "home" });

const createPages = ({
  pages = [homePage],
  meta,
}: {
  pages?: Page[];
  meta?: Pages["meta"];
} = {}): Pages => ({
  homePageId: homePage.id,
  rootFolderId: ROOT_FOLDER_ID,
  pages: new Map(pages.map((page) => [page.id, page])),
  folders: new Map([
    [
      ROOT_FOLDER_ID,
      createFolder({
        id: ROOT_FOLDER_ID,
        name: "Root",
        slug: "",
        children: pages.map((page) => page.id),
      }),
    ],
  ]),
  meta,
});

const defaultPermissions: RestrictedFeaturesPermissions = {
  maxContactEmailsPerProject: 1,
  allowAuth: true,
  allowDynamicData: true,
};

const getFeatures = ({
  pages,
  projectSettings,
  permissions,
  dataSources = new Map<string, DataSource>(),
  instances = new Map<string, Instance>(),
}: {
  pages: Pages | undefined;
  projectSettings?: ProjectSettings;
  permissions: Partial<RestrictedFeaturesPermissions>;
  dataSources?: Map<string, DataSource>;
  instances?: Map<string, Instance>;
}) =>
  getRestrictedFeatures({
    pages,
    projectSettings,
    dataSources,
    instances,
    permissions: { ...defaultPermissions, ...permissions },
  });

const getPageRestrictedFeatures = (isDraft: boolean) => {
  const page = createPage({
    id: isDraft ? "draft" : "published",
    path: isDraft ? "/draft/:slug" : "/published/:slug",
    isDraft,
    meta: {
      auth: { method: "basic", login: "admin", password: "secret" },
      redirect: `"/redirect"`,
    },
  });
  return getFeatures({
    pages: createPages({ pages: [homePage, page] }),
    permissions: { allowAuth: false, allowDynamicData: false },
    instances: new Map([
      [
        page.rootInstanceId,
        {
          type: "instance",
          id: page.rootInstanceId,
          component: "ws:element",
          children: [],
        },
      ],
    ]),
    dataSources: new Map([
      [
        "resource-variable",
        {
          type: "resource",
          id: "resource-variable",
          resourceId: "resource",
          scopeInstanceId: page.rootInstanceId,
          name: "resourceVariable",
        },
      ],
    ]),
  });
};

describe("getRestrictedFeatures", () => {
  test("restricts project authentication when auth is not allowed", () => {
    const features = getFeatures({
      pages: createPages(),
      projectSettings: {
        compiler: {},
        meta: {
          auth: JSON.stringify({
            version: 1,
            routes: {
              "/private": {
                method: "basic",
                login: "admin",
                password: "secret",
              },
            },
          }),
        },
      },
      permissions: { allowAuth: false },
    });

    expect(features.has("Project auth")).toBe(true);
  });

  test("restricts page authentication when auth is not allowed", () => {
    const privatePage = createPage({
      id: "private",
      meta: {
        auth: {
          method: "basic",
          login: "admin",
          password: "secret",
        },
      },
    });
    const features = getFeatures({
      pages: createPages({ pages: [homePage, privatePage] }),
      permissions: { allowAuth: false },
    });

    expect(features.get("Page auth")).toEqual({
      navigate: {
        pageId: privatePage.id,
        instanceSelector: [privatePage.rootInstanceId],
      },
      view: "pageSettings",
    });
  });

  test("allows project and page authentication when auth is allowed", () => {
    const privatePage = createPage({
      id: "private",
      meta: {
        auth: {
          method: "basic",
          login: "admin",
          password: "secret",
        },
      },
    });
    const features = getFeatures({
      pages: createPages({
        pages: [homePage, privatePage],
        meta: {
          auth: JSON.stringify({
            version: 1,
            routes: {
              "/private": {
                method: "basic",
                login: "admin",
                password: "secret",
              },
            },
          }),
        },
      }),
      permissions: { allowAuth: true },
    });

    expect(features.has("Project auth")).toBe(false);
    expect(features.has("Page auth")).toBe(false);
  });

  test("ignores restricted features used only by draft pages", () => {
    expect(getPageRestrictedFeatures(true).size).toBe(0);
  });

  test("restricts dynamic features used by publishable pages", () => {
    expect([...getPageRestrictedFeatures(false).keys()]).toEqual([
      "Page auth",
      "Dynamic path",
      "Redirect",
      "Resource variable",
    ]);
  });
});
