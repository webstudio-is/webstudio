import type { Pages, Page, Folder } from "@webstudio-is/sdk";
import { nanoid } from "nanoid";

export const findPageByIdOrPath = (
  pages: Pages,
  idOrPath: string
): Page | undefined => {
  if (idOrPath === "" || idOrPath === "/" || idOrPath === pages.homePage.id) {
    return pages.homePage;
  }
  return pages.pages.find(
    (page) => page.path === idOrPath || page.id === idOrPath
  );
};

export const createRootFolder = (
  children: Folder["children"] = []
): Folder => ({
  id: "root",
  name: "",
  slug: "",
  children,
});

export const createDefaultPages = ({
  rootInstanceId,
  homePageId = nanoid(),
  homePagePath = "",
}: {
  rootInstanceId: string;
  homePageId?: string;
  homePagePath?: string;
}): Pages => {
  return {
    meta: {},
    homePage: {
      id: homePageId,
      name: "Home",
      path: homePagePath,
      title: "Home",
      meta: {},
      rootInstanceId,
    },
    // This is a root folder that nobody can delete or going to be able to see.
    rootFolder: createRootFolder([homePageId]),
    pages: [],
    folders: [],
  };
};
