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
  permissions,
}: {
  pages: Pages | undefined;
  permissions: Partial<RestrictedFeaturesPermissions>;
}) =>
  getRestrictedFeatures({
    pages,
    dataSources: new Map<string, DataSource>(),
    instances: new Map<string, Instance>(),
    permissions: { ...defaultPermissions, ...permissions },
  });

describe("getRestrictedFeatures", () => {
  test("restricts project authentication when auth is not allowed", () => {
    const features = getFeatures({
      pages: createPages({
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
});
